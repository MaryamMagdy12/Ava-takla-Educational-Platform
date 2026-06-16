<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('special_learners', function (Blueprint $table) {
            $table->string('permanent_password_secret_hash')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('special_learners', function (Blueprint $table) {
            $table->dropColumn('permanent_password_secret_hash');
        });
    }
};
