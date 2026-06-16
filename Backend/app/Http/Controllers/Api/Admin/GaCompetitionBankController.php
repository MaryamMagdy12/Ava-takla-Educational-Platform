<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GaCompetition;
use App\Models\GaCompetitionOption;
use App\Models\GaCompetitionOptionBank;
use App\Models\GaCompetitionPartBank;
use App\Models\GaCompetitionQuestion;
use App\Models\GaCompetitionQuestionBank;
use App\Models\GaCompetitionTopic;
use App\Services\GaCompetitionBankImportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GaCompetitionBankController extends Controller
{
    public function __construct(private readonly GaCompetitionBankImportService $importService) {}

    public function parts(Request $request)
    {
        $perPage = min(max($request->integer('per_page', 50), 1), 100);
        $data = GaCompetitionPartBank::query()
            ->withCount('questions')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function storePart(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $part = GaCompetitionPartBank::query()->create($data);

        return response()->json(['success' => true, 'data' => $part], 201);
    }

    public function updatePart(Request $request, GaCompetitionPartBank $gaCompetitionPartBank)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $gaCompetitionPartBank->update($data);

        return response()->json(['success' => true, 'data' => $gaCompetitionPartBank->fresh()]);
    }

    public function destroyPart(GaCompetitionPartBank $gaCompetitionPartBank)
    {
        DB::transaction(function () use ($gaCompetitionPartBank) {
            $questionIds = $gaCompetitionPartBank->questions()->pluck('id');
            if ($questionIds->isNotEmpty()) {
                GaCompetitionOptionBank::query()
                    ->whereIn('ga_competition_question_bank_id', $questionIds)
                    ->delete();

                GaCompetitionQuestionBank::query()
                    ->whereIn('id', $questionIds)
                    ->each(function (GaCompetitionQuestionBank $q) {
                        $q->forceDelete();
                    });
            }

            $gaCompetitionPartBank->forceDelete();
        });

        return response()->json(['success' => true]);
    }

    public function questions(Request $request)
    {
        $perPage = min(max($request->integer('per_page', 30), 1), 100);
        $query = GaCompetitionQuestionBank::query()->with(['part', 'options'])->orderByDesc('id');
        if ($request->filled('part_id')) {
            $query->where('ga_competition_part_bank_id', (int) $request->query('part_id'));
        }
        $data = $query->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function storeQuestion(Request $request)
    {
        $data = $request->validate([
            'ga_competition_part_bank_id' => ['required', 'integer', 'exists:ga_competition_part_banks,id'],
            'question_text' => ['required', 'string'],
            'question_type' => ['required', 'in:mcq,true_false'],
            'testament_type' => ['required', 'in:old,new'],
            'chapter_number' => ['required', 'integer', 'min:1'],
            'difficulty' => ['nullable', 'in:easy,medium,hard'],
            'feedback_correct' => ['nullable', 'string'],
            'feedback_wrong' => ['nullable', 'string'],
            'status' => ['nullable', 'in:active,inactive'],
        ]);
        $question = GaCompetitionQuestionBank::query()->create($data);

        return response()->json(['success' => true, 'data' => $question], 201);
    }

    public function updateQuestion(Request $request, GaCompetitionQuestionBank $gaCompetitionQuestionBank)
    {
        $data = $request->validate([
            'ga_competition_part_bank_id' => ['sometimes', 'integer', 'exists:ga_competition_part_banks,id'],
            'question_text' => ['sometimes', 'string'],
            'question_type' => ['sometimes', 'in:mcq,true_false'],
            'testament_type' => ['sometimes', 'in:old,new'],
            'chapter_number' => ['sometimes', 'integer', 'min:1'],
            'difficulty' => ['nullable', 'in:easy,medium,hard'],
            'feedback_correct' => ['nullable', 'string'],
            'feedback_wrong' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);
        $gaCompetitionQuestionBank->update($data);

        return response()->json(['success' => true, 'data' => $gaCompetitionQuestionBank->fresh()->load('options')]);
    }

    public function destroyQuestion(GaCompetitionQuestionBank $gaCompetitionQuestionBank)
    {
        $gaCompetitionQuestionBank->forceDelete();

        return response()->json(['success' => true]);
    }

    public function storeOption(Request $request, GaCompetitionQuestionBank $gaCompetitionQuestionBank)
    {
        $data = $request->validate([
            'option_text' => ['required', 'string', 'max:500'],
            'is_correct' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        $max = (int) $gaCompetitionQuestionBank->options()->max('sort_order');
        $opt = $gaCompetitionQuestionBank->options()->create([
            'option_text' => $data['option_text'],
            'is_correct' => $data['is_correct'],
            'sort_order' => $data['sort_order'] ?? ($max + 1),
        ]);

        return response()->json(['success' => true, 'data' => $opt], 201);
    }

    public function updateOption(Request $request, GaCompetitionQuestionBank $gaCompetitionQuestionBank, GaCompetitionOptionBank $gaCompetitionOptionBank)
    {
        abort_if((int) $gaCompetitionOptionBank->ga_competition_question_bank_id !== (int) $gaCompetitionQuestionBank->id, 404);
        $data = $request->validate([
            'option_text' => ['required', 'string', 'max:500'],
            'is_correct' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
        if ($data['is_correct']) {
            $gaCompetitionQuestionBank->options()->where('id', '!=', $gaCompetitionOptionBank->id)->update(['is_correct' => false]);
        }
        $gaCompetitionOptionBank->update($data);

        return response()->json(['success' => true, 'data' => $gaCompetitionOptionBank->fresh()]);
    }

    public function destroyOption(GaCompetitionQuestionBank $gaCompetitionQuestionBank, GaCompetitionOptionBank $gaCompetitionOptionBank)
    {
        abort_if((int) $gaCompetitionOptionBank->ga_competition_question_bank_id !== (int) $gaCompetitionQuestionBank->id, 404);
        $gaCompetitionOptionBank->delete();

        return response()->json(['success' => true]);
    }

    public function importQuestions(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx,ods', 'max:10240'],
        ]);
        $result = $this->importService->import($request->file('file'));

        return response()->json(['success' => true, 'data' => $result]);
    }

    public function importIntoCompetition(Request $request, GaCompetition $gaCompetition)
    {
        $data = $request->validate([
            'part_ids' => ['required', 'array'],
            'part_ids.*' => ['integer', 'exists:ga_competition_part_banks,id'],
        ]);

        $result = DB::transaction(function () use ($gaCompetition, $data) {
            $parts = GaCompetitionPartBank::query()
                ->whereIn('id', $data['part_ids'])
                ->with(['questions.options'])
                ->get();

            $importedTopics = [];
            $topicMap = [];
            $importedQuestions = 0;
            foreach ($parts as $part) {
                $topic = GaCompetitionTopic::query()->firstOrCreate(
                    [
                        'ga_competition_id' => $gaCompetition->id,
                        'title' => $part->title,
                    ],
                    [
                        'description' => $part->description,
                        'sort_order' => $part->sort_order,
                    ]
                );
                $importedTopics[] = $topic->id;
                $topicMap[(string) $part->id] = (int) $topic->id;

                foreach ($part->questions as $qBank) {
                    $question = GaCompetitionQuestion::query()->create([
                        'ga_competition_id' => $gaCompetition->id,
                        'ga_competition_topic_id' => $topic->id,
                        'body' => $qBank->question_text,
                        'type' => $qBank->question_type,
                        'testament_type' => $qBank->testament_type,
                        'chapter_number' => $qBank->chapter_number,
                        'difficulty' => $qBank->difficulty,
                        'feedback_correct' => $qBank->feedback_correct,
                        'feedback_wrong' => $qBank->feedback_wrong,
                        'status' => $qBank->status,
                        'order_no' => ((int) GaCompetitionQuestion::query()->where('ga_competition_id', $gaCompetition->id)->max('order_no')) + 1,
                    ]);
                    $importedQuestions++;

                    foreach ($qBank->options as $optBank) {
                        GaCompetitionOption::query()->create([
                            'ga_competition_question_id' => $question->id,
                            'option_text' => $optBank->option_text,
                            'is_correct' => $optBank->is_correct,
                            'order_no' => $optBank->sort_order,
                        ]);
                    }
                }
            }

            return [
                'topic_ids' => array_values(array_unique($importedTopics)),
                'topic_map' => $topicMap,
                'questions_imported' => $importedQuestions,
            ];
        });

        return response()->json(['success' => true, 'data' => $result]);
    }
}
