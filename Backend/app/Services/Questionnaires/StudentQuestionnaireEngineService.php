<?php

namespace App\Services\Questionnaires;

use App\Models\GaFamily;
use App\Models\SpecialLearner;
use App\Models\Student;
use App\Models\StudentQuestionnaire;
use App\Models\StudentQuestionnaireQuestion;
use App\Models\StudentQuestionnaireResponse;
use App\Models\StudentQuestionnaireResponseAnswer;
use App\Services\Concerns\ResolvesContentTimeWindow;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class StudentQuestionnaireEngineService
{
    use ResolvesContentTimeWindow;

    public function startOrResume(StudentQuestionnaire $questionnaire, Student $student): StudentQuestionnaireResponse
    {
        return $this->startOrResumeForActor($questionnaire, $student, 'student');
    }

    public function startOrResumeForActor(
        StudentQuestionnaire $questionnaire,
        Student|SpecialLearner|GaFamily $actor,
        string $scope
    ): StudentQuestionnaireResponse {
        $this->assertQuestionnaireVisibleForActor($questionnaire, $actor, $scope);

        $now = now();
        $from = Carbon::parse($questionnaire->available_from);
        $to = Carbon::parse($questionnaire->available_to);
        $this->assertWithinAvailability($now, $from, $to);

        if ($questionnaire->status !== 'published') {
            abort(422, 'Questionnaire is not available.');
        }

        return DB::transaction(function () use ($questionnaire, $actor, $scope, $now, $to) {
            $this->lockActorRow($actor, $scope);

            $existing = StudentQuestionnaireResponse::query()
                ->where('student_questionnaire_id', $questionnaire->id)
                ->when(
                    $this->hasRespondentColumns(),
                    fn ($q) => $q->where('respondent_type', $scope)->where('respondent_id', $actor->id),
                    fn ($q) => $q->where('student_id', $actor->id)
                )
                ->lockForUpdate()
                ->first();

            if ($existing) {
                if ($existing->status === 'submitted') {
                    abort(422, 'Questionnaire already submitted.');
                }
                $deadline = Carbon::parse($existing->deadline_at);
                if ($existing->status === 'in_progress' && $now->gt($deadline)) {
                    $existing->status = 'expired';
                    $existing->save();
                    abort(422, 'Response time has expired.');
                }

                return $existing->fresh();
            }

            $deadline = $this->computeResponseDeadline($now, $to, $questionnaire->response_duration_minutes);

            $payload = [
                'student_questionnaire_id' => $questionnaire->id,
                'started_at' => $now,
                'deadline_at' => $deadline,
                'status' => 'in_progress',
            ];

            if ($this->hasRespondentColumns()) {
                $payload['respondent_type'] = $scope;
                $payload['respondent_id'] = $actor->id;
                $payload['student_id'] = $scope === 'student' ? $actor->id : null;
            } else {
                $payload['student_id'] = $actor->id;
            }

            return StudentQuestionnaireResponse::query()->create($payload);
        });
    }

    /**
     * @param  array<int, array{question_id: int, selected_option_id?: int|null, text_answer?: string|null}>  $answers
     */
    public function saveAnswers(StudentQuestionnaireResponse $response, array $answers): void
    {
        $this->assertResponseMutable($response);

        DB::transaction(function () use ($response, $answers) {
            foreach ($answers as $row) {
                $qid = (int) ($row['question_id'] ?? 0);
                if ($qid < 1) {
                    continue;
                }
                $question = StudentQuestionnaireQuestion::query()
                    ->where('student_questionnaire_id', $response->student_questionnaire_id)
                    ->whereKey($qid)
                    ->first();
                if (! $question) {
                    continue;
                }

                $optionId = isset($row['selected_option_id']) ? (int) $row['selected_option_id'] : null;
                $text = isset($row['text_answer']) ? trim((string) $row['text_answer']) : null;
                if ($optionId === 0) {
                    $optionId = null;
                }

                StudentQuestionnaireResponseAnswer::query()->updateOrCreate(
                    [
                        'student_questionnaire_response_id' => $response->id,
                        'student_questionnaire_question_id' => $question->id,
                    ],
                    [
                        'student_questionnaire_option_id' => $optionId,
                        'text_answer' => $text !== '' ? $text : null,
                    ],
                );
            }
        });
    }

    public function submit(StudentQuestionnaireResponse $response): StudentQuestionnaireResponse
    {
        $this->assertResponseMutable($response);

        return DB::transaction(function () use ($response) {
            $response->refresh();
            $questionnaire = $response->questionnaire()->with(['questions' => fn ($q) => $q->orderBy('order_no')])->firstOrFail();
            $answers = $response->answers()->get()->keyBy('student_questionnaire_question_id');

            foreach ($questionnaire->questions as $question) {
                $ans = $answers->get($question->id);
                if ($question->type === 'text') {
                    if (! $ans || trim((string) $ans->text_answer) === '') {
                        abort(422, 'Please answer all questions before submitting.');
                    }
                } else {
                    if (! $ans || ! $ans->student_questionnaire_option_id) {
                        abort(422, 'Please answer all questions before submitting.');
                    }
                }
            }

            $response->status = 'submitted';
            $response->submitted_at = now();
            $response->save();

            return $response->fresh();
        });
    }

    private function assertQuestionnaireVisibleForActor(
        StudentQuestionnaire $questionnaire,
        Student|SpecialLearner|GaFamily $actor,
        string $scope
    ): void
    {
        if ($questionnaire->admin_interface !== $scope) {
            abort(403, 'This questionnaire is not available.');
        }
        if ($scope === 'student' && ($questionnaire->level_id === null || (int) $questionnaire->level_id !== (int) $actor->level_id)) {
            abort(403, 'This questionnaire is not available for your level.');
        }
    }

    private function lockActorRow(Student|SpecialLearner|GaFamily $actor, string $scope): void
    {
        if ($scope === 'student') {
            Student::query()->whereKey($actor->id)->lockForUpdate()->first();

            return;
        }
        if ($scope === 'special') {
            SpecialLearner::query()->whereKey($actor->id)->lockForUpdate()->first();

            return;
        }
        GaFamily::query()->whereKey($actor->id)->lockForUpdate()->first();
    }

    private function hasRespondentColumns(): bool
    {
        return Schema::hasColumn('student_questionnaire_responses', 'respondent_type')
            && Schema::hasColumn('student_questionnaire_responses', 'respondent_id');
    }

    private function assertResponseMutable(StudentQuestionnaireResponse $response): void
    {
        if ($response->status !== 'in_progress') {
            abort(422, 'This response cannot be modified.');
        }
        $now = now();
        $deadline = Carbon::parse($response->deadline_at);
        if ($now->gt($deadline)) {
            $response->status = 'expired';
            $response->save();
            abort(422, 'Response time has expired.');
        }
    }
}
