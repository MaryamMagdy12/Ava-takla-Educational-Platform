<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreStudentQuestionnaireRequest;
use App\Models\GaFamily;
use App\Models\SpecialLearner;
use App\Models\Student;
use App\Models\StudentQuestionnaire;
use App\Models\StudentQuestionnaireOption;
use App\Models\StudentQuestionnaireQuestion;
use App\Models\StudentQuestionnaireResponse;
use Illuminate\Support\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class StudentQuestionnaireController extends Controller
{
    private function questionnaireScope(Request $request): string
    {
        $scope = $request->attributes->get('questionnaire_admin_scope');
        abort_if(! is_string($scope) || $scope === '', 403, 'Missing questionnaire admin scope.');

        return $scope;
    }

    private function ensureQuestionnaireScope(Request $request, StudentQuestionnaire $studentQuestionnaire): void
    {
        abort_if($studentQuestionnaire->admin_interface !== $this->questionnaireScope($request), 404);
    }

    public function index(Request $request)
    {
        $scope = $this->questionnaireScope($request);
        $items = StudentQuestionnaire::query()
            ->where('admin_interface', $scope)
            ->with('level:id,name')
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function store(StoreStudentQuestionnaireRequest $request)
    {
        $scope = $this->questionnaireScope($request);
        $data = $request->validated();
        $data['admin_interface'] = $scope;
        if ($scope !== 'student') {
            $data['level_id'] = null;
        }
        $data['status'] = 'draft';
        $q = StudentQuestionnaire::query()->create($data);

        return response()->json(['success' => true, 'data' => $q->fresh()->load('level')], 201);
    }

    public function show(Request $request, StudentQuestionnaire $studentQuestionnaire)
    {
        $this->ensureQuestionnaireScope($request, $studentQuestionnaire);
        $studentQuestionnaire->load(['level', 'questions.options']);

        return response()->json(['success' => true, 'data' => $studentQuestionnaire]);
    }

    public function update(Request $request, StudentQuestionnaire $studentQuestionnaire)
    {
        $this->ensureQuestionnaireScope($request, $studentQuestionnaire);
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'level_id' => ['sometimes', 'nullable', 'integer', 'exists:levels,id'],
            'available_from' => ['sometimes', 'date'],
            'available_to' => ['sometimes', 'date', 'after:available_from'],
            'response_duration_minutes' => ['nullable', 'integer', 'min:1', 'max:10080'],
            'status' => ['sometimes', 'in:draft,published,closed'],
        ]);
        if ($studentQuestionnaire->admin_interface !== 'student' && array_key_exists('level_id', $data)) {
            $data['level_id'] = null;
        }
        $studentQuestionnaire->update($data);

        return response()->json(['success' => true, 'data' => $studentQuestionnaire->fresh()->load('level')]);
    }

    public function destroy(Request $request, StudentQuestionnaire $studentQuestionnaire)
    {
        $this->ensureQuestionnaireScope($request, $studentQuestionnaire);
        $studentQuestionnaire->forceDelete();

        return response()->json(['success' => true]);
    }

    public function storeQuestion(Request $request, StudentQuestionnaire $studentQuestionnaire)
    {
        $this->ensureQuestionnaireScope($request, $studentQuestionnaire);
        $data = $request->validate([
            'body' => ['required', 'string'],
            'type' => ['required', 'in:mcq,true_false,text'],
            'order_no' => ['nullable', 'integer', 'min:0'],
        ]);
        $max = (int) $studentQuestionnaire->questions()->max('order_no');
        $question = $studentQuestionnaire->questions()->create([
            'body' => $data['body'],
            'type' => $data['type'],
            'order_no' => $data['order_no'] ?? ($max + 1),
        ]);

        return response()->json(['success' => true, 'data' => $question], 201);
    }

    public function updateQuestion(
        Request $request,
        StudentQuestionnaire $studentQuestionnaire,
        StudentQuestionnaireQuestion $studentQuestionnaireQuestion
    ) {
        $this->ensureQuestionnaireScope($request, $studentQuestionnaire);
        abort_if(
            (int) $studentQuestionnaireQuestion->student_questionnaire_id !== (int) $studentQuestionnaire->id,
            404
        );
        $data = $request->validate([
            'body' => ['sometimes', 'string'],
            'type' => ['sometimes', 'in:mcq,true_false,text'],
            'order_no' => ['sometimes', 'integer', 'min:0'],
        ]);
        $studentQuestionnaireQuestion->update($data);

        return response()->json(['success' => true, 'data' => $studentQuestionnaireQuestion->fresh()]);
    }

    public function storeOption(Request $request, StudentQuestionnaire $studentQuestionnaire, StudentQuestionnaireQuestion $studentQuestionnaireQuestion)
    {
        $this->ensureQuestionnaireScope($request, $studentQuestionnaire);
        abort_if(
            (int) $studentQuestionnaireQuestion->student_questionnaire_id !== (int) $studentQuestionnaire->id,
            404
        );
        $data = $request->validate([
            'option_text' => ['required', 'string', 'max:500'],
            'order_no' => ['nullable', 'integer', 'min:0'],
        ]);
        $max = (int) $studentQuestionnaireQuestion->options()->max('order_no');
        $option = $studentQuestionnaireQuestion->options()->create([
            'option_text' => $data['option_text'],
            // Survey questionnaires do not use correctness semantics.
            'is_correct' => null,
            'order_no' => $data['order_no'] ?? ($max + 1),
        ]);

        return response()->json(['success' => true, 'data' => $option], 201);
    }

    public function updateOption(
        Request $request,
        StudentQuestionnaire $studentQuestionnaire,
        StudentQuestionnaireQuestion $studentQuestionnaireQuestion,
        StudentQuestionnaireOption $studentQuestionnaireOption
    ) {
        $this->ensureQuestionnaireScope($request, $studentQuestionnaire);
        abort_if(
            (int) $studentQuestionnaireQuestion->student_questionnaire_id !== (int) $studentQuestionnaire->id,
            404
        );
        abort_if(
            (int) $studentQuestionnaireOption->student_questionnaire_question_id !== (int) $studentQuestionnaireQuestion->id,
            404
        );
        $data = $request->validate([
            'option_text' => ['sometimes', 'string', 'max:500'],
            'order_no' => ['sometimes', 'integer', 'min:0'],
        ]);
        $studentQuestionnaireOption->update($data);

        return response()->json(['success' => true, 'data' => $studentQuestionnaireOption->fresh()]);
    }

    public function details(Request $request, StudentQuestionnaire $studentQuestionnaire)
    {
        $this->ensureQuestionnaireScope($request, $studentQuestionnaire);
        $scope = $this->questionnaireScope($request);
        $questionnaire = $studentQuestionnaire->load([
            'questions' => fn ($q) => $q->orderBy('order_no')->with('options'),
        ]);

        $perPage = min(max($request->integer('per_page', 50), 1), 100);
        $responsesPaginator = $this->responsesQuery($questionnaire, $scope)->paginate($perPage);
        $responsesCollection = $responsesPaginator->getCollection();
        $nameMap = $this->buildRespondentNameMap($responsesCollection, $scope);

        $responsesRows = $responsesCollection
            ->map(fn (StudentQuestionnaireResponse $response) => $this->responseRow($response, $scope, $nameMap))
            ->values()
            ->all();

        $matrix = $this->answerMatrixForResponses($questionnaire, $responsesCollection, $nameMap);

        return response()->json([
            'success' => true,
            'data' => [
                'questionnaire' => $questionnaire,
                'responses' => $responsesRows,
                'matrix' => $matrix,
                'responses_pagination' => [
                    'current_page' => $responsesPaginator->currentPage(),
                    'last_page' => $responsesPaginator->lastPage(),
                    'per_page' => $responsesPaginator->perPage(),
                    'total' => $responsesPaginator->total(),
                ],
            ],
        ]);
    }

    private function responsesQuery(StudentQuestionnaire $questionnaire, string $scope)
    {
        return StudentQuestionnaireResponse::query()
            ->where('student_questionnaire_id', $questionnaire->id)
            ->when(
                $this->hasRespondentColumns(),
                fn ($q) => $q->where('respondent_type', $scope),
                fn ($q) => $q
            )
            ->orderByDesc('submitted_at')
            ->orderByDesc('id');
    }

    /**
     * @param  array<int, string>  $nameMap
     * @return array<string, mixed>
     */
    private function responseRow(StudentQuestionnaireResponse $response, string $scope, array $nameMap): array
    {
        return [
            'response_id' => $response->id,
            'respondent_id' => $response->respondent_id,
            'respondent_name' => $this->respondentNameFromMap($response, $scope, $nameMap),
            'status' => $response->status,
            'started_at' => $response->started_at,
            'submitted_at' => $response->submitted_at,
        ];
    }

    /**
     * @param  Collection<int, StudentQuestionnaireResponse>  $responses
     * @param  array<int, string>  $nameMap
     * @return array<int, array<string, mixed>>
     */
    private function answerMatrixForResponses(
        StudentQuestionnaire $questionnaire,
        Collection $responses,
        array $nameMap,
    ): array {
        $questions = $questionnaire->questions;
        if ($responses->isEmpty()) {
            return [];
        }

        $answers = \App\Models\StudentQuestionnaireResponseAnswer::query()
            ->whereIn('student_questionnaire_response_id', $responses->pluck('id'))
            ->get()
            ->groupBy('student_questionnaire_response_id');

        return $responses->map(function (StudentQuestionnaireResponse $response) use ($questions, $answers, $nameMap) {
            /** @var Collection<int, \App\Models\StudentQuestionnaireResponseAnswer> $answerRows */
            $answerRows = $answers->get($response->id, collect());
            $byQuestion = $answerRows->keyBy('student_questionnaire_question_id');
            $cells = [];
            foreach ($questions as $question) {
                $ans = $byQuestion->get($question->id);
                $value = null;
                if ($ans) {
                    if ($ans->text_answer !== null && trim((string) $ans->text_answer) !== '') {
                        $value = $ans->text_answer;
                    } elseif ($ans->student_questionnaire_option_id) {
                        $opt = $question->options->firstWhere('id', $ans->student_questionnaire_option_id);
                        $value = $opt?->option_text;
                    }
                }
                $cells[] = [
                    'question_id' => $question->id,
                    'value' => $value,
                ];
            }

            $scope = $this->resolveScopeFromResponse($response);

            return [
                'response_id' => $response->id,
                'respondent_id' => $response->respondent_id,
                'respondent_type' => $response->respondent_type,
                'respondent_name' => $this->respondentNameFromMap($response, $scope, $nameMap),
                'status' => $response->status,
                'cells' => $cells,
            ];
        })->values()->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function answerMatrix(StudentQuestionnaire $questionnaire, string $scope): array
    {
        $responses = $this->responsesQuery($questionnaire, $scope)->get();
        $nameMap = $this->buildRespondentNameMap($responses, $scope);

        return $this->answerMatrixForResponses($questionnaire, $responses, $nameMap);
    }

    /**
     * @param  Collection<int, StudentQuestionnaireResponse>  $responses
     * @return array<int, string> keyed by respondent id
     */
    private function buildRespondentNameMap(Collection $responses, string $scope): array
    {
        if ($responses->isEmpty()) {
            return [];
        }

        $map = [];
        if ($scope === 'student') {
            $ids = $responses->map(fn (StudentQuestionnaireResponse $r) => (int) ($r->respondent_id ?? $r->student_id))->filter()->unique()->values();
            $students = Student::query()->whereIn('id', $ids)->get(['id', 'full_name'])->keyBy('id');
            foreach ($ids as $id) {
                $map[(int) $id] = (string) ($students->get($id)?->full_name ?? ('Student #'.$id));
            }

            return $map;
        }

        if ($scope === 'special') {
            $ids = $responses->pluck('respondent_id')->filter()->map(fn ($id) => (int) $id)->unique()->values();
            $learners = SpecialLearner::query()->whereIn('id', $ids)->get(['id', 'full_name'])->keyBy('id');
            foreach ($ids as $id) {
                $map[(int) $id] = (string) ($learners->get($id)?->full_name ?? ('Learner #'.$id));
            }

            return $map;
        }

        $ids = $responses->pluck('respondent_id')->filter()->map(fn ($id) => (int) $id)->unique()->values();
        $families = GaFamily::query()->whereIn('id', $ids)->get(['id', 'display_name'])->keyBy('id');
        foreach ($ids as $id) {
            $map[(int) $id] = (string) ($families->get($id)?->display_name ?? ('Family #'.$id));
        }

        return $map;
    }

    /**
     * @param  array<int, string>  $nameMap
     */
    private function respondentNameFromMap(StudentQuestionnaireResponse $response, ?string $scope, array $nameMap): string
    {
        $scope = is_string($scope) && $scope !== '' ? $scope : $this->resolveScopeFromResponse($response);
        $id = (int) ($response->respondent_id ?? $response->student_id ?? 0);
        if ($id > 0 && isset($nameMap[$id])) {
            return $nameMap[$id];
        }

        return match ($scope) {
            'student' => 'Student #'.$id,
            'special' => 'Learner #'.$id,
            default => 'Family #'.$id,
        };
    }

    private function resolveScopeFromResponse(StudentQuestionnaireResponse $response): string
    {
        if (is_string($response->respondent_type) && $response->respondent_type !== '') {
            return $response->respondent_type;
        }

        if (! empty($response->student_id)) {
            return 'student';
        }

        return 'general_assembly';
    }

    private function hasRespondentColumns(): bool
    {
        return Schema::hasColumn('student_questionnaire_responses', 'respondent_type')
            && Schema::hasColumn('student_questionnaire_responses', 'respondent_id');
    }
}
