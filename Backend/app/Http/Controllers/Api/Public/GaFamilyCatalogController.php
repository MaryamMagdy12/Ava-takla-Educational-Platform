<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\GaLecture;
use App\Support\PublicCatalogCache;
use Illuminate\Support\Facades\Cache;
use NumberFormatter;

class GaFamilyCatalogController extends Controller
{
    private const INTERFACE = 'general_assembly';

    public function courses()
    {
        $courses = Cache::remember(PublicCatalogCache::GA_COURSES_KEY, 300, function () {
            return Course::query()
                ->where('admin_interface', self::INTERFACE)
                ->where('status', 'active')
                ->withCount(['lectures', 'books'])
                ->orderBy('name')
                ->get()
                ->map(fn (Course $course) => $this->serializeFamilyCatalogCourse($course))
                ->values()
                ->all();
        });

        return response()
            ->json(['success' => true, 'data' => $courses])
            ->header('Cache-Control', 'public, max-age=300');
    }

    /**
     * Published GA library lectures (admin «الكتب والمحاضرات») for the family portal.
     *
     * @return array<int, array{id: string, title: string, summary: string, duration_label: ?string, video_url: ?string, video_file_url: ?string}>
     */
    public function publishedGaLectures()
    {
        $rows = Cache::remember(PublicCatalogCache::GA_LECTURES_KEY, 300, function () {
            return GaLecture::query()
                ->where('status', 'published')
                ->orderBy('sort_order')
                ->orderByDesc('id')
                ->get()
                ->map(fn (GaLecture $l) => [
                    'id' => (string) $l->id,
                    'title' => $l->title,
                    'summary' => (string) ($l->summary ?? ''),
                    'duration_label' => $l->duration_label,
                    'video_url' => $l->video_url,
                    'video_file_url' => $l->status === 'published' ? $l->familyAccessPath() : null,
                    'access_url' => $l->status === 'published' ? $l->familyAccessPath() : null,
                ])
                ->values()
                ->all();
        });

        return response()
            ->json(['success' => true, 'data' => $rows])
            ->header('Cache-Control', 'public, max-age=300');
    }

    /**
     * @return array{id: string, title: string, summary: string, duration_label: string, level: string}
     */
    private function serializeFamilyCatalogCourse(Course $course): array
    {
        return [
            'id' => (string) $course->id,
            'title' => $course->name,
            'summary' => (string) ($course->description ?? ''),
            'duration_label' => $this->formatCatalogDurationLabel($course),
            'level' => 'للعائلات',
        ];
    }

    private function formatCatalogDurationLabel(Course $course): string
    {
        $lectures = (int) ($course->lectures_count ?? 0);
        $books = (int) ($course->books_count ?? 0);

        if ($lectures > 0) {
            return $this->formatArabicInteger($lectures).' جلسات';
        }
        if ($books > 0) {
            return $this->formatArabicInteger($books).' كتب';
        }

        return 'لا محتوى مسجّل بعد';
    }

    private function formatArabicInteger(int $value): string
    {
        if (extension_loaded('intl')) {
            $fmt = new NumberFormatter('ar', NumberFormatter::DECIMAL);

            return (string) $fmt->format($value);
        }

        return (string) $value;
    }

    public function examPreviews()
    {
        $rows = config('ga_family_catalog.exam_previews', []);

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }
}
