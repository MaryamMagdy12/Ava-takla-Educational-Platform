<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('students')) {
            if (Schema::hasColumn('students', 'permanent_password_secret')) {
                if (! Schema::hasColumn('students', 'permanent_password_secret_hash')) {
                    Schema::table('students', function (Blueprint $table) {
                        $table->string('permanent_password_secret_hash', 255)->nullable()->after('password');
                    });
                }
                $students = DB::table('students')
                    ->whereNotNull('permanent_password_secret')
                    ->get(['id', 'permanent_password_secret']);
                foreach ($students as $row) {
                    DB::table('students')->where('id', $row->id)->update([
                        'permanent_password_secret_hash' => Hash::make($row->permanent_password_secret),
                    ]);
                }
                Schema::table('students', function (Blueprint $table) {
                    $table->dropColumn('permanent_password_secret');
                });
            } elseif (! Schema::hasColumn('students', 'permanent_password_secret_hash')) {
                Schema::table('students', function (Blueprint $table) {
                    $table->string('permanent_password_secret_hash', 255)->nullable()->after('password');
                });
            }
        }

        if (Schema::hasTable('ga_families')) {
            if (Schema::hasColumn('ga_families', 'permanent_password_secret')) {
                if (! Schema::hasColumn('ga_families', 'permanent_password_secret_hash')) {
                    Schema::table('ga_families', function (Blueprint $table) {
                        $table->string('permanent_password_secret_hash', 255)->nullable()->after('password');
                    });
                }
                $families = DB::table('ga_families')
                    ->whereNotNull('permanent_password_secret')
                    ->get(['id', 'permanent_password_secret']);
                foreach ($families as $row) {
                    DB::table('ga_families')->where('id', $row->id)->update([
                        'permanent_password_secret_hash' => Hash::make($row->permanent_password_secret),
                    ]);
                }
                Schema::table('ga_families', function (Blueprint $table) {
                    $table->dropColumn('permanent_password_secret');
                });
            } elseif (! Schema::hasColumn('ga_families', 'permanent_password_secret_hash')) {
                Schema::table('ga_families', function (Blueprint $table) {
                    $table->string('permanent_password_secret_hash', 255)->nullable()->after('password');
                });
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ga_families')) {
            if (! Schema::hasColumn('ga_families', 'permanent_password_secret')) {
                Schema::table('ga_families', function (Blueprint $table) {
                    $table->string('permanent_password_secret', 64)->nullable()->after('password');
                });
            }
            if (Schema::hasColumn('ga_families', 'permanent_password_secret_hash')) {
                Schema::table('ga_families', function (Blueprint $table) {
                    $table->dropColumn('permanent_password_secret_hash');
                });
            }
        }

        if (Schema::hasTable('students')) {
            if (! Schema::hasColumn('students', 'permanent_password_secret')) {
                Schema::table('students', function (Blueprint $table) {
                    $table->string('permanent_password_secret', 64)->nullable()->after('password');
                });
            }
            if (Schema::hasColumn('students', 'permanent_password_secret_hash')) {
                Schema::table('students', function (Blueprint $table) {
                    $table->dropColumn('permanent_password_secret_hash');
                });
            }
        }
    }
};
