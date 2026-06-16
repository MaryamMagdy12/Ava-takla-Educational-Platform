<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('special_learners')) {
            return;
        }

        Schema::table('special_learners', function (Blueprint $table) {
            if (! Schema::hasColumn('special_learners', 'age')) {
                $table->unsignedSmallInteger('age')->nullable()->after('address');
            }
            if (! Schema::hasColumn('special_learners', 'birth_date')) {
                $table->date('birth_date')->nullable()->after('age');
            }
            if (! Schema::hasColumn('special_learners', 'profile_picture')) {
                $table->string('profile_picture', 2048)->nullable()->after('birth_date');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('special_learners')) {
            return;
        }

        Schema::table('special_learners', function (Blueprint $table) {
            if (Schema::hasColumn('special_learners', 'profile_picture')) {
                $table->dropColumn('profile_picture');
            }
            if (Schema::hasColumn('special_learners', 'birth_date')) {
                $table->dropColumn('birth_date');
            }
            if (Schema::hasColumn('special_learners', 'age')) {
                $table->dropColumn('age');
            }
        });
    }
};
