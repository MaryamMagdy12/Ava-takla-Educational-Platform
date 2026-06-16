<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Special LMS: courses are catalog entries; tracks own lectures/exams/questions, not the course row.
     * Student LMS: keep track_id on courses; uniqueness enforced in CourseController (not DB) for portability.
     */
    public function up(): void
    {
        if (! Schema::hasTable('courses')) {
            return;
        }

        if (Schema::hasIndex('courses', 'courses_admin_interface_track_id_name_unique')) {
            Schema::table('courses', function (Blueprint $table) {
                $table->dropUnique('courses_admin_interface_track_id_name_unique');
            });
        }

        DB::table('courses')->where('admin_interface', 'special')->update(['track_id' => null]);

        if (! Schema::hasIndex('courses', 'courses_admin_interface_name_index')) {
            Schema::table('courses', function (Blueprint $table) {
                $table->index(['admin_interface', 'name'], 'courses_admin_interface_name_index');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('courses')) {
            return;
        }

        if (Schema::hasIndex('courses', 'courses_admin_interface_name_index')) {
            Schema::table('courses', function (Blueprint $table) {
                $table->dropIndex('courses_admin_interface_name_index');
            });
        }

        if (! Schema::hasIndex('courses', 'courses_admin_interface_track_id_name_unique')) {
            Schema::table('courses', function (Blueprint $table) {
                $table->unique(['admin_interface', 'track_id', 'name'], 'courses_admin_interface_track_id_name_unique');
            });
        }
    }
};
