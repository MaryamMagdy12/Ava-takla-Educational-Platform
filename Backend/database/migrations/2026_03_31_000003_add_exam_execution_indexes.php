<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->index(['course_id', 'track_id', 'status', 'difficulty'], 'questions_exam_pick_idx');
        });

        Schema::table('attempt_questions', function (Blueprint $table) {
            $table->index(['exam_attempt_id', 'order_no'], 'attempt_questions_attempt_order_idx');
        });

        Schema::table('attempt_answers', function (Blueprint $table) {
            $table->index(['exam_attempt_id'], 'attempt_answers_attempt_idx');
        });

        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->index(['student_id', 'exam_id', 'status'], 'exam_attempts_student_exam_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropIndex('questions_exam_pick_idx');
        });

        Schema::table('attempt_questions', function (Blueprint $table) {
            $table->dropIndex('attempt_questions_attempt_order_idx');
        });

        Schema::table('attempt_answers', function (Blueprint $table) {
            $table->dropIndex('attempt_answers_attempt_idx');
        });

        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->dropIndex('exam_attempts_student_exam_status_idx');
        });
    }
};

