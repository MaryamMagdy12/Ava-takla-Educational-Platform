<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Allow course-scoped LMS rows (no track) for interfaces such as special learners.
     */
    public function up(): void
    {
        foreach (['exams', 'questions', 'books', 'lectures'] as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'track_id')) {
                continue;
            }
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropForeign(['track_id']);
            });
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->unsignedBigInteger('track_id')->nullable()->change();
            });
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->foreign('track_id')
                    ->references('id')
                    ->on('tracks')
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach (['exams', 'questions', 'books', 'lectures'] as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'track_id')) {
                continue;
            }
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropForeign(['track_id']);
            });
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->unsignedBigInteger('track_id')->nullable(false)->change();
            });
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreign('track_id')
                    ->references('id')
                    ->on('tracks')
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();
            });
        }
    }
};
