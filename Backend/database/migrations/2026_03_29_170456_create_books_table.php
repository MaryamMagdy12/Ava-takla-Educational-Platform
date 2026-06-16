<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('track_id')->constrained('tracks')->cascadeOnUpdate()->restrictOnDelete();
            $table->string('title');
            $table->string('file_path');
            $table->string('file_type');
            // $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->index(['track_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};
