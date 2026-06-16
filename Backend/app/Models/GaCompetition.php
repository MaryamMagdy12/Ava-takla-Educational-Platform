<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class GaCompetition extends Model
{
    use SoftDeletes;

    protected $table = 'ga_competitions';

    protected $fillable = [
        'title',
        'description',
        'starts_at',
        'ends_at',
        'max_attempt_duration_hours',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'max_attempt_duration_hours' => 'integer',
        ];
    }

    public function questions(): HasMany
    {
        return $this->hasMany(GaCompetitionQuestion::class, 'ga_competition_id')->orderBy('order_no');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(GaCompetitionAttempt::class, 'ga_competition_id');
    }

    public function topics(): HasMany
    {
        return $this->hasMany(GaCompetitionTopic::class, 'ga_competition_id')->orderBy('sort_order');
    }

    public function questionRules(): HasMany
    {
        return $this->hasMany(GaCompetitionQuestionRule::class, 'ga_competition_id');
    }
}
