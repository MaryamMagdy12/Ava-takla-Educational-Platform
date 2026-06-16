<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('students') && ! Schema::hasColumn('students', 'status')) {
            Schema::table('students', function (Blueprint $table) {
                $table->string('status', 16)->default('active')->after('must_change_password');
                $table->index('status');
            });
        }

        if (Schema::hasTable('books') && ! Schema::hasColumn('books', 'status')) {
            Schema::table('books', function (Blueprint $table) {
                $table->enum('status', ['active', 'inactive'])->default('active')->after('file_type');
                $table->index('status');
            });
        }

        if (Schema::hasTable('lectures') && ! Schema::hasColumn('lectures', 'status')) {
            Schema::table('lectures', function (Blueprint $table) {
                $table->enum('status', ['active', 'inactive'])->default('active')->after('lecture_type');
                $table->index('status');
            });
        }

        if (Schema::hasTable('questions') && ! Schema::hasColumn('questions', 'status')) {
            Schema::table('questions', function (Blueprint $table) {
                $table->enum('status', ['active', 'inactive'])->default('active')->after('difficulty');
                $table->index(['course_id', 'track_id', 'status', 'difficulty'], 'questions_status_pick_idx');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('questions') && Schema::hasColumn('questions', 'status')) {
            Schema::table('questions', function (Blueprint $table) {
                try {
                    $table->dropIndex('questions_status_pick_idx');
                } catch (\Throwable) {
                }
                $table->dropColumn('status');
            });
        }

        if (Schema::hasTable('lectures') && Schema::hasColumn('lectures', 'status')) {
            Schema::table('lectures', function (Blueprint $table) {
                $table->dropIndex(['status']);
                $table->dropColumn('status');
            });
        }

        if (Schema::hasTable('books') && Schema::hasColumn('books', 'status')) {
            Schema::table('books', function (Blueprint $table) {
                $table->dropIndex(['status']);
                $table->dropColumn('status');
            });
        }

        if (Schema::hasTable('students') && Schema::hasColumn('students', 'status')) {
            Schema::table('students', function (Blueprint $table) {
                $table->dropIndex(['status']);
                $table->dropColumn('status');
            });
        }
    }
};
