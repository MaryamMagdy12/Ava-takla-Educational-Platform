<?php

namespace App\Services;

use App\Exceptions\ApiHttpException;
use App\Models\AttemptAnswer;
use App\Models\AttemptQuestion;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\ExamQuestion;
use App\Models\Question;
use App\Models\SpecialLearner;
use App\Models\Student;
use App\Services\AuditLogService;
use App\Services\Concerns\ValidatesAttemptAnswers;
use App\Support\ApiErrorCode;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ExamEngineService
{
    use ValidatesAttemptAnswers;

    public function __construct(private readonly AuditLogService $auditLogService) {}

    public function startAttempt(Exam $exam, Student|SpecialLearner $participant): ExamAttempt
    {
        $now = now();
        if ($now->lt(Carbon::parse($exam->available_from))) {
            ApiHttpException::throw(422, 'This exam is not available yet.', ApiErrorCode::EXAM_NOT_AVAILABLE);
        }
        if ($now->gt(Carbon::parse($exam->available_to))) {
            ApiHttpException::throw(422, 'This exam is no longer available.', ApiErrorCode::EXAM_NOT_AVAILABLE);
        }

        return DB::transaction(function () use ($exam, $participant, $now) {
            if ($participant instanceof Student) {
                Student::query()->whereKey($participant->id)->lockForUpdate()->first();
            } else {
                SpecialLearner::query()->whereKey($participant->id)->lockForUpdate()->first();
            }

            $existingAttempt = ExamAttempt::query()
                ->where('exam_id', $exam->id)
                ->when(
                    $participant instanceof Student,
                    fn ($q) => $q->where('student_id', $participant->id),
                    fn ($q) => $q->where('special_learner_id', $participant->id),
                )
                ->first();

            if ($existingAttempt) {
                if ($existingAttempt->status !== 'in_progress') {
                    ApiHttpException::throw(422, 'You already have an attempt for this exam.', ApiErrorCode::EXAM_ALREADY_ATTEMPTED);
                }
                $hasQuestions = AttemptQuestion::query()
                    ->where('exam_attempt_id', $existingAttempt->id)
                    ->exists();
                if ($hasQuestions) {
                    return $existingAttempt->fresh();
                }
                AttemptQuestion::query()->where('exam_attempt_id', $existingAttempt->id)->delete();
                $existingAttempt->delete();
            }

            $exam = Exam::query()->whereKey($exam->id)->lockForUpdate()->firstOrFail();
            if (ExamQuestion::query()->where('exam_id', $exam->id)->count() === 0) {
                $this->buildExamQuestionPool($exam);
            }

            $poolIds = ExamQuestion::query()
                ->where('exam_id', $exam->id)
                ->orderBy('position')
                ->pluck('question_id')
                ->values();
            if ($poolIds->isEmpty()) {
                ApiHttpException::throw(422, 'This exam has no question pool. Publish the exam again or add questions to the bank.', ApiErrorCode::EXAM_NOT_AVAILABLE);
            }

            $shuffledQuestionIds = $poolIds->shuffle()->values();

            $questionsById = Question::query()
                ->whereIn('id', $shuffledQuestionIds)
                ->with('options')
                ->get()
                ->keyBy('id');

            $allowedEnd = Carbon::parse($now)->addMinutes($exam->duration_minutes);
            $closeAt = Carbon::parse($exam->available_to);
            if ($allowedEnd->gt($closeAt)) {
                $allowedEnd = $closeAt;
            }

            $attemptAttrs = [
                'exam_id' => $exam->id,
                'student_id' => $participant instanceof Student ? $participant->id : null,
                'special_learner_id' => $participant instanceof SpecialLearner ? $participant->id : null,
                'started_at' => $now,
                'allowed_end_time' => $allowedEnd,
                'status' => 'in_progress',
            ];

            try {
                $attempt = ExamAttempt::query()->create($attemptAttrs);
            } catch (QueryException $e) {
                if ($this->isDuplicateAttemptConstraint($e)) {
                    ApiHttpException::throw(422, 'You already have an attempt for this exam.', ApiErrorCode::EXAM_ALREADY_ATTEMPTED);
                }

                $race = ExamAttempt::query()
                    ->where('exam_id', $exam->id)
                    ->when(
                        $participant instanceof Student,
                        fn ($q) => $q->where('student_id', $participant->id),
                        fn ($q) => $q->where('special_learner_id', $participant->id),
                    )
                    ->first();
                if ($race && $race->status === 'in_progress') {
                    return $race->fresh();
                }
                if ($race) {
                    ApiHttpException::throw(422, 'You already have an attempt for this exam.', ApiErrorCode::EXAM_ALREADY_ATTEMPTED);
                }
                throw $e;
            }

            $rows = [];
            foreach ($shuffledQuestionIds->values() as $idx => $questionId) {
                $question = $questionsById->get($questionId);
                if (! $question) {
                    continue;
                }
                $optionIds = $question->options->pluck('id')->map(fn ($id) => (int) $id)->all();
                shuffle($optionIds);
                $correctOption = $question->options->firstWhere('is_correct', true);

                $rows[] = [
                    'exam_attempt_id' => $attempt->id,
                    'question_id' => (int) $questionId,
                    'order_no' => $idx + 1,
                    'option_display_order' => json_encode(array_values($optionIds)),
                    'correct_option_id' => $correctOption ? (int) $correctOption->id : null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if ($rows === []) {
                ApiHttpException::throw(422, 'No valid questions found for this attempt.', ApiErrorCode::EXAM_NOT_AVAILABLE);
            }

            AttemptQuestion::query()->insert($rows);

            $fresh = $attempt->fresh();
            $this->auditLogService->log('exam.started', $participant, $fresh, [
                'exam_id' => $exam->id,
            ]);

            return $fresh;
        });
    }

    /**
     * One random draw of questions for the exam; same pool for every student.
     * Call on publish (and when pool is missing on first start).
     */
    public function buildExamQuestionPool(Exam $exam): void
    {
        $ids = $this->drawQuestionIdsForExamPool($exam);
        if ($ids->count() < (int) $exam->question_count) {
            abort(422, 'Not enough active questions in the bank for this exam. Need '.$exam->question_count.', found '.$ids->count().'.');
        }

        $ids = $ids->take((int) $exam->question_count)->values();
        $now = now();

        ExamQuestion::query()->where('exam_id', $exam->id)->delete();

        $rows = [];
        foreach ($ids as $i => $questionId) {
            $rows[] = [
                'admin_interface' => $exam->admin_interface ?? 'student',
                'exam_id' => $exam->id,
                'question_id' => (int) $questionId,
                'position' => $i + 1,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        ExamQuestion::query()->insert($rows);
    }

    /**
     * @return Collection<int, int>
     */
    private function drawQuestionIdsForExamPool(Exam $exam): Collection
    {
        $base = Question::query()
            ->where('course_id', $exam->course_id)
            ->where('status', 'active')
            ->when(
                $exam->track_id !== null,
                fn ($q) => $q->where('track_id', $exam->track_id),
                fn ($q) => $q->whereNull('track_id'),
            );

        if ($exam->easy_count || $exam->medium_count || $exam->hard_count) {
            $pickedIds = collect()
                ->merge($this->sampleQuestionIds((clone $base)->where('difficulty', 'easy'), (int) $exam->easy_count))
                ->merge($this->sampleQuestionIds((clone $base)->where('difficulty', 'medium'), (int) $exam->medium_count))
                ->merge($this->sampleQuestionIds((clone $base)->where('difficulty', 'hard'), (int) $exam->hard_count))
                ->shuffle()
                ->take((int) $exam->question_count)
                ->values();

            return $pickedIds;
        }

        return $this->sampleQuestionIds($base, (int) $exam->question_count);
    }

    public function submitAttempt(ExamAttempt $attempt, array $answers): ExamAttempt
    {
        return DB::transaction(function () use ($attempt, $answers) {
            if ($attempt->status !== 'in_progress') {
                ApiHttpException::throw(422, 'This attempt is already finished.', ApiErrorCode::EXAM_ATTEMPT_FINISHED);
            }

            $attempt->refresh();
            $allowedEnd = Carbon::parse($attempt->allowed_end_time);
            if (now()->gt($allowedEnd)) {
                $attempt->status = 'expired';
            }

            $questionRows = AttemptQuestion::query()
                ->where('exam_attempt_id', $attempt->id)
                ->with('question.options')
                ->get()
                ->keyBy('question_id');

            $pastDeadline = now()->gt($allowedEnd);
            if (! $pastDeadline) {
                $this->validateAndNormalizeSubmittedAnswers($questionRows, $answers);
            }

            $score = 0;
            $answerRows = [];
            foreach ($answers as $answer) {
                $questionId = (int) ($answer['question_id'] ?? 0);
                $optionId = $answer['selected_option_id'] ?? null;
                $attemptQuestion = $questionRows[$questionId] ?? null;
                if (! $attemptQuestion) {
                    continue;
                }

                $question = $attemptQuestion->question;
                $correctOptionId = $this->resolveCorrectOptionId($attemptQuestion, $question);
                $isCorrect = $correctOptionId !== null && $correctOptionId === (int) $optionId;
                if ($isCorrect) {
                    $score++;
                }

                $answerRows[] = [
                    'exam_attempt_id' => $attempt->id,
                    'question_id' => $questionId,
                    'selected_option_id' => $optionId,
                    'is_correct' => $isCorrect,
                    'feedback' => $isCorrect ? $question->feedback_correct : $question->feedback_wrong,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            if ($answerRows !== []) {
                AttemptAnswer::query()->upsert(
                    $answerRows,
                    ['exam_attempt_id', 'question_id'],
                    ['selected_option_id', 'is_correct', 'feedback', 'updated_at']
                );
            }

            $total = $questionRows->count();
            $percentage = $total > 0 ? round(($score / $total) * 100, 2) : 0;
            $attempt->score = $score;
            $attempt->total_questions = $total;
            $attempt->percentage = $percentage;
            $attempt->is_passed = $attempt->exam->pass_mark ? $percentage >= $attempt->exam->pass_mark : null;
            $attempt->status = $attempt->status === 'expired' ? 'expired' : 'submitted';
            $attempt->submitted_at = now();
            $attempt->save();

            $fresh = $attempt->fresh();
            $fresh->loadMissing(['student', 'specialLearner']);
            $actor = $fresh->student ?? $fresh->specialLearner;
            $this->auditLogService->log('exam.submitted', $actor, $fresh, [
                'exam_id' => $attempt->exam_id,
                'status' => $fresh->status,
            ]);

            return $fresh;
        });
    }

    private function sampleQuestionIds($query, int $count): Collection
    {
        if ($count <= 0) {
            return collect();
        }

        $ids = $query->pluck('id');
        if ($ids->isEmpty()) {
            return collect();
        }

        return $ids->shuffle()->take($count)->values();
    }
}
