<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('student_questionnaires')) {
            return;
        }

        Schema::table('student_questionnaires', function (Blueprint $table) {
            if (! Schema::hasColumn('student_questionnaires', 'admin_interface')) {
                $table->string('admin_interface', 40)->default('student')->after('id');
            }
        });

        if (Schema::hasColumn('student_questionnaires', 'level_id')) {
            try {
                Schema::table('student_questionnaires', function (Blueprint $table) {
                    $table->unsignedBigInteger('level_id')->nullable()->change();
                });
            } catch (\Throwable) {
                // SQLite / older installs: skip column change if unsupported
            }
        }

        DB::table('student_questionnaires')->whereNull('admin_interface')->update(['admin_interface' => 'student']);
    }

    public function down(): void
    {
        if (Schema::hasTable('student_questionnaires') && Schema::hasColumn('student_questionnaires', 'admin_interface')) {
            Schema::table('student_questionnaires', function (Blueprint $table) {
                $table->dropColumn('admin_interface');
            });
        }
    }
};
