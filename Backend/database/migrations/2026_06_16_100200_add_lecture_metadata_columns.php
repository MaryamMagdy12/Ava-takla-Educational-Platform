<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('lectures')) {
            return;
        }

        Schema::table('lectures', function (Blueprint $table) {
            if (! Schema::hasColumn('lectures', 'duration_minutes')) {
                $table->unsignedSmallInteger('duration_minutes')->nullable()->after('lecture_type');
            }
            if (! Schema::hasColumn('lectures', 'lecturer_name')) {
                $table->string('lecturer_name', 255)->nullable()->after('duration_minutes');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('lectures')) {
            return;
        }

        Schema::table('lectures', function (Blueprint $table) {
            if (Schema::hasColumn('lectures', 'lecturer_name')) {
                $table->dropColumn('lecturer_name');
            }
            if (Schema::hasColumn('lectures', 'duration_minutes')) {
                $table->dropColumn('duration_minutes');
            }
        });
    }
};
