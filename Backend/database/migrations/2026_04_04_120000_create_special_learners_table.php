<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('special_learners', function (Blueprint $table) {
            $table->id();

            $table->string('full_name');
            $table->string('email');
            $table->string('phone', 50);
            $table->string('address', 255);
            $table->string('password');
            $table->boolean('must_change_password')->default(true);
            $table->string('status', 20)->default('active');
            $table->timestamp('email_verified_at')->nullable();
            $table->string('google_id')->nullable()->unique();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('special_learners');
    }
};
