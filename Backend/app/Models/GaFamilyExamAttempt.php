<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GaFamilyExamAttempt extends Model
{
    protected $table = 'exam_attempts_family';

    protected $fillable = [
        'family_id',
        'exam_id',
        'started_at',
        'allowed_end_time',
        'submitted_at',
        'status',
        'score',
        'max_score',
        'percentage',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'allowed_end_time' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(GaFamily::class, 'family_id');
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(GaFamilyExam::class, 'exam_id');
    }

    public function attemptQuestions(): HasMany
    {
        return $this->hasMany(GaFamilyExamAttemptQuestion::class, 'attempt_id')->orderBy('question_order');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(GaFamilyExamAttemptAnswer::class, 'attempt_id');
    }
}
