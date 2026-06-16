<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ga_families', function (Blueprint $table) {
            $table->string('permanent_password_secret', 64)->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('ga_families', function (Blueprint $table) {
            $table->dropColumn('permanent_password_secret');
        });
    }
};
