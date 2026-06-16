<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attempt_questions', function (Blueprint $table) {
            $table->json('option_display_order')->nullable()->after('order_no');
        });
    }

    public function down(): void
    {
        Schema::table('attempt_questions', function (Blueprint $table) {
            $table->dropColumn('option_display_order');
        });
    }
};
