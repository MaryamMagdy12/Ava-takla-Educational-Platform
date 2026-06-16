<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('level_attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('admin_interface', 40)->default('student')->index();
            $table->foreignId('level_id')->constrained('levels')->cascadeOnUpdate()->restrictOnDelete();
            $table->date('held_on')->index();
            $table->string('title')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamps();

            $table->unique(['level_id', 'held_on'], 'level_attendance_sessions_level_date_unique');
        });

        Schema::create('level_attendance_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('level_attendance_session_id')
                ->constrained('level_attendance_sessions')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnUpdate()->restrictOnDelete();
            $table->boolean('is_present')->default(false);
            $table->timestamps();

            $table->unique(
                ['level_attendance_session_id', 'student_id'],
                'level_attendance_entries_session_student_unique'
            );
            $table->index(['student_id', 'is_present']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('level_attendance_entries');
        Schema::dropIfExists('level_attendance_sessions');
    }
};
