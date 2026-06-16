<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lectures', function (Blueprint $table) {
            if (! Schema::hasColumn('lectures', 'storage_type')) {
                $table->string('storage_type', 32)->nullable()->after('lecture_type');
            }
            if (! Schema::hasColumn('lectures', 'external_url')) {
                $table->text('external_url')->nullable()->after('file_path');
            }
        });

        Schema::table('lectures', function (Blueprint $table) {
            $table->string('file_path')->nullable()->change();
        });

        DB::table('lectures')
            ->whereNull('storage_type')
            ->whereNotNull('file_path')
            ->update(['storage_type' => 'local_private']);
    }

    public function down(): void
    {
        Schema::table('lectures', function (Blueprint $table) {
            if (Schema::hasColumn('lectures', 'external_url')) {
                $table->dropColumn('external_url');
            }
            if (Schema::hasColumn('lectures', 'storage_type')) {
                $table->dropColumn('storage_type');
            }
        });

        Schema::table('lectures', function (Blueprint $table) {
            $table->string('file_path')->nullable(false)->change();
        });
    }
};
