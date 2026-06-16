<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('exams')) {
            return;
        }

        Schema::create('exams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('track_id')->constrained('tracks')->cascadeOnUpdate()->restrictOnDelete();
            $table->string('title');
            $table->unsignedSmallInteger('duration_minutes');
            $table->unsignedSmallInteger('question_count');
            $table->dateTime('available_from');
            $table->dateTime('available_to');
            $table->unsignedSmallInteger('pass_mark')->nullable();
            $table->boolean('show_correct_answers_after_submit')->default(false);
            $table->unsignedSmallInteger('easy_count')->nullable();
            $table->unsignedSmallInteger('medium_count')->nullable();
            $table->unsignedSmallInteger('hard_count')->nullable();
            $table->enum('status', ['draft', 'published', 'closed'])->default('draft');
            $table->timestamps();
            $table->index(['track_id', 'status', 'available_from', 'available_to']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exams');
    }
};
