<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\ResolvesLmsAdminScope;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreExamRequest;
use App\Models\Exam;
use App\Services\ExamEngineService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ExamController extends Controller
{
    use ResolvesLmsAdminScope;

    public function __construct(private readonly ExamEngineService $examEngineService) {}

    public function index(Request $request)
    {
        $scope = $this->lmsAdminScope($request);

        return response()->json([
            'success' => true,
            'data' => Exam::query()
                ->with('course:id,name')
                ->whereHas('course', fn ($q) => $q->where('admin_interface', $scope))
                ->orderByDesc('id')
                ->paginate(20),
        ]);
    }

    public function show(Request $request, Exam $exam)
    {
        $this->assertExamInScope($request, $exam);
        $exam->load([
            'examQuestions' => fn ($q) => $q->orderBy('position'),
            'examQuestions.question.options',
        ]);

        return response()->json([
            'success' => true, 'data' => $exam,
        ]);
    }

    public function store(StoreExamRequest $request)
    {
        $scope = $this->lmsAdminScope($request);
        $validated = $request->validated();
        $trackId = array_key_exists('track_id', $validated) && $validated['track_id'] !== null
            ? (int) $validated['track_id']
            : null;
        $this->assertCourseAndTrackInScope($request, (int) $validated['course_id'], $trackId);
        $this->assertLmsContentTrackMatchesCourse($request, (int) $validated['course_id'], $trackId);
        $validated['admin_interface'] = $scope;
        $exam = Exam::query()->create($validated);
        if ($exam->status === 'published') {
            $this->examEngineService->buildExamQuestionPool($exam);
        }

        return response()->json(['success' => true, 'data' => $exam->fresh()], 201);
    }

    public function update(Request $request, Exam $exam)
    {
        $this->assertExamInScope($request, $exam);
        $scope = $this->lmsAdminScope($request);
        $data = $request->validate([
            'title' => 'sometimes|string',
            'course_id' => [
                'sometimes',
                'integer',
                Rule::exists('courses', 'id')->where(fn ($q) => $q->where('admin_interface', $scope)),
            ],
            'track_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('tracks', 'id')->where(fn ($q) => $q->where('admin_interface', $scope)),
            ],
            'duration_minutes' => 'sometimes|integer|min:1',
            'question_count' => 'sometimes|integer|min:1',
            'available_from' => 'sometimes|date',
            'available_to' => 'sometimes|date',
            'status' => 'sometimes|in:draft,published,closed',
            'easy_count' => 'nullable|integer|min:0',
            'medium_count' => 'nullable|integer|min:0',
            'hard_count' => 'nullable|integer|min:0',
            'pass_mark' => 'nullable|integer|min:0|max:100',
            'show_correct_answers_after_submit' => 'nullable|boolean',
        ]);
        $newCourseId = (int) ($data['course_id'] ?? $exam->course_id);
        $newTrackId = array_key_exists('track_id', $data) ? $data['track_id'] : $exam->track_id;
        $newTrackId = $newTrackId === null ? null : (int) $newTrackId;
        if (isset($data['course_id']) || array_key_exists('track_id', $data)) {
            $this->assertCourseAndTrackInScope($request, $newCourseId, $newTrackId);
            $this->assertLmsContentTrackMatchesCourse($request, $newCourseId, $newTrackId);
        }
        if (! empty($data)) {
            $data['admin_interface'] = $scope;
        }
        $exam->update($data);

        $poolKeys = ['question_count', 'course_id', 'track_id', 'easy_count', 'medium_count', 'hard_count'];
        $becamePublished = $exam->wasChanged('status') && $exam->status === 'published';
        if ($exam->status === 'published' && ($becamePublished || $exam->wasChanged($poolKeys))) {
            $this->examEngineService->buildExamQuestionPool($exam);
        }

        return response()->json(['success' => true, 'data' => $exam->fresh()]);
    }

    public function destroy(Request $request, Exam $exam)
    {
        $this->assertExamInScope($request, $exam);
        $exam->forceDelete();

        return response()->json(['success' => true]);
    }

    public function publish(Request $request, Exam $exam)
    {
        $this->assertExamInScope($request, $exam);
        $exam->update(['status' => 'published']);
        $this->examEngineService->buildExamQuestionPool($exam->fresh());

        return response()->json(['success' => true, 'data' => $exam->fresh()]);
    }

    public function unpublish(Request $request, Exam $exam)
    {
        $this->assertExamInScope($request, $exam);
        $exam->update(['status' => 'draft']);

        return response()->json(['success' => true, 'data' => $exam]);
    }

    public function assignToStudent(Request $request, Exam $exam)
    {
        $this->assertExamInScope($request, $exam);
        $data = $request->validate(['student_id' => 'required|exists:students,id']);
        DB::table('student_exam_access')->updateOrInsert($data + ['exam_id' => $exam->id],
            ['updated_at' => now(), 'created_at' => now()]);

        return response()->json(['success' => true]);
    }

    public function unassignFromStudent(Request $request, Exam $exam)
    {
        $this->assertExamInScope($request, $exam);
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
        ]);
        DB::table('student_exam_access')->where($data + [
            'exam_id' => $exam->id])->delete();

        return response()->json(['success' => true]);
    }
}
