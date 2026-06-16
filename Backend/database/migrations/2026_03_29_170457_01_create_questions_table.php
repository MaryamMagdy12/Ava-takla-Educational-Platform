<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('questions')) {
            return;
        }

        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('track_id')->constrained('tracks')->cascadeOnUpdate()->restrictOnDelete();
            $table->text('question_text');
            $table->enum('question_type', ['mcq', 'true_false']);
            $table->enum('difficulty', ['easy', 'medium', 'hard'])->default('medium');
            $table->text('feedback_correct')->nullable();
            $table->text('feedback_wrong')->nullable();
            // $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->index(['course_id', 'track_id', 'difficulty']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
