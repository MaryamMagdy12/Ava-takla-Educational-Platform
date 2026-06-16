<?php

namespace App\Http\Controllers\Api\Special;

use App\Http\Controllers\Concerns\GuardsAttemptResume;
use App\Http\Controllers\Controller;
use App\Models\AttemptAnswer;
use App\Models\AttemptQuestion;
use App\Models\Course;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\SpecialLearner;
use App\Services\ExamEngineService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class SpecialExamAttemptController extends Controller
{
    use GuardsAttemptResume;

    public function __construct(private readonly ExamEngineService $examEngineService)
    {
    }

    public function index(Request $request)
    {
        /** @var SpecialLearner $learner */
        $learner = $request->user();

        $courseIds = Course::query()
            ->where('admin_interface', 'special')
            ->where('status', 'active')
            ->pluck('id');

        $paginator = Exam::query()
            ->with('course:id,name')
            ->whereIn('course_id', $courseIds)
            ->where('admin_interface', 'special')
            ->where('status', 'published')
            ->orderByDesc('id')
            ->paginate(20);

        $examIds = $paginator->getCollection()->pluck('id');
        $attempts = ExamAttempt::query()
            ->where('special_learner_id', $learner->id)
            ->whereIn('exam_id', $examIds)
            ->get()
            ->keyBy('exam_id');

        $paginator->getCollection()->transform(function (Exam $exam) use ($attempts) {
            return [
                'id' => $exam->id,
                'title' => $exam->title,
                'duration_minutes' => $exam->duration_minutes,
                'question_count' => $exam->question_count,
                'available_from' => $exam->available_from,
                'available_to' => $exam->available_to,
                'course' => $exam->course?->name ?? 'Course',
                'attempt' => $attempts[$exam->id] ?? null,
            ];
        });

        return response()->json(['success' => true, 'data' => $paginator]);
    }

    public function myAttempt(Request $request, Exam $exam)
    {
        $this->ensureSpecialExamAccess($exam);
        $attempt = ExamAttempt::query()
            ->where('special_learner_id', $request->user()->id)
            ->where('exam_id', $exam->id)
            ->firstOrFail();

        return $this->resume($request, $attempt);
    }

    public function start(Request $request, Exam $exam)
    {
        $this->ensureSpecialExamAccess($exam);
        $attempt = $this->examEngineService->startAttempt($exam, $request->user());
        $attempt->load('exam.course');

        return $this->resume($request, $attempt);
    }

    public function resume(Request $request, ExamAttempt $attempt)
    {
        $this->ensureSpecialAttemptOwner($request->user(), $attempt);
        $attempt->loadMissing('exam.course');
        $this->assertAttemptResumable($attempt);

        $questions = AttemptQuestion::query()
            ->where('exam_attempt_id', $attempt->id)
            ->with('question.options')
            ->orderBy('order_no')
            ->get();
        $end = Carbon::parse($attempt->allowed_end_time);
        $remaining = max(0, $end->getTimestamp() - now()->getTimestamp());

        return response()->json([
            'success' => true,
            'data' => [
                'attempt' => $attempt,
                'exam' => $attempt->exam,
                'remaining_seconds' => $remaining,
                'questions' => $questions->map(function (AttemptQuestion $attemptQuestion) {
                    $question = $attemptQuestion->question;
                    $ordered = $this->optionsInDisplayOrder(
                        $attemptQuestion->option_display_order,
                        $question->options
                    );

                    return [
                        'question' => [
                            'id' => $question->id,
                            'question_text' => $question->question_text,
                            'options' => $ordered->map(fn ($option) => [
                                'id' => $option->id,
                                'option_text' => $option->option_text,
                            ])->values(),
                        ],
                    ];
                })->values(),
            ],
        ]);
    }

    public function submit(Request $request, ExamAttempt $attempt)
    {
        $this->ensureSpecialAttemptOwner($request->user(), $attempt);
        $data = $request->validate(['answers' => 'required|array', 'answers.*.question_id' => 'required|integer', 'answers.*.selected_option_id' => 'nullable|integer']);
        $saved = $this->examEngineService->submitAttempt($attempt, $data['answers']);

        return response()->json(['success' => true, 'data' => $saved]);
    }

    public function result(Request $request, ExamAttempt $attempt)
    {
        $this->ensureSpecialAttemptOwner($request->user(), $attempt);
        $attempt->load('exam');
        $answers = AttemptAnswer::query()
            ->where('exam_attempt_id', $attempt->id)
            ->with(['question.options'])
            ->get();

        $attemptQuestionsByQuestionId = AttemptQuestion::query()
            ->where('exam_attempt_id', $attempt->id)
            ->get()
            ->keyBy('question_id');

        return response()->json([
            'success' => true,
            'data' => [
                'attempt' => [
                    'id' => $attempt->id,
                    'score' => $attempt->score,
                    'total_questions' => $attempt->total_questions,
                    'percentage' => $attempt->percentage,
                    'is_passed' => $attempt->is_passed,
                    'status' => $attempt->status,
                    'submitted_at' => $attempt->submitted_at,
                    'exam' => [
                        'id' => $attempt->exam?->id,
                        'title' => $attempt->exam?->title,
                        'show_correct_answers_after_submit' => (bool) ($attempt->exam?->show_correct_answers_after_submit ?? false),
                    ],
                ],
                'answers' => $answers->map(function (AttemptAnswer $answer) use ($attemptQuestionsByQuestionId, $attempt) {
                    $q = $answer->question;
                    $aq = $attemptQuestionsByQuestionId->get($answer->question_id);
                    $showCorrect = (bool) ($attempt->exam?->show_correct_answers_after_submit ?? false);
                    $snapshotCorrectId = $aq?->correct_option_id;
                    $ordered = $q && $q->options
                        ? $this->optionsInDisplayOrder($aq?->option_display_order, $q->options)
                        : collect();

                    return [
                        'question_text' => $q?->question_text,
                        'selected_option_id' => $answer->selected_option_id,
                        'is_correct' => $answer->is_correct,
                        'feedback' => $answer->feedback,
                        'options' => $ordered->map(fn ($option) => [
                            'id' => $option->id,
                            'option_text' => $option->option_text,
                            'is_correct' => $showCorrect
                                ? ($snapshotCorrectId !== null
                                    ? (int) $option->id === (int) $snapshotCorrectId
                                    : (bool) $option->is_correct)
                                : null,
                        ])->values(),
                    ];
                })->values(),
            ],
        ]);
    }

    /**
     * @param  array<int, mixed>|null  $order
     * @param  \Illuminate\Database\Eloquent\Collection<int, \App\Models\QuestionOption>  $options
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

    private function ensureSpecialExamAccess(Exam $exam): void
    {
        $exam->loadMissing('course');
        $courseIds = Course::query()
            ->where('admin_interface', 'special')
            ->where('status', 'active')
            ->pluck('id');

        $ok = $exam->course
            && $exam->course->admin_interface === 'special'
            && $exam->admin_interface === 'special'
            && $exam->status === 'published'
            && $courseIds->contains((int) $exam->course_id);

        abort_if(! $ok, 403, 'You cannot access this exam.');
    }

    private function ensureSpecialAttemptOwner(SpecialLearner $learner, ExamAttempt $attempt): void
    {
        abort_if(
            (int) $attempt->special_learner_id !== (int) $learner->id,
            403,
            'Not your attempt.',
        );
    }
}
