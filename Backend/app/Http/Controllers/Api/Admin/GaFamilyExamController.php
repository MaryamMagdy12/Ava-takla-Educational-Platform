<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreGaFamilyExamQuestionRequest;
use App\Http\Requests\Admin\StoreGaFamilyExamRequest;
use App\Http\Requests\Admin\StoreGaFamilyExamRuleRequest;
use App\Models\GaFamilyExam;
use App\Models\GaFamilyExamAttempt;
use App\Models\GaFamilyExamAttemptAnswer;
use App\Models\GaFamilyExamAttemptQuestion;
use App\Models\GaFamilyExamQuestion;
use App\Models\GaFamilyExamQuestionOption;
use App\Models\GaFamilyExamQuestionRule;
use App\Services\AuditLogService;
use App\Services\GaFamilyExamQuestionImportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GaFamilyExamController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLogService,
        private readonly GaFamilyExamQuestionImportService $importService,
    ) {}

    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => GaFamilyExam::query()
                ->with(['chapterScopes'])
                ->withCount('questions')
                ->orderByDesc('id')
                ->paginate(20),
        ]);
    }

    public function store(StoreGaFamilyExamRequest $request)
    {
        $validated = $request->validated();
        $chapterScopes = $validated['chapter_scopes'] ?? [];
        unset($validated['chapter_scopes']);
        $validated['question_count'] = $this->resolveExamQuestionCount($validated, $chapterScopes);

        $exam = DB::transaction(function () use ($validated, $chapterScopes) {
            $created = GaFamilyExam::query()->create($validated);
            $this->syncChapterScopes($created, $chapterScopes);

            return $created;
        });

        return response()->json(['success' => true, 'data' => $exam->fresh(['chapterScopes'])], 201);
    }

    public function show(GaFamilyExam $gaFamilyExam)
    {
        $gaFamilyExam->load([
            'questions' => fn ($q) => $q->orderBy('id'),
            'questions.options',
            'rules',
            'chapterScopes',
        ]);

        return response()->json(['success' => true, 'data' => $gaFamilyExam]);
    }

    public function update(StoreGaFamilyExamRequest $request, GaFamilyExam $gaFamilyExam)
    {
        $validated = $request->validated();
        $hasChapterScopes = array_key_exists('chapter_scopes', $validated);
        $chapterScopes = $hasChapterScopes ? ($validated['chapter_scopes'] ?? []) : [];
        unset($validated['chapter_scopes']);

        if ($hasChapterScopes || array_key_exists('question_count', $validated)) {
            $validated['question_count'] = $this->resolveExamQuestionCount($validated, $chapterScopes, $gaFamilyExam);
        }

        DB::transaction(function () use ($gaFamilyExam, $validated, $hasChapterScopes, $chapterScopes) {
            if ($validated !== []) {
                $gaFamilyExam->update($validated);
            }

            if ($hasChapterScopes) {
                $this->syncChapterScopes($gaFamilyExam, $chapterScopes);
            }
        });

        return response()->json(['success' => true, 'data' => $gaFamilyExam->fresh(['chapterScopes'])]);
    }

    public function destroy(GaFamilyExam $gaFamilyExam)
    {
        DB::transaction(function () use ($gaFamilyExam) {
            $attemptIds = GaFamilyExamAttempt::query()
                ->where('exam_id', $gaFamilyExam->id)
                ->pluck('id');

            if ($attemptIds->isNotEmpty()) {
                GaFamilyExamAttemptAnswer::query()->whereIn('attempt_id', $attemptIds)->delete();
                GaFamilyExamAttemptQuestion::query()->whereIn('attempt_id', $attemptIds)->delete();
                GaFamilyExamAttempt::query()->whereIn('id', $attemptIds)->delete();
            }

            GaFamilyExamQuestionOption::query()
                ->whereIn(
                    'question_id',
                    GaFamilyExamQuestion::query()->where('exam_id', $gaFamilyExam->id)->pluck('id')
                )
                ->delete();

            GaFamilyExamQuestion::query()
                ->where('exam_id', $gaFamilyExam->id)
                ->each(function (GaFamilyExamQuestion $q) {
                    $q->forceDelete();
                });

            GaFamilyExamQuestionRule::query()->where('exam_id', $gaFamilyExam->id)->delete();
            $gaFamilyExam->forceDelete();
        });

        return response()->json(['success' => true]);
    }

    public function questionBankQuestions(Request $request)
    {
        $query = GaFamilyExamQuestion::query()
            ->questionBank()
            ->with('options')
            ->orderByDesc('id');

        if ($request->filled('testament_type')) {
            $query->where('testament_type', (string) $request->query('testament_type'));
        }
        if ($request->filled('chapter_number')) {
            $query->where('chapter_number', (int) $request->query('chapter_number'));
        }
        if ($request->filled('status')) {
            $query->where('status', (string) $request->query('status'));
        }
        if ($request->filled('q')) {
            $needle = trim((string) $request->query('q'));
            if ($needle !== '') {
                $query->where('question_text', 'like', '%'.$needle.'%');
            }
        }

        return response()->json(['success' => true, 'data' => $query->paginate(50)]);
    }

    public function storeQuestionBankQuestion(StoreGaFamilyExamQuestionRequest $request)
    {
        $question = GaFamilyExamQuestion::query()->create([
            ...$request->validated(),
            'exam_id' => null,
        ]);

        return response()->json(['success' => true, 'data' => $question], 201);
    }

    public function importQuestionBankQuestions(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx,ods', 'max:10240'],
        ]);
        $result = $this->importService->import($request->file('file'));

        return response()->json(['success' => true, 'data' => $result]);
    }

    public function updateQuestionBankQuestion(StoreGaFamilyExamQuestionRequest $request, GaFamilyExamQuestion $gaFamilyExamQuestion)
    {
        abort_if($gaFamilyExamQuestion->exam_id !== null, 404);
        $gaFamilyExamQuestion->update($request->validated());

        return response()->json(['success' => true, 'data' => $gaFamilyExamQuestion->fresh()]);
    }

    public function destroyQuestionBankQuestion(GaFamilyExamQuestion $gaFamilyExamQuestion)
    {
        abort_if($gaFamilyExamQuestion->exam_id !== null, 404);
        $gaFamilyExamQuestion->forceDelete();

        return response()->json(['success' => true]);
    }

    public function storeQuestionBankOption(Request $request, GaFamilyExamQuestion $gaFamilyExamQuestion)
    {
        abort_if($gaFamilyExamQuestion->exam_id !== null, 404);
        $data = $request->validate([
            'option_text' => ['required', 'string', 'max:500'],
            'is_correct' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $max = (int) $gaFamilyExamQuestion->options()->max('sort_order');
        $option = $gaFamilyExamQuestion->options()->create([
            'option_text' => $data['option_text'],
            'is_correct' => $data['is_correct'],
            'sort_order' => $data['sort_order'] ?? ($max + 1),
        ]);

        return response()->json(['success' => true, 'data' => $option], 201);
    }

    public function updateQuestionBankOption(Request $request, GaFamilyExamQuestion $gaFamilyExamQuestion, GaFamilyExamQuestionOption $gaFamilyExamQuestionOption)
    {
        abort_if($gaFamilyExamQuestion->exam_id !== null, 404);
        abort_if((int) $gaFamilyExamQuestionOption->question_id !== (int) $gaFamilyExamQuestion->id, 404);
        $data = $request->validate([
            'option_text' => ['required', 'string', 'max:500'],
            'is_correct' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $gaFamilyExamQuestionOption->update($data);

        return response()->json(['success' => true, 'data' => $gaFamilyExamQuestionOption->fresh()]);
    }

    public function destroyQuestionBankOption(GaFamilyExamQuestion $gaFamilyExamQuestion, GaFamilyExamQuestionOption $gaFamilyExamQuestionOption)
    {
        abort_if($gaFamilyExamQuestion->exam_id !== null, 404);
        abort_if((int) $gaFamilyExamQuestionOption->question_id !== (int) $gaFamilyExamQuestion->id, 404);
        $gaFamilyExamQuestionOption->delete();

        return response()->json(['success' => true]);
    }

    public function storeQuestion(StoreGaFamilyExamQuestionRequest $request, GaFamilyExam $gaFamilyExam)
    {
        $question = $gaFamilyExam->questions()->create($request->validated());

        return response()->json(['success' => true, 'data' => $question], 201);
    }

    public function importQuestions(Request $request, GaFamilyExam $gaFamilyExam)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx,ods', 'max:10240'],
        ]);
        $result = $this->importService->import($request->file('file'), $gaFamilyExam);

        return response()->json(['success' => true, 'data' => $result]);
    }

    public function updateQuestion(StoreGaFamilyExamQuestionRequest $request, GaFamilyExam $gaFamilyExam, GaFamilyExamQuestion $gaFamilyExamQuestion)
    {
        abort_if((int) $gaFamilyExamQuestion->exam_id !== (int) $gaFamilyExam->id, 404);
        $gaFamilyExamQuestion->update($request->validated());

        return response()->json(['success' => true, 'data' => $gaFamilyExamQuestion->fresh()]);
    }

    public function destroyQuestion(GaFamilyExam $gaFamilyExam, GaFamilyExamQuestion $gaFamilyExamQuestion)
    {
        abort_if((int) $gaFamilyExamQuestion->exam_id !== (int) $gaFamilyExam->id, 404);
        $gaFamilyExamQuestion->forceDelete();

        return response()->json(['success' => true]);
    }

    public function storeOption(Request $request, GaFamilyExam $gaFamilyExam, GaFamilyExamQuestion $gaFamilyExamQuestion)
    {
        abort_if((int) $gaFamilyExamQuestion->exam_id !== (int) $gaFamilyExam->id, 404);
        $data = $request->validate([
            'option_text' => ['required', 'string', 'max:500'],
            'is_correct' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $max = (int) $gaFamilyExamQuestion->options()->max('sort_order');
        $option = $gaFamilyExamQuestion->options()->create([
            'option_text' => $data['option_text'],
            'is_correct' => $data['is_correct'],
            'sort_order' => $data['sort_order'] ?? ($max + 1),
        ]);

        return response()->json(['success' => true, 'data' => $option], 201);
    }

    public function updateOption(Request $request, GaFamilyExam $gaFamilyExam, GaFamilyExamQuestion $gaFamilyExamQuestion, GaFamilyExamQuestionOption $gaFamilyExamQuestionOption)
    {
        abort_if((int) $gaFamilyExamQuestion->exam_id !== (int) $gaFamilyExam->id, 404);
        abort_if((int) $gaFamilyExamQuestionOption->question_id !== (int) $gaFamilyExamQuestion->id, 404);
        $data = $request->validate([
            'option_text' => ['required', 'string', 'max:500'],
            'is_correct' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $gaFamilyExamQuestionOption->update($data);

        return response()->json(['success' => true, 'data' => $gaFamilyExamQuestionOption->fresh()]);
    }

    public function destroyOption(GaFamilyExam $gaFamilyExam, GaFamilyExamQuestion $gaFamilyExamQuestion, GaFamilyExamQuestionOption $gaFamilyExamQuestionOption)
    {
        abort_if((int) $gaFamilyExamQuestion->exam_id !== (int) $gaFamilyExam->id, 404);
        abort_if((int) $gaFamilyExamQuestionOption->question_id !== (int) $gaFamilyExamQuestion->id, 404);
        $gaFamilyExamQuestionOption->delete();

        return response()->json(['success' => true]);
    }

    public function storeRule(StoreGaFamilyExamRuleRequest $request, GaFamilyExam $gaFamilyExam)
    {
        $rule = $gaFamilyExam->rules()->create($request->validated());

        return response()->json(['success' => true, 'data' => $rule], 201);
    }

    public function updateRule(StoreGaFamilyExamRuleRequest $request, GaFamilyExam $gaFamilyExam, GaFamilyExamQuestionRule $gaFamilyExamQuestionRule)
    {
        abort_if((int) $gaFamilyExamQuestionRule->exam_id !== (int) $gaFamilyExam->id, 404);
        $gaFamilyExamQuestionRule->update($request->validated());

        return response()->json(['success' => true, 'data' => $gaFamilyExamQuestionRule->fresh()]);
    }

    public function destroyRule(GaFamilyExam $gaFamilyExam, GaFamilyExamQuestionRule $gaFamilyExamQuestionRule)
    {
        abort_if((int) $gaFamilyExamQuestionRule->exam_id !== (int) $gaFamilyExam->id, 404);
        $gaFamilyExamQuestionRule->delete();

        return response()->json(['success' => true]);
    }

    public function attempts(GaFamilyExam $gaFamilyExam)
    {
        $data = $gaFamilyExam->attempts()->with('family')->orderByDesc('id')->paginate(30);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function attemptDetails(GaFamilyExam $gaFamilyExam, GaFamilyExamAttempt $gaFamilyExamAttempt)
    {
        abort_if((int) $gaFamilyExamAttempt->exam_id !== (int) $gaFamilyExam->id, 404);
        $gaFamilyExamAttempt->load(['family', 'answers.question.options', 'answers.selectedOption', 'attemptQuestions.question']);

        return response()->json(['success' => true, 'data' => $gaFamilyExamAttempt]);
    }

    public function resetAttempt(Request $request, GaFamilyExam $gaFamilyExam, GaFamilyExamAttempt $gaFamilyExamAttempt)
    {
        abort_if((int) $gaFamilyExamAttempt->exam_id !== (int) $gaFamilyExam->id, 404);
        $gaFamilyExamAttempt->answers()->delete();
        $gaFamilyExamAttempt->attemptQuestions()->delete();
        $gaFamilyExamAttempt->delete();
        $this->auditLogService->log('ga_family_exam.reset', $request->user(), $gaFamilyExam, ['attempt_id' => $gaFamilyExamAttempt->id], $request);

        return response()->json(['success' => true]);
    }

    /**
     * @param  array<int, array{testament_type:string,chapter_number:int,question_count?:int|null}>  $chapterScopes
     */
    private function syncChapterScopes(GaFamilyExam $exam, array $chapterScopes): void
    {
        $normalized = collect($chapterScopes)
            ->map(function (array $scope) {
                return [
                    'testament_type' => (string) ($scope['testament_type'] ?? ''),
                    'chapter_number' => (int) ($scope['chapter_number'] ?? 0),
                    'question_count' => max(0, (int) ($scope['question_count'] ?? 0)),
                ];
            })
            ->filter(fn (array $scope) => $scope['chapter_number'] > 0 && in_array($scope['testament_type'], ['old', 'new'], true))
            ->unique(fn (array $scope) => $scope['testament_type'].'#'.$scope['chapter_number'])
            ->values()
            ->all();

        $exam->chapterScopes()->delete();
        if ($normalized !== []) {
            $exam->chapterScopes()->createMany($normalized);
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array<int, array<string, mixed>>  $chapterScopes
     */
    private function resolveExamQuestionCount(array $validated, array $chapterScopes, ?GaFamilyExam $currentExam = null): int
    {
        if ($chapterScopes !== []) {
            $scopedTotal = (int) collect($chapterScopes)
                ->sum(fn ($scope) => max(0, (int) ($scope['question_count'] ?? 0)));
            if ($scopedTotal > 0) {
                return $scopedTotal;
            }
        }

        if (array_key_exists('question_count', $validated)) {
            return max(0, (int) $validated['question_count']);
        }

        return max(0, (int) ($currentExam?->question_count ?? 0));
    }
}
