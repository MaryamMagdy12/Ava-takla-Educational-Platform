<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ga_competition_attempt_questions')) {
            return;
        }

        Schema::create('ga_competition_attempt_questions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ga_competition_attempt_id');
            $table->unsignedBigInteger('ga_competition_question_id');
            $table->unsignedSmallInteger('order_no');
            $table->json('option_display_order')->nullable();
            $table->timestamps();
            $table->unique(['ga_competition_attempt_id', 'ga_competition_question_id'], 'ga_catq_unique');
            $table->foreign('ga_competition_attempt_id', 'ga_catq_fk_at')->references('id')->on('ga_competition_attempts')->cascadeOnDelete();
            $table->foreign('ga_competition_question_id', 'ga_catq_fk_cq')->references('id')->on('ga_competition_questions')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ga_competition_attempt_questions');
    }
};
