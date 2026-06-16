<?php

namespace App\Http\Controllers\Api\Special;

use App\Http\Controllers\Controller;
use App\Models\StudentQuestionnaire;
use App\Models\StudentQuestionnaireResponse;
use App\Services\AuditLogService;
use App\Services\Questionnaires\StudentQuestionnaireEngineService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class SpecialQuestionnaireController extends Controller
{
    public function __construct(
        private readonly StudentQuestionnaireEngineService $engine,
        private readonly AuditLogService $auditLogService,
    ) {}

    public function index(Request $request)
    {
        $this->ensureRespondentColumnsReady();
        $learner = $request->user();
        $now = now();
        $paginator = StudentQuestionnaire::query()
            ->where('admin_interface', 'special')
            ->where('status', 'published')
            ->where('available_from', '<=', $now)
            ->where('available_to', '>=', $now)
            ->orderByDesc('id')
            ->paginate(20);

        $ids = $paginator->getCollection()->pluck('id');
        $responses = StudentQuestionnaireResponse::query()
            ->where('respondent_type', 'special')
            ->where('respondent_id', $learner->id)
            ->whereIn('student_questionnaire_id', $ids)
            ->get()
            ->keyBy('student_questionnaire_id');

        $paginator->getCollection()->transform(function (StudentQuestionnaire $q) use ($responses) {
            return [
                'id' => $q->id,
                'title' => $q->title,
                'description' => $q->description,
                'available_from' => $q->available_from,
                'available_to' => $q->available_to,
                'response' => $responses[$q->id] ?? null,
            ];
        });

        return response()->json(['success' => true, 'data' => $paginator]);
    }

    public function start(Request $request, StudentQuestionnaire $studentQuestionnaire)
    {
        $this->ensureRespondentColumnsReady();
        $response = $this->engine->startOrResumeForActor($studentQuestionnaire, $request->user(), 'special');

        return $this->resumePayload($response);
    }

    public function resume(Request $request, StudentQuestionnaireResponse $studentQuestionnaireResponse)
    {
        $this->ensureRespondentColumnsReady();
        abort_if(
            $studentQuestionnaireResponse->respondent_type !== 'special'
            || (int) $studentQuestionnaireResponse->respondent_id !== (int) $request->user()->id,
            403
        );
        $studentQuestionnaireResponse->load('questionnaire');

        return $this->resumePayload($studentQuestionnaireResponse);
    }

    public function saveAnswers(Request $request, StudentQuestionnaireResponse $studentQuestionnaireResponse)
    {
        $this->ensureRespondentColumnsReady();
        abort_if(
            $studentQuestionnaireResponse->respondent_type !== 'special'
            || (int) $studentQuestionnaireResponse->respondent_id !== (int) $request->user()->id,
            403
        );
        $data = $request->validate([
            'answers' => ['required', 'array'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.selected_option_id' => ['nullable', 'integer'],
            'answers.*.text_answer' => ['nullable', 'string', 'max:5000'],
        ]);
        $this->engine->saveAnswers($studentQuestionnaireResponse, $data['answers']);

        return response()->json(['success' => true, 'message' => 'Saved.']);
    }

    public function submit(Request $request, StudentQuestionnaireResponse $studentQuestionnaireResponse)
    {
        $this->ensureRespondentColumnsReady();
        abort_if(
            $studentQuestionnaireResponse->respondent_type !== 'special'
            || (int) $studentQuestionnaireResponse->respondent_id !== (int) $request->user()->id,
            403
        );
        $saved = $this->engine->submit($studentQuestionnaireResponse);
        $this->auditLogService->log('questionnaire.submitted', $request->user(), $saved, [
            'student_questionnaire_id' => $saved->student_questionnaire_id,
        ], $request);

        return response()->json(['success' => true, 'data' => $saved]);
    }

    private function resumePayload(StudentQuestionnaireResponse $response): \Illuminate\Http\JsonResponse
    {
        $response->load(['questionnaire' => fn ($q) => $q->with(['questions' => fn ($qq) => $qq->orderBy('order_no')->with('options')])]);
        $questionnaire = $response->questionnaire;
        $end = Carbon::parse($response->deadline_at);
        $remaining = max(0, $end->getTimestamp() - now()->getTimestamp());

        $existingAnswers = $response->answers()->get()->keyBy('student_questionnaire_question_id');

        $questions = $questionnaire->questions->map(function ($q) use ($existingAnswers) {
            $opts = $q->options->map(fn ($o) => [
                'id' => $o->id,
                'option_text' => $o->option_text,
            ])->values();
            $ans = $existingAnswers->get($q->id);

            return [
                'question' => [
                    'id' => $q->id,
                    'body' => $q->body,
                    'type' => $q->type,
                    'options' => $opts,
                ],
                'saved' => [
                    'selected_option_id' => $ans?->student_questionnaire_option_id,
                    'text_answer' => $ans?->text_answer,
                ],
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'response' => $response,
                'questionnaire' => [
                    'id' => $questionnaire->id,
                    'title' => $questionnaire->title,
                ],
                'remaining_seconds' => $remaining,
                'questions' => $questions,
            ],
        ]);
    }

    private function ensureRespondentColumnsReady(): void
    {
        abort_if(
            ! Schema::hasColumn('student_questionnaire_responses', 'respondent_type')
            || ! Schema::hasColumn('student_questionnaire_responses', 'respondent_id'),
            503,
            'Questionnaire respondent columns are not ready. Please run migrations.'
        );
    }
}
