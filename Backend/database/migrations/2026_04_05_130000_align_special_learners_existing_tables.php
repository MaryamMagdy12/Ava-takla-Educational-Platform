<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * For databases that already ran an older special_learners migration (e.g. with learner_login_id).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('special_learners')) {
            return;
        }

        Schema::table('special_learners', function (Blueprint $table) {
            if (Schema::hasColumn('special_learners', 'learner_login_id')) {
                $table->dropColumn('learner_login_id');
            }
        });

        Schema::table('special_learners', function (Blueprint $table) {
            if (! Schema::hasColumn('special_learners', 'phone')) {
                $table->string('phone', 50)->default('');
            }
            if (! Schema::hasColumn('special_learners', 'address')) {
                $table->string('address', 255)->default('');
            }
            if (! Schema::hasColumn('special_learners', 'email_verified_at')) {
                $table->timestamp('email_verified_at')->nullable();
            }
            if (! Schema::hasColumn('special_learners', 'google_id')) {
                $table->string('google_id')->nullable()->unique();
            }
        });
    }

    public function down(): void
    {
        //
    }
};
