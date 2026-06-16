<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levels', function (Blueprint $table) {
            $table->string('permanent_password_prefix', 32)->nullable()->after('code_prefix');
        });

        $map = [
            'Primary A' => 'Pa@',
            'Primary B' => 'Pb$',
            'Preparatory/Secondary' => 'PrSe&',
        ];
        foreach ($map as $name => $prefix) {
            DB::table('levels')->where('name', $name)->update(['permanent_password_prefix' => $prefix]);
        }
    }

    public function down(): void
    {
        Schema::table('levels', function (Blueprint $table) {
            $table->dropColumn('permanent_password_prefix');
        });
    }
};
