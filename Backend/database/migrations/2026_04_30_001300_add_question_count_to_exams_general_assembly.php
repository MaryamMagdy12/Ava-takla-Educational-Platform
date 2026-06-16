<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('exams_general_assembly')) {
            return;
        }

        Schema::table('exams_general_assembly', function (Blueprint $table) {
            if (! Schema::hasColumn('exams_general_assembly', 'question_count')) {
                $table->unsignedInteger('question_count')->default(0)->after('description');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('exams_general_assembly')) {
            return;
        }

        Schema::table('exams_general_assembly', function (Blueprint $table) {
            if (Schema::hasColumn('exams_general_assembly', 'question_count')) {
                $table->dropColumn('question_count');
            }
        });
    }
};
