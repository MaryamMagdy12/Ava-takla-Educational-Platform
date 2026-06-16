<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('attempt_questions') && ! Schema::hasColumn('attempt_questions', 'correct_option_id')) {
            Schema::table('attempt_questions', function (Blueprint $table) {
                $table->unsignedBigInteger('correct_option_id')->nullable()->after('option_display_order');
            });
        }

        if (Schema::hasTable('exam_attempt_questions_family') && ! Schema::hasColumn('exam_attempt_questions_family', 'correct_option_id')) {
            Schema::table('exam_attempt_questions_family', function (Blueprint $table) {
                $table->unsignedBigInteger('correct_option_id')->nullable()->after('option_display_order');
            });
        }

        if (Schema::hasTable('ga_competition_attempt_questions') && ! Schema::hasColumn('ga_competition_attempt_questions', 'correct_option_id')) {
            Schema::table('ga_competition_attempt_questions', function (Blueprint $table) {
                $table->unsignedBigInteger('correct_option_id')->nullable()->after('option_display_order');
            });
        }
    }

    public function down(): void
    {
        foreach ([
            ['attempt_questions', 'correct_option_id'],
            ['exam_attempt_questions_family', 'correct_option_id'],
            ['ga_competition_attempt_questions', 'correct_option_id'],
        ] as [$tableName, $column]) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, $column)) {
                Schema::table($tableName, function (Blueprint $table) use ($column) {
                    $table->dropColumn($column);
                });
            }
        }
    }
};
