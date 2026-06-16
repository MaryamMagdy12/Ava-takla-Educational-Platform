<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ga_competition_part_banks')) {
            Schema::create('ga_competition_part_banks', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('ga_competition_question_banks')) {
            Schema::create('ga_competition_question_banks', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ga_competition_part_bank_id');
                $table->text('question_text');
                $table->enum('question_type', ['mcq', 'true_false'])->default('mcq');
                $table->enum('testament_type', ['old', 'new']);
                $table->unsignedInteger('chapter_number');
                $table->enum('difficulty', ['easy', 'medium', 'hard'])->nullable();
                $table->text('feedback_correct')->nullable();
                $table->text('feedback_wrong')->nullable();
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->timestamps();
                $table->softDeletes();
                $table->foreign('ga_competition_part_bank_id', 'ga_cqb_fk_part')->references('id')->on('ga_competition_part_banks')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('ga_competition_option_banks')) {
            Schema::create('ga_competition_option_banks', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ga_competition_question_bank_id');
                $table->string('option_text');
                $table->boolean('is_correct')->default(false);
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
                $table->foreign('ga_competition_question_bank_id', 'ga_cob_fk_question')->references('id')->on('ga_competition_question_banks')->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ga_competition_option_banks');
        Schema::dropIfExists('ga_competition_question_banks');
        Schema::dropIfExists('ga_competition_part_banks');
    }
};
