<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['admins', 'students', 'ga_families', 'special_learners'] as $tableName) {
            if (Schema::hasTable($tableName) && ! Schema::hasColumn($tableName, 'last_activity_at')) {
                Schema::table($tableName, function (Blueprint $blueprint) {
                    $blueprint->timestamp('last_activity_at')->nullable();
                });
            }
        }
    }

    public function down(): void
    {
        foreach (['admins', 'students', 'ga_families', 'special_learners'] as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'last_activity_at')) {
                Schema::table($tableName, function (Blueprint $blueprint) {
                    $blueprint->dropColumn('last_activity_at');
                });
            }
        }
    }
};
