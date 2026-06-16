<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GaFamilyExamAttemptAnswer extends Model
{
    protected $table = 'exam_attempt_answers_family';

    protected $fillable = [
        'attempt_id',
        'question_id',
        'selected_option_id',
        'is_correct',
        'feedback',
    ];

    protected function casts(): array
    {
        return ['is_correct' => 'boolean'];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(GaFamilyExamAttempt::class, 'attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(GaFamilyExamQuestion::class, 'question_id');
    }

    public function selectedOption(): BelongsTo
    {
        return $this->belongsTo(GaFamilyExamQuestionOption::class, 'selected_option_id');
    }
}
