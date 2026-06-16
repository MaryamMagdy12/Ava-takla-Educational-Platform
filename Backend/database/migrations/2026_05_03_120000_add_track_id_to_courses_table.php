<?php

use App\Models\Course;
use App\Models\Track;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('courses') || ! Schema::hasTable('tracks')) {
            return;
        }

        if (! Schema::hasColumn('courses', 'track_id')) {
            Schema::table('courses', function (Blueprint $table) {
                $table->foreignId('track_id')
                    ->nullable()
                    ->after('admin_interface')
                    ->constrained('tracks')
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();
            });
        }

        $this->backfillCourseTracks();

        if (Schema::hasIndex('courses', 'courses_admin_interface_name_unique')) {
            Schema::table('courses', function (Blueprint $table) {
                $table->dropUnique('courses_admin_interface_name_unique');
            });
        }

        if (! Schema::hasIndex('courses', 'courses_admin_interface_track_id_name_unique')) {
            Schema::table('courses', function (Blueprint $table) {
                $table->unique(['admin_interface', 'track_id', 'name'], 'courses_admin_interface_track_id_name_unique');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('courses')) {
            return;
        }

        if (Schema::hasIndex('courses', 'courses_admin_interface_track_id_name_unique')) {
            Schema::table('courses', function (Blueprint $table) {
                $table->dropUnique('courses_admin_interface_track_id_name_unique');
            });
        }

        if (Schema::hasColumn('courses', 'track_id')) {
            Schema::table('courses', function (Blueprint $table) {
                $table->dropConstrainedForeignId('track_id');
            });
        }

        if (! Schema::hasIndex('courses', 'courses_admin_interface_name_unique')) {
            Schema::table('courses', function (Blueprint $table) {
                $table->unique(['admin_interface', 'name'], 'courses_admin_interface_name_unique');
            });
        }
    }

    private function backfillCourseTracks(): void
    {
        if (! Schema::hasColumn('courses', 'track_id')) {
            return;
        }

        Course::query()->whereNull('track_id')->orderBy('id')->chunkById(100, function ($courses) {
            foreach ($courses as $course) {
                $tid = DB::table('lectures')
                    ->where('course_id', $course->id)
                    ->whereNotNull('track_id')
                    ->orderBy('id')
                    ->value('track_id');
                if (! $tid) {
                    $tid = DB::table('books')
                        ->where('course_id', $course->id)
                        ->whereNotNull('track_id')
                        ->orderBy('id')
                        ->value('track_id');
                }
                if (! $tid) {
                    $tid = DB::table('exams')
                        ->where('course_id', $course->id)
                        ->whereNotNull('track_id')
                        ->orderBy('id')
                        ->value('track_id');
                }
                if (! $tid) {
                    $tid = DB::table('questions')
                        ->where('course_id', $course->id)
                        ->whereNotNull('track_id')
                        ->orderBy('id')
                        ->value('track_id');
                }
                if (! $tid) {
                    $tid = Track::query()
                        ->where('admin_interface', $course->admin_interface)
                        ->orderBy('id')
                        ->value('id');
                }
                if ($tid) {
                    $course->forceFill(['track_id' => (int) $tid])->saveQuietly();
                }
            }
        });
    }
};
