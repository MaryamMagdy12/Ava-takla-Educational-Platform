<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ga_families')) {
            Schema::create('ga_families', function (Blueprint $table) {
                $table->id();
                $table->string('family_login_id', 8)->unique();
                $table->string('display_name');
                $table->string('password');
                $table->boolean('must_change_password')->default(true);
                $table->string('status', 16)->default('active');
                $table->timestamp('last_login_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('ga_questionnaires')) {
            Schema::create('ga_questionnaires', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->boolean('assign_all_families')->default(true);
                $table->dateTime('available_from');
                $table->dateTime('available_to');
                $table->unsignedInteger('response_duration_minutes')->nullable();
                $table->enum('status', ['draft', 'published', 'closed'])->default('draft');
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('ga_family_questionnaire_access')) {
            Schema::create('ga_family_questionnaire_access', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ga_family_id');
                $table->unsignedBigInteger('ga_questionnaire_id');
                $table->timestamps();
                $table->unique(['ga_family_id', 'ga_questionnaire_id'], 'ga_fqa_unique');
                $table->foreign('ga_family_id', 'ga_fqa_fk_fam')->references('id')->on('ga_families')->cascadeOnDelete();
                $table->foreign('ga_questionnaire_id', 'ga_fqa_fk_q')->references('id')->on('ga_questionnaires')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('ga_questionnaire_questions')) {
            Schema::create('ga_questionnaire_questions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ga_questionnaire_id');
                $table->text('body');
                $table->enum('type', ['mcq', 'true_false', 'text'])->default('mcq');
                $table->unsignedSmallInteger('order_no')->default(0);
                $table->timestamps();
                $table->softDeletes();
                $table->foreign('ga_questionnaire_id', 'ga_qq_fk_q')->references('id')->on('ga_questionnaires')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('ga_questionnaire_options')) {
            Schema::create('ga_questionnaire_options', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ga_questionnaire_question_id');
                $table->string('option_text');
                $table->boolean('is_correct')->nullable();
                $table->unsignedSmallInteger('order_no')->default(0);
                $table->timestamps();
                $table->foreign('ga_questionnaire_question_id', 'ga_qo_fk_qq')->references('id')->on('ga_questionnaire_questions')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('ga_questionnaire_responses')) {
            Schema::create('ga_questionnaire_responses', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ga_questionnaire_id');
                $table->unsignedBigInteger('ga_family_id');
                $table->dateTime('started_at');
                $table->dateTime('deadline_at')->nullable();
                $table->dateTime('submitted_at')->nullable();
                $table->enum('status', ['in_progress', 'submitted', 'expired'])->default('in_progress');
                $table->timestamps();
                $table->unique(['ga_family_id', 'ga_questionnaire_id'], 'ga_qr_unique');
                $table->foreign('ga_questionnaire_id', 'ga_qr_fk_q')->references('id')->on('ga_questionnaires')->cascadeOnDelete();
                $table->foreign('ga_family_id', 'ga_qr_fk_fam')->references('id')->on('ga_families')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('ga_questionnaire_response_answers')) {
            Schema::create('ga_questionnaire_response_answers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ga_questionnaire_response_id');
                $table->unsignedBigInteger('ga_questionnaire_question_id');
                $table->unsignedBigInteger('ga_questionnaire_option_id')->nullable();
                $table->text('text_answer')->nullable();
                $table->timestamps();
                $table->unique(['ga_questionnaire_response_id', 'ga_questionnaire_question_id'], 'ga_qra_unique');
                $table->foreign('ga_questionnaire_response_id', 'ga_qra_fk_r')->references('id')->on('ga_questionnaire_responses')->cascadeOnDelete();
                $table->foreign('ga_questionnaire_question_id', 'ga_qra_fk_qq')->references('id')->on('ga_questionnaire_questions')->cascadeOnDelete();
                $table->foreign('ga_questionnaire_option_id', 'ga_qra_fk_opt')->references('id')->on('ga_questionnaire_options')->nullOnDelete();
            });
        }

        if (! Schema::hasTable('ga_competitions')) {
            Schema::create('ga_competitions', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->dateTime('starts_at');
                $table->dateTime('ends_at');
                $table->unsignedInteger('max_attempt_duration_hours')->nullable();
                $table->enum('status', ['draft', 'published', 'closed'])->default('draft');
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('ga_competition_questions')) {
            Schema::create('ga_competition_questions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ga_competition_id');
                $table->text('body');
                $table->enum('type', ['mcq', 'true_false'])->default('mcq');
                $table->unsignedSmallInteger('order_no')->default(0);
                $table->timestamps();
                $table->softDeletes();
                $table->foreign('ga_competition_id', 'ga_cq_fk_c')->references('id')->on('ga_competitions')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('ga_competition_options')) {
            Schema::create('ga_competition_options', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ga_competition_question_id');
                $table->string('option_text');
                $table->boolean('is_correct')->default(false);
                $table->unsignedSmallInteger('order_no')->default(0);
                $table->timestamps();
                $table->foreign('ga_competition_question_id', 'ga_co_fk_cq')->references('id')->on('ga_competition_questions')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('ga_competition_attempts')) {
            Schema::create('ga_competition_attempts', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ga_competition_id');
                $table->unsignedBigInteger('ga_family_id');
                $table->dateTime('started_at');
                $table->dateTime('deadline_at')->nullable();
                $table->dateTime('submitted_at')->nullable();
                $table->timestamp('verified_at')->nullable();
                $table->unsignedSmallInteger('score')->default(0);
                $table->unsignedSmallInteger('total_questions')->default(0);
                $table->decimal('percentage', 5, 2)->default(0);
                $table->enum('status', ['in_progress', 'submitted', 'expired'])->default('in_progress');
                $table->timestamps();
                $table->unique(['ga_family_id', 'ga_competition_id'], 'ga_cat_unique');
                $table->foreign('ga_competition_id', 'ga_cat_fk_c')->references('id')->on('ga_competitions')->cascadeOnDelete();
                $table->foreign('ga_family_id', 'ga_cat_fk_fam')->references('id')->on('ga_families')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('ga_competition_attempt_answers')) {
            Schema::create('ga_competition_attempt_answers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ga_competition_attempt_id');
                $table->unsignedBigInteger('ga_competition_question_id');
                $table->unsignedBigInteger('ga_competition_option_id')->nullable();
                $table->boolean('is_correct')->nullable();
                $table->timestamps();
                $table->unique(['ga_competition_attempt_id', 'ga_competition_question_id'], 'ga_caa_unique');
                $table->foreign('ga_competition_attempt_id', 'ga_caa_fk_at')->references('id')->on('ga_competition_attempts')->cascadeOnDelete();
                $table->foreign('ga_competition_question_id', 'ga_caa_fk_cq')->references('id')->on('ga_competition_questions')->cascadeOnDelete();
                $table->foreign('ga_competition_option_id', 'ga_caa_fk_co')->references('id')->on('ga_competition_options')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ga_competition_attempt_answers');
        Schema::dropIfExists('ga_competition_attempts');
        Schema::dropIfExists('ga_competition_options');
        Schema::dropIfExists('ga_competition_questions');
        Schema::dropIfExists('ga_competitions');
        Schema::dropIfExists('ga_questionnaire_response_answers');
        Schema::dropIfExists('ga_questionnaire_responses');
        Schema::dropIfExists('ga_questionnaire_options');
        Schema::dropIfExists('ga_questionnaire_questions');
        Schema::dropIfExists('ga_family_questionnaire_access');
        Schema::dropIfExists('ga_questionnaires');
        Schema::dropIfExists('ga_families');
    }
};
