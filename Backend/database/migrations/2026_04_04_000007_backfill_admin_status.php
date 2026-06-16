<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('admins')) {
            return;
        }
        DB::table('admins')->whereNull('status')->update(['status' => 'active']);
    }

    public function down(): void
    {
        //
    }
};
