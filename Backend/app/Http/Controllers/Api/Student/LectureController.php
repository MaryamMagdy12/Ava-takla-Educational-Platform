<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Concerns\StreamsLectureMedia;
use App\Http\Controllers\Controller;
use App\Models\Lecture;
use App\Models\Student;
use Illuminate\Http\Request;

class LectureController extends Controller
{
    use StreamsLectureMedia;

    public function myLectures(Request $request)
    {
        $student = $request->user();
        $lectures = Lecture::query()
            ->with('course:id,name')
            ->whereHas('course', fn ($q) => $q->where('admin_interface', 'student'))
            ->where('status', 'active')
            ->where(function ($q) use ($student) {
                $q->where('track_id', $student->track_id)
                    ->orWhereIn('id', function ($sub) use ($student) {
                        $sub->select('lecture_id')->from('student_lecture_access')->where('student_id', $student->id);
                    });
            })->paginate(20);

        $lectures->getCollection()->transform(fn (Lecture $l) => $this->studentLecturePayload($l));

        return response()->json(['success' => true, 'data' => $lectures]);
    }

    public function view(Request $request, Lecture $lecture)
    {
        /** @var Student $student */
        $student = $request->user();
        if (! $this->studentCanAccessLecture($student, $lecture)) {
            abort(403);
        }

        return $this->streamLectureMediaResponse($lecture);
    }

    private function studentCanAccessLecture(Student $student, Lecture $lecture): bool
    {
        return Lecture::query()
            ->whereKey($lecture->id)
            ->where('status', 'active')
            ->whereHas('course', fn ($q) => $q->where('admin_interface', 'student'))
            ->where(function ($q) use ($student) {
                $q->where('track_id', $student->track_id)
                    ->orWhereIn('id', function ($sub) use ($student) {
                        $sub->select('lecture_id')->from('student_lecture_access')->where('student_id', $student->id);
                    });
            })
            ->exists();
    }

    /**
     * @return array<string, mixed>
     */
    private function studentLecturePayload(Lecture $l): array
    {
        $base = $l->only([
            'id',
            'title',
            'course_id',
            'track_id',
            'lecture_type',
            'duration_minutes',
            'lecturer_name',
            'status',
            'created_at',
            'updated_at',
        ]);
        $base['course'] = $l->relationLoaded('course') ? $l->getRelation('course') : null;

        if (in_array($l->storage_type, ['external_stream', 'external_file'], true) && $l->external_url) {
            $base['access_url'] = $l->external_url;
        } elseif (($l->storage_type === 'local_private' || $l->storage_type === null) && $l->file_path) {
            $base['access_url'] = $l->studentAccessPath();
        } else {
            $base['access_url'] = null;
        }

        return $base;
    }
}
