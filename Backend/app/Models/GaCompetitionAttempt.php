<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GaCompetitionAttempt extends Model
{
    protected $table = 'ga_competition_attempts';

    protected $fillable = [
        'ga_competition_id',
        'ga_family_id',
        'started_at',
        'deadline_at',
        'submitted_at',
        'verified_at',
        'score',
        'total_questions',
        'percentage',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'deadline_at' => 'datetime',
            'submitted_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    public function competition(): BelongsTo
    {
        return $this->belongsTo(GaCompetition::class, 'ga_competition_id');
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(GaFamily::class, 'ga_family_id');
    }

    public function attemptQuestions(): HasMany
    {
        return $this->hasMany(GaCompetitionAttemptQuestion::class, 'ga_competition_attempt_id')->orderBy('order_no');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(GaCompetitionAttemptAnswer::class, 'ga_competition_attempt_id');
    }

    public function isReleased(): bool
    {
        return $this->verified_at !== null;
    }
}
