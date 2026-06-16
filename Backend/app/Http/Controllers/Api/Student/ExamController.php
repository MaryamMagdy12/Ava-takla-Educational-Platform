<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Concerns\GuardsAttemptResume;
use App\Http\Controllers\Controller;
use App\Models\AttemptAnswer;
use App\Models\AttemptQuestion;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Student;
use App\Services\ExamEngineService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ExamController extends Controller
{
    use GuardsAttemptResume;

    public function __construct(private readonly ExamEngineService $examEngineService)
    {
    }

    public function availableExams(Request $request)
    {
        $student = $request->user();
        $paginator = Exam::query()
            ->with('course:id,name')
            ->whereHas('course', fn ($q) => $q->where('admin_interface', 'student'))
            ->where('status', 'published')
            ->where(function ($q) use ($student) {
                $q->where('track_id', $student->track_id)
                    ->orWhereIn('id', function ($sub) use ($student) {
                        $sub->select('exam_id')->from('student_exam_access')->where('student_id', $student->id);
                    });
            })
            ->orderByDesc('id')
            ->paginate(20);

        $examIds = $paginator->getCollection()->pluck('id');
        $attempts = ExamAttempt::query()
            ->where('student_id', $student->id)
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
        $this->ensureExamAccess($request->user(), $exam);
        $attempt = ExamAttempt::query()
            ->where('student_id', $request->user()->id)
            ->where('exam_id', $exam->id)
            ->firstOrFail();

        return $this->resume($request, $attempt);
    }

    public function start(Request $request, Exam $exam)
    {
        $this->ensureExamAccess($request->user(), $exam);
        $attempt = $this->examEngineService->startAttempt($exam, $request->user());
        $attempt->load('exam.course');

        return $this->resume($request, $attempt);
    }

    public function resume(Request $request, ExamAttempt $attempt)
    {
        abort_if($attempt->student_id !== $request->user()->id, 403, 'Not your attempt.');
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
        abort_if($attempt->student_id !== $request->user()->id, 403, 'Not your attempt.');
        $data = $request->validate(['answers' => 'required|array', 'answers.*.question_id' => 'required|integer', 'answers.*.selected_option_id' => 'nullable|integer']);
        $saved = $this->examEngineService->submitAttempt($attempt, $data['answers']);

        return response()->json(['success' => true, 'data' => $saved]);
    }

    public function result(Request $request, ExamAttempt $attempt)
    {
        abort_if($attempt->student_id !== $request->user()->id, 403, 'Not your attempt.');
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

    private function ensureExamAccess(Student $student, Exam $exam): void
    {
        $exam->loadMissing('course');
        $studentExam = $exam->course && $exam->course->admin_interface === 'student';
        $ok = $studentExam
            && $exam->status === 'published'
            && (
                $exam->track_id === $student->track_id
                || DB::table('student_exam_access')
                    ->where('student_id', $student->id)
                    ->where('exam_id', $exam->id)
                    ->exists()
            );
        abort_if(! $ok, 403, 'You cannot access this exam.');
    }
}

