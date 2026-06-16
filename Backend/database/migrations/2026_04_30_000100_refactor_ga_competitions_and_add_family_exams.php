<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ga_competition_topics')) {
            Schema::create('ga_competition_topics', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ga_competition_id');
                $table->string('title');
                $table->text('description')->nullable();
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
                $table->softDeletes();
                $table->foreign('ga_competition_id', 'ga_ct_fk_comp')->references('id')->on('ga_competitions')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('ga_competition_question_rules')) {
            Schema::create('ga_competition_question_rules', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ga_competition_id');
                $table->unsignedBigInteger('ga_competition_topic_id');
                $table->enum('testament_type', ['old', 'new']);
                $table->unsignedInteger('chapter_number')->nullable();
                $table->unsignedInteger('question_count');
                $table->enum('difficulty', ['easy', 'medium', 'hard'])->nullable();
                $table->timestamps();
                $table->foreign('ga_competition_id', 'ga_cqr_fk_comp')->references('id')->on('ga_competitions')->cascadeOnDelete();
                $table->foreign('ga_competition_topic_id', 'ga_cqr_fk_topic')->references('id')->on('ga_competition_topics')->cascadeOnDelete();
            });
        }

        if (Schema::hasTable('ga_competition_questions')) {
            Schema::table('ga_competition_questions', function (Blueprint $table) {
                if (! Schema::hasColumn('ga_competition_questions', 'ga_competition_topic_id')) {
                    $table->unsignedBigInteger('ga_competition_topic_id')->nullable()->after('ga_competition_id');
                    $table->foreign('ga_competition_topic_id', 'ga_cq_fk_topic')->references('id')->on('ga_competition_topics')->nullOnDelete();
                }
                if (! Schema::hasColumn('ga_competition_questions', 'testament_type')) {
                    $table->enum('testament_type', ['old', 'new'])->nullable()->after('type');
                }
                if (! Schema::hasColumn('ga_competition_questions', 'chapter_number')) {
                    $table->unsignedInteger('chapter_number')->nullable()->after('testament_type');
                }
                if (! Schema::hasColumn('ga_competition_questions', 'difficulty')) {
                    $table->enum('difficulty', ['easy', 'medium', 'hard'])->nullable()->after('chapter_number');
                }
                if (! Schema::hasColumn('ga_competition_questions', 'feedback_correct')) {
                    $table->text('feedback_correct')->nullable()->after('difficulty');
                }
                if (! Schema::hasColumn('ga_competition_questions', 'feedback_wrong')) {
                    $table->text('feedback_wrong')->nullable()->after('feedback_correct');
                }
                if (! Schema::hasColumn('ga_competition_questions', 'status')) {
                    $table->enum('status', ['active', 'inactive'])->default('active')->after('feedback_wrong');
                }
            });
        }

        if (Schema::hasTable('ga_competition_attempt_questions')) {
            Schema::table('ga_competition_attempt_questions', function (Blueprint $table) {
                if (! Schema::hasColumn('ga_competition_attempt_questions', 'ga_competition_topic_id')) {
                    $table->unsignedBigInteger('ga_competition_topic_id')->nullable()->after('ga_competition_question_id');
                    $table->foreign('ga_competition_topic_id', 'ga_catq_fk_topic')->references('id')->on('ga_competition_topics')->nullOnDelete();
                }
                if (! Schema::hasColumn('ga_competition_attempt_questions', 'testament_type')) {
                    $table->enum('testament_type', ['old', 'new'])->nullable()->after('ga_competition_topic_id');
                }
                if (! Schema::hasColumn('ga_competition_attempt_questions', 'chapter_number')) {
                    $table->unsignedInteger('chapter_number')->nullable()->after('testament_type');
                }
            });
        }

        if (! Schema::hasTable('exams_general_assembly')) {
            Schema::create('exams_general_assembly', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->unsignedInteger('duration_minutes');
                $table->dateTime('available_from');
                $table->dateTime('available_to');
                $table->enum('status', ['draft', 'published', 'closed'])->default('draft');
                $table->boolean('show_result_immediately')->default(true);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('exam_questions_general_assembly')) {
            Schema::create('exam_questions_general_assembly', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('exam_id');
                $table->enum('testament_type', ['old', 'new']);
                $table->unsignedInteger('chapter_number');
                $table->text('question_text');
                $table->enum('difficulty', ['easy', 'medium', 'hard'])->nullable();
                $table->text('feedback_correct')->nullable();
                $table->text('feedback_wrong')->nullable();
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->timestamps();
                $table->softDeletes();
                $table->foreign('exam_id', 'ega_q_fk_exam')->references('id')->on('exams_general_assembly')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('exam_question_options_general_assembly')) {
            Schema::create('exam_question_options_general_assembly', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('question_id');
                $table->string('option_text');
                $table->boolean('is_correct')->default(false);
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
                $table->foreign('question_id', 'ega_qo_fk_q')->references('id')->on('exam_questions_general_assembly')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('exam_question_rules_general_assembly')) {
            Schema::create('exam_question_rules_general_assembly', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('exam_id');
                $table->enum('testament_type', ['old', 'new']);
                $table->unsignedInteger('chapter_number')->nullable();
                $table->unsignedInteger('question_count');
                $table->enum('difficulty', ['easy', 'medium', 'hard'])->nullable();
                $table->timestamps();
                $table->foreign('exam_id', 'ega_qr_fk_exam')->references('id')->on('exams_general_assembly')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('exam_attempts_family')) {
            Schema::create('exam_attempts_family', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('family_id');
                $table->unsignedBigInteger('exam_id');
                $table->dateTime('started_at');
                $table->dateTime('allowed_end_time');
                $table->dateTime('submitted_at')->nullable();
                $table->enum('status', ['in_progress', 'submitted', 'expired'])->default('in_progress');
                $table->unsignedInteger('score')->default(0);
                $table->unsignedInteger('max_score')->default(0);
                $table->decimal('percentage', 5, 2)->default(0);
                $table->timestamps();
                $table->unique(['family_id', 'exam_id'], 'ega_af_unique');
                $table->foreign('family_id', 'ega_af_fk_family')->references('id')->on('ga_families')->cascadeOnDelete();
                $table->foreign('exam_id', 'ega_af_fk_exam')->references('id')->on('exams_general_assembly')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('exam_attempt_questions_family')) {
            Schema::create('exam_attempt_questions_family', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('attempt_id');
                $table->unsignedBigInteger('question_id');
                $table->enum('testament_type', ['old', 'new'])->nullable();
                $table->unsignedInteger('chapter_number')->nullable();
                $table->unsignedInteger('question_order');
                $table->json('option_display_order')->nullable();
                $table->timestamps();
                $table->unique(['attempt_id', 'question_id'], 'ega_aqf_unique');
                $table->foreign('attempt_id', 'ega_aqf_fk_attempt')->references('id')->on('exam_attempts_family')->cascadeOnDelete();
                $table->foreign('question_id', 'ega_aqf_fk_question')->references('id')->on('exam_questions_general_assembly')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('exam_attempt_answers_family')) {
            Schema::create('exam_attempt_answers_family', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('attempt_id');
                $table->unsignedBigInteger('question_id');
                $table->unsignedBigInteger('selected_option_id')->nullable();
                $table->boolean('is_correct')->nullable();
                $table->text('feedback')->nullable();
                $table->timestamps();
                $table->unique(['attempt_id', 'question_id'], 'ega_aaf_unique');
                $table->foreign('attempt_id', 'ega_aaf_fk_attempt')->references('id')->on('exam_attempts_family')->cascadeOnDelete();
                $table->foreign('question_id', 'ega_aaf_fk_question')->references('id')->on('exam_questions_general_assembly')->cascadeOnDelete();
                $table->foreign('selected_option_id', 'ega_aaf_fk_option')->references('id')->on('exam_question_options_general_assembly')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_attempt_answers_family');
        Schema::dropIfExists('exam_attempt_questions_family');
        Schema::dropIfExists('exam_attempts_family');
        Schema::dropIfExists('exam_question_rules_general_assembly');
        Schema::dropIfExists('exam_question_options_general_assembly');
        Schema::dropIfExists('exam_questions_general_assembly');
        Schema::dropIfExists('exams_general_assembly');

        if (Schema::hasTable('ga_competition_attempt_questions')) {
            Schema::table('ga_competition_attempt_questions', function (Blueprint $table) {
                if (Schema::hasColumn('ga_competition_attempt_questions', 'chapter_number')) {
                    $table->dropColumn('chapter_number');
                }
                if (Schema::hasColumn('ga_competition_attempt_questions', 'testament_type')) {
                    $table->dropColumn('testament_type');
                }
                if (Schema::hasColumn('ga_competition_attempt_questions', 'ga_competition_topic_id')) {
                    $table->dropConstrainedForeignId('ga_competition_topic_id');
                }
            });
        }

        if (Schema::hasTable('ga_competition_questions')) {
            Schema::table('ga_competition_questions', function (Blueprint $table) {
                if (Schema::hasColumn('ga_competition_questions', 'status')) {
                    $table->dropColumn('status');
                }
                if (Schema::hasColumn('ga_competition_questions', 'feedback_wrong')) {
                    $table->dropColumn('feedback_wrong');
                }
                if (Schema::hasColumn('ga_competition_questions', 'feedback_correct')) {
                    $table->dropColumn('feedback_correct');
                }
                if (Schema::hasColumn('ga_competition_questions', 'difficulty')) {
                    $table->dropColumn('difficulty');
                }
                if (Schema::hasColumn('ga_competition_questions', 'chapter_number')) {
                    $table->dropColumn('chapter_number');
                }
                if (Schema::hasColumn('ga_competition_questions', 'testament_type')) {
                    $table->dropColumn('testament_type');
                }
                if (Schema::hasColumn('ga_competition_questions', 'ga_competition_topic_id')) {
                    $table->dropConstrainedForeignId('ga_competition_topic_id');
                }
            });
        }

        Schema::dropIfExists('ga_competition_question_rules');
        Schema::dropIfExists('ga_competition_topics');
    }
};
