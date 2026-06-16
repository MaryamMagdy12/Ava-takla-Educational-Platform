<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('student_questionnaire_responses')) {
            return;
        }

        if (! Schema::hasColumn('student_questionnaire_responses', 'student_id')) {
            return;
        }

        $this->dropStudentIdForeignKeys('student_questionnaire_responses');

        Schema::table('student_questionnaire_responses', function (Blueprint $table) {
            $table->unsignedBigInteger('student_id')->nullable()->change();
        });

        Schema::table('student_questionnaire_responses', function (Blueprint $table) {
            $table->foreign('student_id', 'stuqr_fk_student')->references('id')->on('students')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('student_questionnaire_responses')) {
            return;
        }

        if (DB::table('student_questionnaire_responses')->whereNull('student_id')->exists()) {
            return;
        }

        $this->dropStudentIdForeignKeys('student_questionnaire_responses');

        Schema::table('student_questionnaire_responses', function (Blueprint $table) {
            $table->unsignedBigInteger('student_id')->nullable(false)->change();
        });

        Schema::table('student_questionnaire_responses', function (Blueprint $table) {
            $table->foreign('student_id', 'stuqr_fk_student')->references('id')->on('students')->cascadeOnDelete();
        });
    }

    private function dropStudentIdForeignKeys(string $tableName): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            try {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropForeign(['student_id']);
                });
            } catch (\Throwable) {
            }

            return;
        }

        $database = Schema::getConnection()->getDatabaseName();
        $rows = DB::select(
            'SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL',
            [$database, $tableName, 'student_id']
        );

        foreach ($rows as $row) {
            $name = $row->CONSTRAINT_NAME ?? null;
            if (! is_string($name) || $name === '') {
                continue;
            }
            DB::statement('ALTER TABLE `'.$tableName.'` DROP FOREIGN KEY `'.$name.'`');
        }
    }
};
