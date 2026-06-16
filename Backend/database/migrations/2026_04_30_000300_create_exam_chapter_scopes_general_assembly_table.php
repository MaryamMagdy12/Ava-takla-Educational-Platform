<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('exam_chapter_scopes_general_assembly')) {
            return;
        }

        Schema::create('exam_chapter_scopes_general_assembly', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('exam_id');
            $table->enum('testament_type', ['old', 'new']);
            $table->unsignedInteger('chapter_number');
            $table->timestamps();

            $table->unique(
                ['exam_id', 'testament_type', 'chapter_number'],
                'ega_scope_unique_exam_testament_chapter'
            );
            $table->foreign('exam_id', 'ega_scope_fk_exam')
                ->references('id')
                ->on('exams_general_assembly')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_chapter_scopes_general_assembly');
    }
};
