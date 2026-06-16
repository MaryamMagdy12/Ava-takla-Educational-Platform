<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreGaCompetitionRequest;
use App\Http\Requests\Admin\StoreGaCompetitionQuestionRequest;
use App\Http\Requests\Admin\StoreGaCompetitionRuleRequest;
use App\Http\Requests\Admin\StoreGaCompetitionTopicRequest;
use App\Models\GaCompetition;
use App\Models\GaCompetitionAttempt;
use App\Models\GaCompetitionAttemptAnswer;
use App\Models\GaCompetitionAttemptQuestion;
use App\Models\GaCompetitionOption;
use App\Models\GaCompetitionQuestion;
use App\Models\GaCompetitionQuestionRule;
use App\Models\GaCompetitionTopic;
use App\Services\AuditLogService;
use App\Services\Competitions\GaCompetitionEngineService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GaCompetitionController extends Controller
{
    public function __construct(
        private readonly GaCompetitionEngineService $engine,
        private readonly AuditLogService $auditLogService,
    ) {}

    public function index()
    {
        $items = GaCompetition::query()->orderByDesc('id')->paginate(20);

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function store(StoreGaCompetitionRequest $request)
    {
        $competition = GaCompetition::query()->create($request->validated());
        $this->auditLogService->log('ga_competition.created', $request->user(), $competition, null, $request);

        return response()->json(['success' => true, 'data' => $competition], 201);
    }

    public function show(GaCompetition $gaCompetition)
    {
        $gaCompetition->load(['topics', 'questionRules', 'questions.options']);

        return response()->json(['success' => true, 'data' => $gaCompetition]);
    }

    public function update(Request $request, GaCompetition $gaCompetition)
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['sometimes', 'date', 'after:starts_at'],
            'max_attempt_duration_hours' => ['nullable', 'integer', 'min:1', 'max:720'],
            'status' => ['sometimes', 'in:draft,published,closed'],
        ]);
        $gaCompetition->update($data);
        if (array_key_exists('status', $data) && $data['status'] === 'published') {
            $this->auditLogService->log('ga_competition.published', $request->user(), $gaCompetition, null, $request);
        }

        return response()->json(['success' => true, 'data' => $gaCompetition->fresh()]);
    }

    public function destroy(GaCompetition $gaCompetition)
    {
        DB::transaction(function () use ($gaCompetition) {
            $attemptIds = GaCompetitionAttempt::query()
                ->where('ga_competition_id', $gaCompetition->id)
                ->pluck('id');

            if ($attemptIds->isNotEmpty()) {
                GaCompetitionAttemptAnswer::query()->whereIn('ga_competition_attempt_id', $attemptIds)->delete();
                GaCompetitionAttemptQuestion::query()->whereIn('ga_competition_attempt_id', $attemptIds)->delete();
                GaCompetitionAttempt::query()->whereIn('id', $attemptIds)->delete();
            }

            GaCompetitionOption::query()
                ->whereIn(
                    'ga_competition_question_id',
                    GaCompetitionQuestion::query()->where('ga_competition_id', $gaCompetition->id)->pluck('id')
                )
                ->delete();

            GaCompetitionQuestion::query()
                ->where('ga_competition_id', $gaCompetition->id)
                ->each(function (GaCompetitionQuestion $q) {
                    $q->forceDelete();
                });

            GaCompetitionQuestionRule::query()->where('ga_competition_id', $gaCompetition->id)->delete();

            GaCompetitionTopic::query()
                ->where('ga_competition_id', $gaCompetition->id)
                ->each(function (GaCompetitionTopic $t) {
                    $t->forceDelete();
                });

            $gaCompetition->forceDelete();
        });

        return response()->json(['success' => true]);
    }

    public function storeTopic(StoreGaCompetitionTopicRequest $request, GaCompetition $gaCompetition)
    {
        $data = $request->validated();
        $max = (int) $gaCompetition->topics()->max('sort_order');
        $topic = $gaCompetition->topics()->create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'sort_order' => $data['sort_order'] ?? ($max + 1),
        ]);

        return response()->json(['success' => true, 'data' => $topic], 201);
    }

    public function updateTopic(StoreGaCompetitionTopicRequest $request, GaCompetition $gaCompetition, GaCompetitionTopic $gaCompetitionTopic)
    {
        abort_if((int) $gaCompetitionTopic->ga_competition_id !== (int) $gaCompetition->id, 404);
        $gaCompetitionTopic->update($request->validated());

        return response()->json(['success' => true, 'data' => $gaCompetitionTopic->fresh()]);
    }

    public function destroyTopic(GaCompetition $gaCompetition, GaCompetitionTopic $gaCompetitionTopic)
    {
        abort_if((int) $gaCompetitionTopic->ga_competition_id !== (int) $gaCompetition->id, 404);
        $gaCompetitionTopic->forceDelete();

        return response()->json(['success' => true]);
    }

    public function storeQuestion(StoreGaCompetitionQuestionRequest $request, GaCompetition $gaCompetition)
    {
        $data = $request->validated();
        $topic = GaCompetitionTopic::query()->findOrFail($data['ga_competition_topic_id']);
        abort_if((int) $topic->ga_competition_id !== (int) $gaCompetition->id, 422, 'Topic does not belong to this competition.');
        $max = (int) $gaCompetition->questions()->max('order_no');
        $question = $gaCompetition->questions()->create([
            'ga_competition_topic_id' => $data['ga_competition_topic_id'],
            'body' => $data['body'],
            'type' => $data['type'],
            'testament_type' => $data['testament_type'],
            'chapter_number' => $data['chapter_number'],
            'difficulty' => $data['difficulty'] ?? null,
            'feedback_correct' => $data['feedback_correct'] ?? null,
            'feedback_wrong' => $data['feedback_wrong'] ?? null,
            'status' => $data['status'] ?? 'active',
            'order_no' => $data['order_no'] ?? ($max + 1),
        ]);

        return response()->json(['success' => true, 'data' => $question], 201);
    }

    public function updateQuestion(StoreGaCompetitionQuestionRequest $request, GaCompetition $gaCompetition, GaCompetitionQuestion $gaCompetitionQuestion)
    {
        abort_if((int) $gaCompetitionQuestion->ga_competition_id !== (int) $gaCompetition->id, 404);
        $data = $request->validated();
        $topic = GaCompetitionTopic::query()->findOrFail($data['ga_competition_topic_id']);
        abort_if((int) $topic->ga_competition_id !== (int) $gaCompetition->id, 422, 'Topic does not belong to this competition.');
        $gaCompetitionQuestion->update($data);

        return response()->json(['success' => true, 'data' => $gaCompetitionQuestion->fresh()]);
    }

    public function destroyQuestion(GaCompetition $gaCompetition, GaCompetitionQuestion $gaCompetitionQuestion)
    {
        abort_if((int) $gaCompetitionQuestion->ga_competition_id !== (int) $gaCompetition->id, 404);
        $gaCompetitionQuestion->forceDelete();

        return response()->json(['success' => true]);
    }

    public function storeOption(Request $request, GaCompetition $gaCompetition, GaCompetitionQuestion $gaCompetitionQuestion)
    {
        abort_if((int) $gaCompetitionQuestion->ga_competition_id !== (int) $gaCompetition->id, 404);
        $data = $request->validate([
            'option_text' => ['required', 'string', 'max:500'],
            'is_correct' => ['required', 'boolean'],
            'order_no' => ['nullable', 'integer', 'min:0'],
        ]);
        $max = (int) $gaCompetitionQuestion->options()->max('order_no');
        $opt = $gaCompetitionQuestion->options()->create([
            'option_text' => $data['option_text'],
            'is_correct' => $data['is_correct'],
            'order_no' => $data['order_no'] ?? ($max + 1),
        ]);

        return response()->json(['success' => true, 'data' => $opt], 201);
    }

    public function updateOption(Request $request, GaCompetition $gaCompetition, GaCompetitionQuestion $gaCompetitionQuestion, GaCompetitionOption $gaCompetitionOption)
    {
        abort_if((int) $gaCompetitionQuestion->ga_competition_id !== (int) $gaCompetition->id, 404);
        abort_if((int) $gaCompetitionOption->ga_competition_question_id !== (int) $gaCompetitionQuestion->id, 404);
        $data = $request->validate([
            'option_text' => ['required', 'string', 'max:500'],
            'is_correct' => ['required', 'boolean'],
            'order_no' => ['nullable', 'integer', 'min:0'],
        ]);
        $gaCompetitionOption->update($data);

        return response()->json(['success' => true, 'data' => $gaCompetitionOption->fresh()]);
    }

    public function destroyOption(GaCompetition $gaCompetition, GaCompetitionQuestion $gaCompetitionQuestion, GaCompetitionOption $gaCompetitionOption)
    {
        abort_if((int) $gaCompetitionQuestion->ga_competition_id !== (int) $gaCompetition->id, 404);
        abort_if((int) $gaCompetitionOption->ga_competition_question_id !== (int) $gaCompetitionQuestion->id, 404);
        $gaCompetitionOption->delete();

        return response()->json(['success' => true]);
    }

    public function storeRule(StoreGaCompetitionRuleRequest $request, GaCompetition $gaCompetition)
    {
        $data = $request->validated();
        $topic = GaCompetitionTopic::query()->findOrFail($data['ga_competition_topic_id']);
        abort_if((int) $topic->ga_competition_id !== (int) $gaCompetition->id, 422, 'Topic does not belong to this competition.');
        $rule = $gaCompetition->questionRules()->create($data);

        return response()->json(['success' => true, 'data' => $rule], 201);
    }

    public function updateRule(StoreGaCompetitionRuleRequest $request, GaCompetition $gaCompetition, GaCompetitionQuestionRule $gaCompetitionQuestionRule)
    {
        abort_if((int) $gaCompetitionQuestionRule->ga_competition_id !== (int) $gaCompetition->id, 404);
        $data = $request->validated();
        $topic = GaCompetitionTopic::query()->findOrFail($data['ga_competition_topic_id']);
        abort_if((int) $topic->ga_competition_id !== (int) $gaCompetition->id, 422, 'Topic does not belong to this competition.');
        $gaCompetitionQuestionRule->update($data);

        return response()->json(['success' => true, 'data' => $gaCompetitionQuestionRule->fresh()]);
    }

    public function destroyRule(GaCompetition $gaCompetition, GaCompetitionQuestionRule $gaCompetitionQuestionRule)
    {
        abort_if((int) $gaCompetitionQuestionRule->ga_competition_id !== (int) $gaCompetition->id, 404);
        $gaCompetitionQuestionRule->delete();

        return response()->json(['success' => true]);
    }

    public function attempts(GaCompetition $gaCompetition)
    {
        $data = $gaCompetition->attempts()->with('family')->orderByDesc('id')->paginate(30);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function attemptDetails(GaCompetition $gaCompetition, GaCompetitionAttempt $gaCompetitionAttempt)
    {
        abort_if((int) $gaCompetitionAttempt->ga_competition_id !== (int) $gaCompetition->id, 404);
        $gaCompetitionAttempt->load(['family', 'answers.question.options', 'answers.option', 'attemptQuestions.question']);

        return response()->json(['success' => true, 'data' => $gaCompetitionAttempt]);
    }

    public function verifyAttempt(Request $request, GaCompetitionAttempt $gaCompetitionAttempt)
    {
        $fresh = $this->engine->verifyAttempt($gaCompetitionAttempt);
        $this->auditLogService->log('ga_competition.verified', $request->user(), $fresh, [], $request);

        return response()->json(['success' => true, 'data' => $fresh]);
    }
}
