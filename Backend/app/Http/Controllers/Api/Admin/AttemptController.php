<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\ResolvesLmsAdminScope;
use App\Http\Controllers\Controller;
use App\Models\ExamAttempt;
use Illuminate\Http\Request;

class AttemptController extends Controller
{
    use ResolvesLmsAdminScope;

    public function index(Request $request)
    {
        $scope = $this->lmsAdminScope($request);
        $attempts = ExamAttempt::query()
            ->with([
                'exam:id,title',
                'student:id,full_name,student_unique_id',
                'specialLearner:id,full_name,email',
            ])
            ->whereHas('exam.course', fn ($q) => $q->where('admin_interface', $scope))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('special_learner_id'), fn ($q) => $q->where('special_learner_id', $request->integer('special_learner_id')))
            ->when($request->filled('exam_id'), fn ($q) => $q->where('exam_id', $request->integer('exam_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->paginate(min($request->integer('per_page', 10), 50));

        return response()->json(['success' => true, 'data' => $attempts]);
    }

    public function show(Request $request, ExamAttempt $attempt)
    {
        $this->assertAttemptInScope($request, $attempt);

        return response()->json(['success' => true, 'data' => $attempt->load(['exam', 'student:id,full_name,student_unique_id', 'specialLearner:id,full_name,email'])]);
    }

    public function reset(Request $request, ExamAttempt $attempt)
    {
        $this->assertAttemptInScope($request, $attempt);
        $attempt->delete();

        return response()->json(['success' => true, 'message' => 'Attempt removed, student can retake now.']);
    }
}
