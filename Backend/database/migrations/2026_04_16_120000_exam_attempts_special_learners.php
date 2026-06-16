<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('exam_attempts')) {
            return;
        }

        if (Schema::hasColumn('exam_attempts', 'special_learner_id')) {
            return;
        }

        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->dropForeign(['student_id']);
        });

        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->unsignedBigInteger('student_id')->nullable()->change();
        });

        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->foreign('student_id')->references('id')->on('students')->restrictOnDelete();
            $table->foreignId('special_learner_id')->nullable()->after('student_id')->constrained('special_learners')->nullOnDelete();
        });

        Schema::table('exam_attempts', function (Blueprint $table) {
            try {
                $table->dropUnique(['student_id', 'exam_id']);
            } catch (\Throwable) {
                try {
                    $table->dropUnique('exam_attempts_student_id_exam_id_unique');
                } catch (\Throwable) {
                }
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('exam_attempts') || ! Schema::hasColumn('exam_attempts', 'special_learner_id')) {
            return;
        }

        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->dropForeign(['special_learner_id']);
            $table->dropColumn('special_learner_id');
        });

        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->dropForeign(['student_id']);
        });

        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->unsignedBigInteger('student_id')->nullable(false)->change();
        });

        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->foreign('student_id')->references('id')->on('students')->restrictOnDelete();
            $table->unique(['student_id', 'exam_id']);
        });
    }
};
