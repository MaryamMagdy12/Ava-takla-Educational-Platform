<?php

namespace App\Http\Controllers\Api\Family;

use App\Http\Controllers\Concerns\GuardsAttemptResume;
use App\Http\Controllers\Controller;
use App\Support\ApiErrorCode;
use App\Http\Requests\Family\SubmitGaCompetitionRequest;
use App\Models\GaCompetition;
use App\Models\GaCompetitionAttempt;
use App\Models\GaCompetitionAttemptQuestion;
use App\Services\AuditLogService;
use App\Services\Competitions\GaCompetitionEngineService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class FamilyCompetitionController extends Controller
{
    use GuardsAttemptResume;

    public function __construct(
        private readonly GaCompetitionEngineService $engine,
        private readonly AuditLogService $auditLogService,
    )
    {
    }

    public function index(Request $request)
    {
        $now = now();
        $paginator = GaCompetition::query()
            ->where('status', 'published')
            ->where('starts_at', '<=', $now)
            ->where('ends_at', '>=', $now)
            ->orderByDesc('id')
            ->paginate(20);

        $ids = $paginator->getCollection()->pluck('id');
        $attempts = GaCompetitionAttempt::query()
            ->where('ga_family_id', $request->user()->id)
            ->whereIn('ga_competition_id', $ids)
            ->get()
            ->keyBy('ga_competition_id');

        $paginator->getCollection()->transform(function (GaCompetition $c) use ($attempts) {
            return [
                'id' => $c->id,
                'title' => $c->title,
                'starts_at' => $c->starts_at,
                'ends_at' => $c->ends_at,
                'max_attempt_duration_hours' => $c->max_attempt_duration_hours,
                'attempt' => $attempts[$c->id] ?? null,
            ];
        });

        return response()->json(['success' => true, 'data' => $paginator]);
    }

    public function start(Request $request, GaCompetition $gaCompetition)
    {
        $attempt = $this->engine->startAttempt($gaCompetition, $request->user());
        $this->auditLogService->log('ga_competition.started', $request->user(), $attempt, null, $request);

        return $this->resumePayload($attempt);
    }

    public function resume(Request $request, GaCompetitionAttempt $gaCompetitionAttempt)
    {
        abort_if($gaCompetitionAttempt->ga_family_id !== $request->user()->id, 403);
        $gaCompetitionAttempt->load('competition');

        return $this->resumePayload($gaCompetitionAttempt);
    }

    public function submit(SubmitGaCompetitionRequest $request, GaCompetitionAttempt $gaCompetitionAttempt)
    {
        abort_if($gaCompetitionAttempt->ga_family_id !== $request->user()->id, 403);
        $saved = $this->engine->submitAttempt($gaCompetitionAttempt, $request->validated('answers'));
        $this->auditLogService->log('ga_competition.submitted', $request->user(), $saved, null, $request);

        return response()->json(['success' => true, 'data' => $saved]);
    }

    public function result(Request $request, GaCompetitionAttempt $gaCompetitionAttempt)
    {
        abort_if($gaCompetitionAttempt->ga_family_id !== $request->user()->id, 403);
        $gaCompetitionAttempt->load('competition');
        $released = $gaCompetitionAttempt->isReleased();

        $answers = $gaCompetitionAttempt->answers()->with(['question.options', 'option'])->get();
        $aqByQid = GaCompetitionAttemptQuestion::query()
            ->where('ga_competition_attempt_id', $gaCompetitionAttempt->id)
            ->get()
            ->keyBy('ga_competition_question_id');

        $payload = $answers->map(function ($answer) use ($released, $aqByQid) {
            $q = $answer->question;
            $aq = $aqByQid->get($answer->ga_competition_question_id);
            $ordered = $q && $q->options
                ? $this->optionsInDisplayOrder($aq?->option_display_order, $q->options)
                : collect();

            $options = $ordered->map(function ($option) use ($released, $aq) {
                $row = [
                    'id' => $option->id,
                    'option_text' => $option->option_text,
                ];
                if ($released) {
                    $snapshotCorrectId = $aq?->correct_option_id;
                    $row['is_correct'] = $snapshotCorrectId !== null
                        ? (int) $option->id === (int) $snapshotCorrectId
                        : (bool) $option->is_correct;
                }

                return $row;
            })->values();

            $row = [
                'question_text' => $q?->body,
                'selected_option_id' => $answer->ga_competition_option_id,
                'options' => $options,
            ];
            if ($released) {
                $row['is_correct'] = $answer->is_correct;
            }

            return $row;
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'attempt' => [
                    'id' => $gaCompetitionAttempt->id,
                    'score' => $gaCompetitionAttempt->score,
                    'total_questions' => $gaCompetitionAttempt->total_questions,
                    'percentage' => $gaCompetitionAttempt->percentage,
                    'status' => $gaCompetitionAttempt->status,
                    'submitted_at' => $gaCompetitionAttempt->submitted_at,
                    'verified_at' => $gaCompetitionAttempt->verified_at,
                    'results_released' => $released,
                    'competition' => [
                        'id' => $gaCompetitionAttempt->competition?->id,
                        'title' => $gaCompetitionAttempt->competition?->title,
                    ],
                ],
                'answers' => $payload,
            ],
        ]);
    }

    private function resumePayload(GaCompetitionAttempt $attempt): \Illuminate\Http\JsonResponse
    {
        $attempt->loadMissing('competition');
        $this->assertAttemptResumable(
            $attempt,
            deadlineColumn: 'deadline_at',
            expiredErrorCode: ApiErrorCode::COMPETITION_ATTEMPT_EXPIRED,
        );

        $questions = GaCompetitionAttemptQuestion::query()
            ->where('ga_competition_attempt_id', $attempt->id)
            ->with('question.options')
            ->orderBy('order_no')
            ->get();

        $end = Carbon::parse($attempt->deadline_at);
        $remaining = max(0, $end->getTimestamp() - now()->getTimestamp());

        return response()->json([
            'success' => true,
            'data' => [
                'attempt' => $attempt,
                'competition' => $attempt->competition,
                'remaining_seconds' => $remaining,
                'questions' => $questions->map(function (GaCompetitionAttemptQuestion $row) {
                    $q = $row->question;
                    $ordered = $this->optionsInDisplayOrder($row->option_display_order, $q->options);

                    return [
                        'question' => [
                            'id' => $q->id,
                            'body' => $q->body,
                            'topic_id' => $row->ga_competition_topic_id,
                            'testament_type' => $row->testament_type,
                            'chapter_number' => $row->chapter_number,
                            'options' => $ordered->map(fn ($o) => [
                                'id' => $o->id,
                                'option_text' => $o->option_text,
                            ])->values(),
                        ],
                    ];
                })->values(),
            ],
        ]);
    }

    /**
     * @param  array<int, mixed>|null  $order
     * @param  \Illuminate\Database\Eloquent\Collection<int, \App\Models\GaCompetitionOption>  $options
     */
    private function optionsInDisplayOrder(?array $order, $options): Collection
    {
        if (! is_array($order) || $order === []) {
            return $options->values();
        }

        $byId = $options->keyBy('id');
        $sorted = collect($order)
            ->map(fn ($id) => $byId->get((int) $id))
            ->filter();

        foreach ($options as $opt) {
            if (! $sorted->contains(fn ($x) => $x && (int) $x->id === (int) $opt->id)) {
                $sorted->push($opt);
            }
        }

        return $sorted->values();
    }
}
