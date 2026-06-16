<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('exam_questions_general_assembly') || ! Schema::hasColumn('exam_questions_general_assembly', 'exam_id')) {
            return;
        }

        Schema::table('exam_questions_general_assembly', function (Blueprint $table) {
            try {
                $table->dropForeign(['exam_id']);
            } catch (\Throwable) {
                try {
                    $table->dropForeign('ega_q_fk_exam');
                } catch (\Throwable) {
                }
            }
        });

        Schema::table('exam_questions_general_assembly', function (Blueprint $table) {
            $table->unsignedBigInteger('exam_id')->nullable()->change();
        });

        Schema::table('exam_questions_general_assembly', function (Blueprint $table) {
            $table->foreign('exam_id', 'ega_q_fk_exam')
                ->references('id')
                ->on('exams_general_assembly')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('exam_questions_general_assembly') || ! Schema::hasColumn('exam_questions_general_assembly', 'exam_id')) {
            return;
        }

        $firstExamId = DB::table('exams_general_assembly')->orderBy('id')->value('id');
        if ($firstExamId === null) {
            $now = now();
            $firstExamId = DB::table('exams_general_assembly')->insertGetId([
                'title' => 'Legacy exam',
                'description' => 'Auto-created to rollback question bank migration.',
                'duration_minutes' => 60,
                'available_from' => $now,
                'available_to' => $now->copy()->addDay(),
                'status' => 'draft',
                'show_result_immediately' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        DB::table('exam_questions_general_assembly')
            ->whereNull('exam_id')
            ->update(['exam_id' => $firstExamId]);

        Schema::table('exam_questions_general_assembly', function (Blueprint $table) {
            try {
                $table->dropForeign(['exam_id']);
            } catch (\Throwable) {
                try {
                    $table->dropForeign('ega_q_fk_exam');
                } catch (\Throwable) {
                }
            }
        });

        Schema::table('exam_questions_general_assembly', function (Blueprint $table) {
            $table->unsignedBigInteger('exam_id')->nullable(false)->change();
        });

        Schema::table('exam_questions_general_assembly', function (Blueprint $table) {
            $table->foreign('exam_id', 'ega_q_fk_exam')
                ->references('id')
                ->on('exams_general_assembly')
                ->cascadeOnDelete();
        });
    }
};
