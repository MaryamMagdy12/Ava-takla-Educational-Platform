<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('admins', 'status')) {
            Schema::table('admins', function (Blueprint $table) {
                $table->string('status', 16)->default('active')->after('password');
            });
        }

        if (! Schema::hasColumn('admins', 'admin_role')) {
            Schema::table('admins', function (Blueprint $table) {
                $table->string('admin_role', 32)->default('super')->after('status');
            });
        }

        if (! Schema::hasColumn('admins', 'phone')) {
            Schema::table('admins', function (Blueprint $table) {
                $table->string('phone', 32)->nullable()->after('email');
            });
        }

        if (! Schema::hasColumn('admins', 'address')) {
            Schema::table('admins', function (Blueprint $table) {
                $table->string('address', 512)->nullable()->after('phone');
            });
        }

        DB::table('admins')->whereNull('admin_role')->update(['admin_role' => 'super']);
    }

    public function down(): void
    {
        Schema::table('admins', function (Blueprint $table) {
            if (Schema::hasColumn('admins', 'address')) {
                $table->dropColumn('address');
            }
            if (Schema::hasColumn('admins', 'phone')) {
                $table->dropColumn('phone');
            }
            if (Schema::hasColumn('admins', 'admin_role')) {
                $table->dropColumn('admin_role');
            }
            if (Schema::hasColumn('admins', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
