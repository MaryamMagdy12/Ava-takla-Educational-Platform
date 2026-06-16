<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            if (! Schema::hasColumn('students', 'parent_name')) {
                $table->string('parent_name')->nullable()->after('email');
            }
            if (! Schema::hasColumn('students', 'parent_phone')) {
                $table->string('parent_phone', 40)->nullable()->after('parent_name');
            }
            if (! Schema::hasColumn('students', 'parent_email')) {
                $table->string('parent_email')->nullable()->after('parent_phone');
            }
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            if (Schema::hasColumn('students', 'parent_email')) {
                $table->dropColumn('parent_email');
            }
            if (Schema::hasColumn('students', 'parent_phone')) {
                $table->dropColumn('parent_phone');
            }
            if (Schema::hasColumn('students', 'parent_name')) {
                $table->dropColumn('parent_name');
            }
        });
    }
};
