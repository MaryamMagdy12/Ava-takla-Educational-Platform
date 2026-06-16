<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('exam_attempts')) {
            return;
        }

        Schema::table('exam_attempts', function (Blueprint $table) {
            if (! $this->indexExists('exam_attempts', 'exam_attempts_student_id_exam_id_unique')) {
                try {
                    $table->unique(['student_id', 'exam_id'], 'exam_attempts_student_id_exam_id_unique');
                } catch (\Throwable) {
                }
            }

            if (
                Schema::hasColumn('exam_attempts', 'special_learner_id')
                && ! $this->indexExists('exam_attempts', 'exam_attempts_special_learner_exam_unique')
            ) {
                try {
                    $table->unique(['special_learner_id', 'exam_id'], 'exam_attempts_special_learner_exam_unique');
                } catch (\Throwable) {
                }
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('exam_attempts')) {
            return;
        }

        Schema::table('exam_attempts', function (Blueprint $table) {
            if ($this->indexExists('exam_attempts', 'exam_attempts_special_learner_exam_unique')) {
                $table->dropUnique('exam_attempts_special_learner_exam_unique');
            }
            if ($this->indexExists('exam_attempts', 'exam_attempts_student_id_exam_id_unique')) {
                $table->dropUnique('exam_attempts_student_id_exam_id_unique');
            }
        });
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $connection = Schema::getConnection();
        $driver = $connection->getDriverName();

        if ($driver === 'sqlite') {
            $rows = $connection->select("PRAGMA index_list('{$table}')");
            foreach ($rows as $row) {
                if (($row->name ?? '') === $indexName) {
                    return true;
                }
            }

            return false;
        }

        $database = $connection->getDatabaseName();
        $result = $connection->select(
            'SELECT COUNT(*) AS c FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?',
            [$database, $table, $indexName]
        );

        return ((int) ($result[0]->c ?? 0)) > 0;
    }
};
