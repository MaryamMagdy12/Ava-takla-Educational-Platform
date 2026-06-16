<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GaFamilyExamAttemptQuestion extends Model
{
    protected $table = 'exam_attempt_questions_family';

    protected $fillable = [
        'attempt_id',
        'question_id',
        'testament_type',
        'chapter_number',
        'question_order',
        'option_display_order',
        'correct_option_id',
    ];

    protected function casts(): array
    {
        return ['option_display_order' => 'array'];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(GaFamilyExamAttempt::class, 'attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(GaFamilyExamQuestion::class, 'question_id');
    }
}
