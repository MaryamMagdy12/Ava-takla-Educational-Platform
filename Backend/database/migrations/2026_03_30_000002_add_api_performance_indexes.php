<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->index(['level_id']);
            $table->index(['track_id']);
        });

        Schema::table('exams', function (Blueprint $table) {
            $table->index(['course_id', 'track_id', 'status']);
        });

        Schema::table('books', function (Blueprint $table) {
            $table->index(['course_id', 'track_id']);
        });

        Schema::table('lectures', function (Blueprint $table) {
            $table->index(['course_id', 'track_id']);
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropIndex(['level_id']);
            $table->dropIndex(['track_id']);
        });

        Schema::table('exams', function (Blueprint $table) {
            $table->dropIndex(['course_id', 'track_id', 'status']);
        });

        Schema::table('books', function (Blueprint $table) {
            $table->dropIndex(['course_id', 'track_id']);
        });

        Schema::table('lectures', function (Blueprint $table) {
            $table->dropIndex(['course_id', 'track_id']);
        });
    }
};
