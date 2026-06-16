<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('student_questionnaires')) {
            Schema::create('student_questionnaires', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->unsignedBigInteger('level_id');
                $table->dateTime('available_from');
                $table->dateTime('available_to');
                $table->unsignedInteger('response_duration_minutes')->nullable();
                $table->enum('status', ['draft', 'published', 'closed'])->default('draft');
                $table->timestamps();
                $table->softDeletes();
                $table->index(['level_id', 'status']);
                $table->foreign('level_id', 'stuq_fk_level')->references('id')->on('levels')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('student_questionnaire_questions')) {
            Schema::create('student_questionnaire_questions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('student_questionnaire_id');
                $table->text('body');
                $table->enum('type', ['mcq', 'true_false', 'text'])->default('mcq');
                $table->unsignedSmallInteger('order_no')->default(0);
                $table->timestamps();
                $table->softDeletes();
                $table->foreign('student_questionnaire_id', 'stuqq_fk_stuq')->references('id')->on('student_questionnaires')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('student_questionnaire_options')) {
            Schema::create('student_questionnaire_options', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('student_questionnaire_question_id');
                $table->string('option_text');
                $table->boolean('is_correct')->nullable();
                $table->unsignedSmallInteger('order_no')->default(0);
                $table->timestamps();
                $table->foreign('student_questionnaire_question_id', 'stuqo_fk_stuqq')->references('id')->on('student_questionnaire_questions')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('student_questionnaire_responses')) {
            Schema::create('student_questionnaire_responses', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('student_questionnaire_id');
                $table->unsignedBigInteger('student_id');
                $table->dateTime('started_at');
                $table->dateTime('deadline_at')->nullable();
                $table->dateTime('submitted_at')->nullable();
                $table->enum('status', ['in_progress', 'submitted', 'expired'])->default('in_progress');
                $table->timestamps();
                $table->unique(['student_id', 'student_questionnaire_id'], 'stuqr_student_q_unique');
                $table->index(['student_questionnaire_id', 'status']);
                $table->foreign('student_questionnaire_id', 'stuqr_fk_stuq')->references('id')->on('student_questionnaires')->cascadeOnDelete();
                $table->foreign('student_id', 'stuqr_fk_student')->references('id')->on('students')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('student_questionnaire_response_answers')) {
            Schema::create('student_questionnaire_response_answers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('student_questionnaire_response_id');
                $table->unsignedBigInteger('student_questionnaire_question_id');
                $table->unsignedBigInteger('student_questionnaire_option_id')->nullable();
                $table->text('text_answer')->nullable();
                $table->timestamps();
                $table->unique(['student_questionnaire_response_id', 'student_questionnaire_question_id'], 'sq_resp_q_unique');
                $table->foreign('student_questionnaire_response_id', 'stuqra_fk_resp')->references('id')->on('student_questionnaire_responses')->cascadeOnDelete();
                $table->foreign('student_questionnaire_question_id', 'stuqra_fk_q')->references('id')->on('student_questionnaire_questions')->cascadeOnDelete();
                $table->foreign('student_questionnaire_option_id', 'stuqra_fk_opt')->references('id')->on('student_questionnaire_options')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('student_questionnaire_response_answers');
        Schema::dropIfExists('student_questionnaire_responses');
        Schema::dropIfExists('student_questionnaire_options');
        Schema::dropIfExists('student_questionnaire_questions');
        Schema::dropIfExists('student_questionnaires');
    }
};
