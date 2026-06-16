<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Lecture;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function summary(Request $request)
    {
        $student = $request->user();
        return response()->json([
            'success' => true,
            'data' => [
                'full_name' => $student->full_name,
                'student_unique_id' => $student->student_unique_id,
                'level_id' => $student->level_id,
                'available_exams' => Exam::query()->where('track_id', $student->track_id)->where('status', 'published')->count(),
                'available_books' => Book::query()->where('track_id', $student->track_id)->where('status', 'active')->count(),
                'available_lectures' => Lecture::query()->where('track_id', $student->track_id)->where('status', 'active')->count(),
            ],
        ]);
    }

    public function examHistory(Request $request)
    {
        $student = $request->user();
        $attempts = ExamAttempt::query()
            ->with(['exam.course:id,name'])
            ->where('student_id', $student->id)
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->paginate(min($request->integer('per_page', 10), 50));

        $attempts->getCollection()->transform(function (ExamAttempt $attempt) {
                return [
                    'id' => $attempt->id,
                    'status' => $attempt->status,
                    'score' => $attempt->score,
                    'total_questions' => $attempt->total_questions,
                    'percentage' => $attempt->percentage,
                    'is_passed' => $attempt->is_passed,
                    'submitted_at' => $attempt->submitted_at,
                    'started_at' => $attempt->started_at,
                    'exam' => [
                        'id' => $attempt->exam?->id,
                        'title' => $attempt->exam?->title ?? 'الامتحان',
                        'course' => $attempt->exam?->course?->name ?? 'المقرر',
                        'show_correct_answers_after_submit' => (bool) ($attempt->exam?->show_correct_answers_after_submit ?? false),
                    ],
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $attempts,
        ]);
    }
}
