<?php

namespace App\Services\Competitions;

use App\Exceptions\ApiHttpException;
use App\Models\GaCompetition;
use App\Models\GaCompetitionAttempt;
use App\Models\GaCompetitionAttemptAnswer;
use App\Models\GaCompetitionAttemptQuestion;
use App\Models\GaCompetitionQuestion;
use App\Models\GaCompetitionQuestionRule;
use App\Models\GaFamily;
use App\Services\Concerns\ValidatesAttemptAnswers;
use App\Support\ApiErrorCode;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class GaCompetitionEngineService
{
    use ValidatesAttemptAnswers;
    public function startAttempt(GaCompetition $competition, GaFamily $family): GaCompetitionAttempt
    {
        $now = now();
        $start = Carbon::parse($competition->starts_at);
        $end = Carbon::parse($competition->ends_at);
        if ($now->lt($start)) {
            ApiHttpException::throw(422, 'This competition is not available yet.', ApiErrorCode::COMPETITION_NOT_AVAILABLE);
        }
        if ($now->gt($end)) {
            ApiHttpException::throw(422, 'This competition is no longer available.', ApiErrorCode::COMPETITION_NOT_AVAILABLE);
        }
        if ($competition->status !== 'published') {
            ApiHttpException::throw(422, 'This competition is not available.', ApiErrorCode::COMPETITION_NOT_AVAILABLE);
        }

        return DB::transaction(function () use ($competition, $family, $now, $end) {
            GaFamily::query()->whereKey($family->id)->lockForUpdate()->first();

            $existing = GaCompetitionAttempt::query()
                ->where('ga_competition_id', $competition->id)
                ->where('ga_family_id', $family->id)
                ->first();

            if ($existing) {
                if ($existing->status !== 'in_progress') {
                    ApiHttpException::throw(422, 'You already have an attempt for this competition.', ApiErrorCode::COMPETITION_ALREADY_ATTEMPTED);
                }
                if ($existing->attemptQuestions()->exists()) {
                    return $existing->fresh();
                }
                GaCompetitionAttemptQuestion::query()->where('ga_competition_attempt_id', $existing->id)->delete();
                $existing->delete();
            }

            $questions = $this->selectCompetitionQuestions($competition);
            if ($questions->isEmpty()) {
                abort(422, 'This competition has no questions.');
            }

            $shuffledIds = $questions->pluck('id')->shuffle()->values();
            $questionsById = $questions->keyBy('id');

            $deadline = $end;
            if ($competition->max_attempt_duration_hours) {
                $byDur = $now->clone()->addHours((int) $competition->max_attempt_duration_hours);
                if ($byDur->lt($deadline)) {
                    $deadline = $byDur;
                }
            }

            try {
                $attempt = GaCompetitionAttempt::query()->create([
                    'ga_competition_id' => $competition->id,
                    'ga_family_id' => $family->id,
                    'started_at' => $now,
                    'deadline_at' => $deadline,
                    'status' => 'in_progress',
                ]);
            } catch (QueryException $e) {
                if ($this->isDuplicateAttemptConstraint($e)) {
                    ApiHttpException::throw(422, 'You already have an attempt for this competition.', ApiErrorCode::COMPETITION_ALREADY_ATTEMPTED);
                }

                $race = GaCompetitionAttempt::query()
                    ->where('ga_competition_id', $competition->id)
                    ->where('ga_family_id', $family->id)
                    ->first();
                if ($race && $race->status === 'in_progress' && $race->attemptQuestions()->exists()) {
                    return $race->fresh();
                }
                throw $e;
            }

            $rows = [];
            foreach ($shuffledIds as $idx => $qid) {
                $q = $questionsById->get($qid);
                if (! $q) {
                    continue;
                }
                $optionIds = $q->options->pluck('id')->map(fn ($id) => (int) $id)->all();
                shuffle($optionIds);
                $rows[] = [
                    'ga_competition_attempt_id' => $attempt->id,
                    'ga_competition_question_id' => (int) $qid,
                    'ga_competition_topic_id' => $q->ga_competition_topic_id,
                    'testament_type' => $q->testament_type,
                    'chapter_number' => $q->chapter_number,
                    'order_no' => $idx + 1,
                    'option_display_order' => json_encode(array_values($optionIds)),
                    'correct_option_id' => ($correct = $q->options->firstWhere('is_correct', true)) ? (int) $correct->id : null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            GaCompetitionAttemptQuestion::query()->insert($rows);

            return $attempt->fresh();
        });
    }

    /**
     * @param  array<int, array{question_id: int, selected_option_id?: int|null}>  $answers
     */
    public function submitAttempt(GaCompetitionAttempt $attempt, array $answers): GaCompetitionAttempt
    {
        return DB::transaction(function () use ($attempt, $answers) {
            if ($attempt->status !== 'in_progress') {
                ApiHttpException::throw(422, 'This attempt is already finished.', ApiErrorCode::EXAM_ATTEMPT_FINISHED);
            }

            $attempt->refresh();
            $allowedEnd = Carbon::parse($attempt->deadline_at);
            if (now()->gt($allowedEnd)) {
                $attempt->status = 'expired';
                $attempt->save();
            }

            $questionRows = GaCompetitionAttemptQuestion::query()
                ->where('ga_competition_attempt_id', $attempt->id)
                ->with('question.options')
                ->get()
                ->keyBy('ga_competition_question_id');

            $pastDeadline = now()->gt($allowedEnd);
            if (! $pastDeadline) {
                $this->validateAndNormalizeSubmittedAnswers(
                    $questionRows,
                    $answers,
                    invalidErrorCode: ApiErrorCode::COMPETITION_INVALID_ANSWER,
                );
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
                $isCorrect = $correctOptionId !== null && (int) $optionId === $correctOptionId;
                if ($isCorrect) {
                    $score++;
                }

                $answerRows[] = [
                    'ga_competition_attempt_id' => $attempt->id,
                    'ga_competition_question_id' => $questionId,
                    'ga_competition_option_id' => $optionId,
                    'is_correct' => $isCorrect,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            if ($answerRows !== []) {
                GaCompetitionAttemptAnswer::query()->upsert(
                    $answerRows,
                    ['ga_competition_attempt_id', 'ga_competition_question_id'],
                    ['ga_competition_option_id', 'is_correct', 'updated_at']
                );
            }

            $total = $questionRows->count();
            $percentage = $total > 0 ? round(($score / $total) * 100, 2) : 0;
            $attempt->score = $score;
            $attempt->total_questions = $total;
            $attempt->percentage = $percentage;
            $attempt->status = $attempt->status === 'expired' ? 'expired' : 'submitted';
            $attempt->submitted_at = now();
            $attempt->save();

            return $attempt->fresh();
        });
    }

    public function verifyAttempt(GaCompetitionAttempt $attempt): GaCompetitionAttempt
    {
        return DB::transaction(function () use ($attempt) {
            if ($attempt->status !== 'submitted') {
                abort(422, 'Only submitted attempts can be verified.');
            }
            $attempt->verified_at = now();
            $attempt->save();

            return $attempt->fresh();
        });
    }

    private function selectCompetitionQuestions(GaCompetition $competition)
    {
        $rules = GaCompetitionQuestionRule::query()
            ->where('ga_competition_id', $competition->id)
            ->get();

        if ($rules->isEmpty()) {
            return GaCompetitionQuestion::query()
                ->where('ga_competition_id', $competition->id)
                ->where(function ($query) {
                    $query->whereNull('status')->orWhere('status', 'active');
                })
                ->with('options')
                ->orderBy('order_no')
                ->get();
        }

        $selected = collect();
        foreach ($rules as $rule) {
            $query = GaCompetitionQuestion::query()
                ->where('ga_competition_id', $competition->id)
                ->where('ga_competition_topic_id', $rule->ga_competition_topic_id)
                ->where('testament_type', $rule->testament_type)
                ->where(function ($query) {
                    $query->whereNull('status')->orWhere('status', 'active');
                })
                ->with('options');

            if ($rule->chapter_number !== null) {
                $query->where('chapter_number', $rule->chapter_number);
            }
            if ($rule->difficulty !== null) {
                $query->where('difficulty', $rule->difficulty);
            }
            $picked = $query->inRandomOrder()->limit((int) $rule->question_count)->get();
            if ($picked->count() < (int) $rule->question_count) {
                abort(422, 'Not enough questions in one of competition rules.');
            }
            $selected = $selected->merge($picked);
        }

        return $selected->shuffle()->values();
    }
}
