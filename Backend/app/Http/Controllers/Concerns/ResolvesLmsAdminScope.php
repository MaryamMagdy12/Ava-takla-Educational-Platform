<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Book;
use App\Models\Course;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Level;
use App\Models\Lecture;
use App\Models\Question;
use App\Models\Track;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

trait ResolvesLmsAdminScope
{
    protected function lmsAdminScope(Request $request): string
    {
        $scope = $request->attributes->get('lms_admin_scope');
        abort_if(! is_string($scope) || $scope === '', 403, 'Missing LMS admin scope.');

        return $scope;
    }

    protected function assertTrackInScope(Request $request, Track $track): void
    {
        abort_if($track->admin_interface !== $this->lmsAdminScope($request), 404);
    }

    protected function assertLevelInScope(Request $request, Level $level): void
    {
        abort_if($level->admin_interface !== $this->lmsAdminScope($request), 404);
    }

    protected function assertCourseInScope(Request $request, Course $course): void
    {
        abort_if($course->admin_interface !== $this->lmsAdminScope($request), 404);
    }

    /**
     * When a course is bound to a track, books/lectures/exams/questions for that course must use the same track_id.
     * Special LMS: courses are not tied to tracks; content uses track_id on its own rows.
     */
    protected function assertLmsContentTrackMatchesCourse(Request $request, int $courseId, ?int $trackId): void
    {
        $course = Course::query()->find($courseId);
        if (! $course) {
            return;
        }
        $this->assertCourseInScope($request, $course);
        if ($course->admin_interface === 'special') {
            return;
        }
        if ($course->track_id === null) {
            return;
        }
        if ($trackId === null || (int) $trackId !== (int) $course->track_id) {
            abort(422, 'track_id must match the course track.');
        }
    }

    protected function assertNoLmsChildrenBlockCourseTrackChange(Course $course, int $newTrackId): void
    {
        if ($course->admin_interface === 'special') {
            return;
        }
        foreach (['lectures', 'books', 'exams', 'questions'] as $table) {
            $exists = DB::table($table)
                ->where('course_id', $course->id)
                ->whereNotNull('track_id')
                ->where('track_id', '!=', $newTrackId)
                ->exists();
            if ($exists) {
                abort(422, 'Cannot change course track while content uses another track.');
            }
        }
    }

    protected function assertCourseAndTrackInScope(Request $request, int $courseId, ?int $trackId): void
    {
        $scope = $this->lmsAdminScope($request);
        $courseOk = Course::query()->whereKey($courseId)->where('admin_interface', $scope)->exists();
        abort_if(! $courseOk, 422, 'Course must belong to this admin interface.');
        if ($trackId === null) {
            return;
        }
        $trackOk = Track::query()->whereKey($trackId)->where('admin_interface', $scope)->exists();
        abort_if(! $trackOk, 422, 'Track must belong to this admin interface.');
    }

    protected function assertQuestionInScope(Request $request, Question $question): void
    {
        $question->loadMissing('course');
        abort_if(! $question->course, 404);
        $this->assertCourseInScope($request, $question->course);
    }

    protected function assertExamInScope(Request $request, Exam $exam): void
    {
        $exam->loadMissing('course');
        abort_if(! $exam->course, 404);
        $this->assertCourseInScope($request, $exam->course);
    }

    protected function assertBookInScope(Request $request, Book $book): void
    {
        $book->loadMissing('course');
        abort_if(! $book->course, 404);
        $this->assertCourseInScope($request, $book->course);
    }

    protected function assertLectureInScope(Request $request, Lecture $lecture): void
    {
        $lecture->loadMissing('course');
        abort_if(! $lecture->course, 404);
        $this->assertCourseInScope($request, $lecture->course);
    }

    protected function assertAttemptInScope(Request $request, ExamAttempt $attempt): void
    {
        $attempt->loadMissing('exam.course');
        abort_if(! $attempt->exam || ! $attempt->exam->course, 404);
        $this->assertCourseInScope($request, $attempt->exam->course);
    }
}
