<?php

namespace App\Http\Controllers\Api\Family;

use App\Http\Controllers\Concerns\GuardsAttemptResume;
use App\Http\Controllers\Controller;
use App\Http\Requests\Family\StartGaFamilyExamRequest;
use App\Http\Requests\Family\SubmitGaFamilyExamRequest;
use App\Models\GaFamilyExam;
use App\Models\GaFamilyExamAttempt;
use App\Models\GaFamilyExamAttemptQuestion;
use App\Services\AuditLogService;
use App\Services\Competitions\GaFamilyExamEngineService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class FamilyExamController extends Controller
{
    use GuardsAttemptResume;

    public function __construct(
        private readonly GaFamilyExamEngineService $engine,
        private readonly AuditLogService $auditLogService,
    ) {}

    public function index(Request $request)
    {
        $now = now();
        $paginator = GaFamilyExam::query()
            ->where('status', 'published')
            ->orderByDesc('id')
            ->paginate(20);

        $examIds = $paginator->getCollection()->pluck('id');
        $attempts = GaFamilyExamAttempt::query()
            ->where('family_id', $request->user()->id)
            ->whereIn('exam_id', $examIds)
            ->get()
            ->keyBy('exam_id');

        $paginator->getCollection()->transform(function (GaFamilyExam $exam) use ($attempts, $now) {
            $isOpenNow = $now->between(Carbon::parse($exam->available_from), Carbon::parse($exam->available_to));

            return [
                'id' => $exam->id,
                'title' => $exam->title,
                'description' => $exam->description,
                'duration_minutes' => $exam->duration_minutes,
                'question_count' => $exam->question_count,
                'available_from' => $exam->available_from,
                'available_to' => $exam->available_to,
                'is_open_now' => $isOpenNow,
                'attempt' => $attempts[$exam->id] ?? null,
            ];
        });

        return response()->json(['success' => true, 'data' => $paginator]);
    }

    public function myAttempt(StartGaFamilyExamRequest $request, GaFamilyExam $gaFamilyExam)
    {
        $attempt = GaFamilyExamAttempt::query()
            ->where('family_id', $request->user()->id)
            ->where('exam_id', $gaFamilyExam->id)
            ->firstOrFail();

        return $this->resumePayload($attempt);
    }

    public function start(StartGaFamilyExamRequest $request, GaFamilyExam $gaFamilyExam)
    {
        $attempt = $this->engine->startAttempt($gaFamilyExam, $request->user());
        $this->auditLogService->log('ga_family_exam.started', $request->user(), $attempt, null, $request);

        return $this->resumePayload($attempt);
    }

    public function resume(StartGaFamilyExamRequest $request, GaFamilyExamAttempt $gaFamilyExamAttempt)
    {
        abort_if((int) $gaFamilyExamAttempt->family_id !== (int) $request->user()->id, 403);

        return $this->resumePayload($gaFamilyExamAttempt);
    }

    public function submit(SubmitGaFamilyExamRequest $request, GaFamilyExamAttempt $gaFamilyExamAttempt)
    {
        abort_if((int) $gaFamilyExamAttempt->family_id !== (int) $request->user()->id, 403);
        $saved = $this->engine->submitAttempt($gaFamilyExamAttempt, $request->validated('answers'));
        $this->auditLogService->log('ga_family_exam.submitted', $request->user(), $saved, null, $request);

        return response()->json(['success' => true, 'data' => $saved]);
    }

    public function result(StartGaFamilyExamRequest $request, GaFamilyExamAttempt $gaFamilyExamAttempt)
    {
        abort_if((int) $gaFamilyExamAttempt->family_id !== (int) $request->user()->id, 403);
        $gaFamilyExamAttempt->load('exam');
        $showDetails = (bool) ($gaFamilyExamAttempt->exam?->show_result_immediately ?? true);

        $answers = $gaFamilyExamAttempt->answers()->with(['question.options', 'selectedOption'])->get();
        $aqByQid = GaFamilyExamAttemptQuestion::query()
            ->where('attempt_id', $gaFamilyExamAttempt->id)
            ->get()
            ->keyBy('question_id');

        $payload = $answers->map(function ($answer) use ($showDetails, $aqByQid) {
            $q = $answer->question;
            $aq = $aqByQid->get($answer->question_id);
            $ordered = $q && $q->options ? $this->optionsInDisplayOrder($aq?->option_display_order, $q->options) : collect();
            $options = $ordered->map(function ($option) use ($showDetails, $aq) {
                $row = ['id' => $option->id, 'option_text' => $option->option_text];
                if ($showDetails) {
                    $snapshotCorrectId = $aq?->correct_option_id;
                    $row['is_correct'] = $snapshotCorrectId !== null
                        ? (int) $option->id === (int) $snapshotCorrectId
                        : (bool) $option->is_correct;
                }

                return $row;
            })->values();

            $row = [
                'question_id' => $q?->id,
                'question_text' => $q?->question_text,
                'selected_option_id' => $answer->selected_option_id,
                'options' => $options,
                'feedback' => $showDetails ? $answer->feedback : null,
            ];
            if ($showDetails) {
                $row['is_correct'] = $answer->is_correct;
            }

            return $row;
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'attempt' => [
                    'id' => $gaFamilyExamAttempt->id,
                    'score' => $gaFamilyExamAttempt->score,
                    'max_score' => $gaFamilyExamAttempt->max_score,
                    'percentage' => $gaFamilyExamAttempt->percentage,
                    'status' => $gaFamilyExamAttempt->status,
                    'submitted_at' => $gaFamilyExamAttempt->submitted_at,
                    'show_result_immediately' => $showDetails,
                    'exam' => [
                        'id' => $gaFamilyExamAttempt->exam?->id,
                        'title' => $gaFamilyExamAttempt->exam?->title,
                        'show_correct_answers_after_submit' => $showDetails,
                    ],
                ],
                'answers' => $payload,
            ],
        ]);
    }

    private function resumePayload(GaFamilyExamAttempt $attempt): \Illuminate\Http\JsonResponse
    {
        $attempt->loadMissing('exam');
        $this->assertAttemptResumable($attempt);

        $questions = GaFamilyExamAttemptQuestion::query()
            ->where('attempt_id', $attempt->id)
            ->with('question.options')
            ->orderBy('question_order')
            ->get();
        $remaining = max(0, Carbon::parse($attempt->allowed_end_time)->getTimestamp() - now()->getTimestamp());

        return response()->json([
            'success' => true,
            'data' => [
                'attempt' => $attempt,
                'exam' => $attempt->exam,
                'remaining_seconds' => $remaining,
                'questions' => $questions->map(function (GaFamilyExamAttemptQuestion $row) {
                    $q = $row->question;
                    $ordered = $this->optionsInDisplayOrder($row->option_display_order, $q->options);

                    return [
                        'question' => [
                            'id' => $q->id,
                            'question_text' => $q->question_text,
                            'testament_type' => $row->testament_type,
                            'chapter_number' => $row->chapter_number,
                            'options' => $ordered->map(fn ($o) => ['id' => $o->id, 'option_text' => $o->option_text])->values(),
                        ],
                    ];
                })->values(),
            ],
        ]);
    }

    private function optionsInDisplayOrder(?array $order, $options): Collection
    {
        if (! is_array($order) || $order === []) {
            return $options->values();
        }
        $byId = $options->keyBy('id');
        $sorted = collect($order)->map(fn ($id) => $byId->get((int) $id))->filter();
        foreach ($options as $opt) {
            if (! $sorted->contains(fn ($x) => $x && (int) $x->id === (int) $opt->id)) {
                $sorted->push($opt);
            }
        }

        return $sorted->values();
    }
}
