<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('admin_interface_role_scopes')) {
            Schema::create('admin_interface_role_scopes', function (Blueprint $table) {
                $table->id();
                $table->string('admin_role', 32);
                $table->string('admin_interface', 40);
                $table->timestamps();
                $table->unique(['admin_role', 'admin_interface'], 'admin_role_interface_unique');
            });

            DB::table('admin_interface_role_scopes')->insert([
                ['admin_role' => 'super', 'admin_interface' => 'student', 'created_at' => now(), 'updated_at' => now()],
                ['admin_role' => 'super', 'admin_interface' => 'general_assembly', 'created_at' => now(), 'updated_at' => now()],
                ['admin_role' => 'super', 'admin_interface' => 'special', 'created_at' => now(), 'updated_at' => now()],
                ['admin_role' => 'student', 'admin_interface' => 'student', 'created_at' => now(), 'updated_at' => now()],
                ['admin_role' => 'general_assembly', 'admin_interface' => 'general_assembly', 'created_at' => now(), 'updated_at' => now()],
                ['admin_role' => 'special', 'admin_interface' => 'special', 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        if (Schema::hasTable('tracks')) {
            Schema::table('tracks', function (Blueprint $table) {
                if (! Schema::hasColumn('tracks', 'admin_interface')) {
                    $table->string('admin_interface', 40)->default('student')->after('id');
                }
            });
            DB::table('tracks')->whereNull('admin_interface')->update(['admin_interface' => 'student']);
            try {
                Schema::table('tracks', function (Blueprint $table) {
                    $table->dropUnique(['name']);
                });
            } catch (\Throwable) {
                //
            }
            Schema::table('tracks', function (Blueprint $table) {
                if ($this->indexExists('tracks', 'tracks_admin_interface_name_unique')) {
                    return;
                }
                $table->unique(['admin_interface', 'name'], 'tracks_admin_interface_name_unique');
            });
        }

        if (Schema::hasTable('courses')) {
            Schema::table('courses', function (Blueprint $table) {
                if (! Schema::hasColumn('courses', 'admin_interface')) {
                    $table->string('admin_interface', 40)->default('student')->after('id');
                }
            });
            DB::table('courses')->whereNull('admin_interface')->update(['admin_interface' => 'student']);
            try {
                Schema::table('courses', function (Blueprint $table) {
                    $table->dropUnique(['name']);
                });
            } catch (\Throwable) {
                //
            }
            Schema::table('courses', function (Blueprint $table) {
                if ($this->indexExists('courses', 'courses_admin_interface_name_unique')) {
                    return;
                }
                $table->unique(['admin_interface', 'name'], 'courses_admin_interface_name_unique');
            });
        }

        if (Schema::hasTable('questions')) {
            Schema::table('questions', function (Blueprint $table) {
                if (! Schema::hasColumn('questions', 'admin_interface')) {
                    $table->string('admin_interface', 40)->default('student')->after('id');
                }
            });
            if (Schema::hasTable('tracks')) {
                DB::statement('UPDATE questions SET admin_interface = (
                    SELECT tracks.admin_interface FROM tracks WHERE tracks.id = questions.track_id
                ) WHERE EXISTS (SELECT 1 FROM tracks WHERE tracks.id = questions.track_id)');
            }
            DB::table('questions')->whereNull('admin_interface')->update(['admin_interface' => 'student']);
            Schema::table('questions', function (Blueprint $table) {
                if (! $this->indexExists('questions', 'questions_admin_interface_track_id_course_id_index')) {
                    $table->index(['admin_interface', 'track_id', 'course_id'], 'questions_admin_interface_track_id_course_id_index');
                }
            });
        }

        if (Schema::hasTable('exams')) {
            Schema::table('exams', function (Blueprint $table) {
                if (! Schema::hasColumn('exams', 'admin_interface')) {
                    $table->string('admin_interface', 40)->default('student')->after('id');
                }
                if (! Schema::hasColumn('exams', 'show_correct_answers_after_submit')) {
                    $table->boolean('show_correct_answers_after_submit')->default(false)->after('pass_mark');
                }
            });
            if (Schema::hasTable('tracks')) {
                DB::statement('UPDATE exams SET admin_interface = (
                    SELECT tracks.admin_interface FROM tracks WHERE tracks.id = exams.track_id
                ) WHERE EXISTS (SELECT 1 FROM tracks WHERE tracks.id = exams.track_id)');
            }
            DB::table('exams')->whereNull('admin_interface')->update(['admin_interface' => 'student']);
            Schema::table('exams', function (Blueprint $table) {
                if (! $this->indexExists('exams', 'exams_admin_interface_track_id_status_index')) {
                    $table->index(['admin_interface', 'track_id', 'status'], 'exams_admin_interface_track_id_status_index');
                }
            });
        }

        if (Schema::hasTable('exam_questions')) {
            Schema::table('exam_questions', function (Blueprint $table) {
                if (! Schema::hasColumn('exam_questions', 'admin_interface')) {
                    $table->string('admin_interface', 40)->default('student')->after('id');
                }
            });
            if (Schema::hasTable('exams')) {
                DB::statement('UPDATE exam_questions SET admin_interface = (
                    SELECT exams.admin_interface FROM exams WHERE exams.id = exam_questions.exam_id
                ) WHERE EXISTS (SELECT 1 FROM exams WHERE exams.id = exam_questions.exam_id)');
            }
            DB::table('exam_questions')->whereNull('admin_interface')->update(['admin_interface' => 'student']);
            Schema::table('exam_questions', function (Blueprint $table) {
                if (! $this->indexExists('exam_questions', 'exam_questions_admin_interface_exam_id_index')) {
                    $table->index(['admin_interface', 'exam_id'], 'exam_questions_admin_interface_exam_id_index');
                }
            });
        }

        if (Schema::hasTable('student_questionnaires')) {
            Schema::table('student_questionnaires', function (Blueprint $table) {
                if (! Schema::hasColumn('student_questionnaires', 'admin_interface')) {
                    $table->string('admin_interface', 40)->default('student')->after('id');
                }
            });
            DB::table('student_questionnaires')->whereNull('admin_interface')->update(['admin_interface' => 'student']);
            Schema::table('student_questionnaires', function (Blueprint $table) {
                if (! $this->indexExists('student_questionnaires', 'stuq_admin_interface_level_status_index')) {
                    $table->index(['admin_interface', 'level_id', 'status'], 'stuq_admin_interface_level_status_index');
                }
            });
        }

        if (Schema::hasTable('student_questionnaire_responses')) {
            Schema::table('student_questionnaire_responses', function (Blueprint $table) {
                if (! Schema::hasColumn('student_questionnaire_responses', 'respondent_type')) {
                    $table->string('respondent_type', 24)->default('student')->after('student_questionnaire_id');
                }
                if (! Schema::hasColumn('student_questionnaire_responses', 'respondent_id')) {
                    $table->unsignedBigInteger('respondent_id')->nullable()->after('respondent_type');
                }
            });
            DB::table('student_questionnaire_responses')
                ->whereNull('respondent_type')
                ->update(['respondent_type' => 'student']);
            DB::statement('UPDATE student_questionnaire_responses SET respondent_id = student_id WHERE respondent_id IS NULL AND student_id IS NOT NULL');
            Schema::table('student_questionnaire_responses', function (Blueprint $table) {
                if (! $this->indexExists('student_questionnaire_responses', 'stuqr_q_respondent_unique')) {
                    $table->unique(
                        ['student_questionnaire_id', 'respondent_type', 'respondent_id'],
                        'stuqr_q_respondent_unique'
                    );
                }
                if (! $this->indexExists('student_questionnaire_responses', 'stuqr_questionnaire_status_idx')) {
                    $table->index(['student_questionnaire_id', 'status'], 'stuqr_questionnaire_status_idx');
                }
            });
        }

        if (Schema::hasTable('levels')) {
            Schema::table('levels', function (Blueprint $table) {
                if (! Schema::hasColumn('levels', 'admin_interface')) {
                    $table->string('admin_interface', 40)->default('student')->after('id');
                }
            });

            if (Schema::hasTable('tracks')) {
                DB::statement('UPDATE levels SET admin_interface = (
                    SELECT tracks.admin_interface FROM tracks WHERE tracks.id = levels.track_id
                ) WHERE EXISTS (SELECT 1 FROM tracks WHERE tracks.id = levels.track_id)');
            }
            DB::table('levels')->whereNull('admin_interface')->update(['admin_interface' => 'student']);

            try {
                Schema::table('levels', function (Blueprint $table) {
                    $table->dropUnique(['name']);
                });
            } catch (\Throwable) {
                //
            }
            try {
                Schema::table('levels', function (Blueprint $table) {
                    $table->dropUnique(['code_prefix']);
                });
            } catch (\Throwable) {
                //
            }

            Schema::table('levels', function (Blueprint $table) {
                if (! $this->indexExists('levels', 'levels_track_id_name_unique')) {
                    $table->unique(['track_id', 'name'], 'levels_track_id_name_unique');
                }
                if (! $this->indexExists('levels', 'levels_admin_interface_code_prefix_unique')) {
                    $table->unique(['admin_interface', 'code_prefix'], 'levels_admin_interface_code_prefix_unique');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('student_questionnaires')) {
            Schema::table('student_questionnaires', function (Blueprint $table) {
                try {
                    $table->dropIndex('stuq_admin_interface_level_status_index');
                } catch (\Throwable) {
                    //
                }
                if (Schema::hasColumn('student_questionnaires', 'admin_interface')) {
                    $table->dropColumn('admin_interface');
                }
            });
        }

        if (Schema::hasTable('student_questionnaire_responses')) {
            Schema::table('student_questionnaire_responses', function (Blueprint $table) {
                try {
                    $table->dropUnique('stuqr_q_respondent_unique');
                } catch (\Throwable) {
                    //
                }
                try {
                    $table->dropIndex('stuqr_questionnaire_status_idx');
                } catch (\Throwable) {
                    //
                }
                if (Schema::hasColumn('student_questionnaire_responses', 'respondent_id')) {
                    $table->dropColumn('respondent_id');
                }
                if (Schema::hasColumn('student_questionnaire_responses', 'respondent_type')) {
                    $table->dropColumn('respondent_type');
                }
            });
        }

        if (Schema::hasTable('exam_questions')) {
            Schema::table('exam_questions', function (Blueprint $table) {
                try {
                    $table->dropIndex('exam_questions_admin_interface_exam_id_index');
                } catch (\Throwable) {
                    //
                }
                if (Schema::hasColumn('exam_questions', 'admin_interface')) {
                    $table->dropColumn('admin_interface');
                }
            });
        }

        if (Schema::hasTable('exams')) {
            Schema::table('exams', function (Blueprint $table) {
                try {
                    $table->dropIndex('exams_admin_interface_track_id_status_index');
                } catch (\Throwable) {
                    //
                }
                if (Schema::hasColumn('exams', 'show_correct_answers_after_submit')) {
                    $table->dropColumn('show_correct_answers_after_submit');
                }
                if (Schema::hasColumn('exams', 'admin_interface')) {
                    $table->dropColumn('admin_interface');
                }
            });
        }

        if (Schema::hasTable('questions')) {
            Schema::table('questions', function (Blueprint $table) {
                try {
                    $table->dropIndex('questions_admin_interface_track_id_course_id_index');
                } catch (\Throwable) {
                    //
                }
                if (Schema::hasColumn('questions', 'admin_interface')) {
                    $table->dropColumn('admin_interface');
                }
            });
        }

        if (Schema::hasTable('levels')) {
            Schema::table('levels', function (Blueprint $table) {
                try {
                    $table->dropUnique('levels_track_id_name_unique');
                } catch (\Throwable) {
                    //
                }
                try {
                    $table->dropUnique('levels_admin_interface_code_prefix_unique');
                } catch (\Throwable) {
                    //
                }
                if (Schema::hasColumn('levels', 'admin_interface')) {
                    $table->dropColumn('admin_interface');
                }
            });
            Schema::table('levels', function (Blueprint $table) {
                $table->unique('name');
                $table->unique('code_prefix');
            });
        }

        if (Schema::hasTable('courses')) {
            Schema::table('courses', function (Blueprint $table) {
                try {
                    $table->dropUnique('courses_admin_interface_name_unique');
                } catch (\Throwable) {
                    //
                }
                if (Schema::hasColumn('courses', 'admin_interface')) {
                    $table->dropColumn('admin_interface');
                }
            });
            Schema::table('courses', function (Blueprint $table) {
                $table->unique('name');
            });
        }

        if (Schema::hasTable('tracks')) {
            Schema::table('tracks', function (Blueprint $table) {
                try {
                    $table->dropUnique('tracks_admin_interface_name_unique');
                } catch (\Throwable) {
                    //
                }
                if (Schema::hasColumn('tracks', 'admin_interface')) {
                    $table->dropColumn('admin_interface');
                }
            });
            Schema::table('tracks', function (Blueprint $table) {
                $table->unique('name');
            });
        }

        Schema::dropIfExists('admin_interface_role_scopes');
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $connection = Schema::getConnection();
        $driver = $connection->getDriverName();
        if ($driver === 'sqlite') {
            $rows = $connection->select("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name = ? AND name = ?", [$table, $indexName]);

            return count($rows) > 0;
        }

        $database = $connection->getDatabaseName();
        $result = $connection->select(
            'SELECT COUNT(*) as c FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?',
            [$database, $table, $indexName]
        );

        return isset($result[0]) && (int) $result[0]->c > 0;
    }
};
