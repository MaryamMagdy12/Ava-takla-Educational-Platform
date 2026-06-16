<?php

namespace App\Http\Controllers\Api\Special;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\Course;
use App\Models\Exam;
use App\Models\Lecture;
use App\Support\PublicCatalogCache;
use Illuminate\Support\Facades\Cache;

class SpecialCatalogController extends Controller
{
    private const INTERFACE = 'special';

    public function index()
    {
        $courses = Cache::remember(PublicCatalogCache::SPECIAL_COURSES_KEY, 300, function () {
            return Course::query()
                ->where('admin_interface', self::INTERFACE)
                ->where('status', 'active')
                ->withCount([
                    'books',
                    'lectures',
                    'exams as published_exams_count' => fn ($q) => $q
                        ->where('admin_interface', self::INTERFACE)
                        ->where('status', 'published'),
                ])
                ->orderBy('name')
                ->get()
                ->map(fn (Course $course) => $this->serializeCourseSummary($course));
        });

        return response()
            ->json(['success' => true, 'data' => $courses])
            ->header('Cache-Control', 'public, max-age=300');
    }

    public function show(int $course)
    {
        $model = Course::query()
            ->where('admin_interface', self::INTERFACE)
            ->where('status', 'active')
            ->whereKey($course)
            ->with([
                'exams' => fn ($q) => $q
                    ->where('admin_interface', self::INTERFACE)
                    ->where('status', 'published')
                    ->orderBy('id')
                    ->select(['id', 'course_id', 'title', 'duration_minutes', 'question_count', 'status']),
                'books' => fn ($q) => $q->orderBy('id')->select(['id', 'course_id', 'title']),
                'lectures' => fn ($q) => $q
                    ->where('status', 'active')
                    ->orderBy('id')
                    ->select(['id', 'course_id', 'title', 'lecture_type', 'duration_minutes', 'lecturer_name', 'status']),
            ])
            ->first();
        if (! $model) {
            return response()->json(['success' => false, 'message' => 'Course not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->serializeCourseDetail($model),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeCourseSummary(Course $course): array
    {
        $examCount = (int) ($course->published_exams_count ?? 0);
        $bookCount = (int) ($course->books_count ?? 0);
        $lectureCount = (int) ($course->lectures_count ?? 0);

        return [
            'slug' => (string) $course->id,
            'title' => $course->name,
            'tagline' => '',
            'summary' => (string) ($course->description ?? ''),
            'unit_count' => $bookCount + $lectureCount,
            'books_count' => $bookCount,
            'lectures_count' => $lectureCount,
            'exams_count' => $examCount,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeCourseDetail(Course $course): array
    {
        $summary = $this->serializeCourseSummary($course);

        $exams = $course->relationLoaded('exams')
            ? $course->exams
            : collect();
        $books = $course->relationLoaded('books')
            ? $course->books
            : collect();
        $lectures = $course->relationLoaded('lectures')
            ? $course->lectures
            : collect();

        $exams = $exams
            ->map(fn (Exam $e) => [
                'id' => (string) $e->id,
                'title' => $e->title,
                'duration_minutes' => (int) $e->duration_minutes,
                'type' => 'اختيار من متعدد',
            ])
            ->values()
            ->all();

        $books = $books
            ->map(fn (Book $b) => [
                'id' => (string) $b->id,
                'title' => $b->title,
            ])
            ->values()
            ->all();

        $lectures = $lectures
            ->map(function (Lecture $l) {
                $row = [
                    'id' => (string) $l->id,
                    'title' => $l->title,
                    'lecture_type' => $l->lecture_type,
                ];
                if (isset($l->duration_minutes)) {
                    $row['duration_minutes'] = (int) $l->duration_minutes;
                }
                if (isset($l->lecturer_name)) {
                    $row['lecturer_name'] = (string) $l->lecturer_name;
                }

                return $row;
            })
            ->values()
            ->all();

        return $summary + [
            'exams' => $exams,
            'books' => $books,
            'lectures' => $lectures,
        ];
    }
}
