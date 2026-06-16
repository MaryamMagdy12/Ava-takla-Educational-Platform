<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('exam_questions_general_assembly')) {
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
            $table->foreign('exam_id', 'ega_q_fk_exam')
                ->references('id')
                ->on('exams_general_assembly')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('exam_questions_general_assembly')) {
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
            $table->unsignedBigInteger('exam_id')->nullable(false)->change();
            $table->foreign('exam_id', 'ega_q_fk_exam')
                ->references('id')
                ->on('exams_general_assembly')
                ->cascadeOnDelete();
        });
    }
};

