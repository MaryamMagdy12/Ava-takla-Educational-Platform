<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GaCompetitionAttemptAnswer extends Model
{
    protected $table = 'ga_competition_attempt_answers';

    protected $fillable = [
        'ga_competition_attempt_id',
        'ga_competition_question_id',
        'ga_competition_option_id',
        'is_correct',
    ];

    protected function casts(): array
    {
        return ['is_correct' => 'boolean'];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(GaCompetitionAttempt::class, 'ga_competition_attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(GaCompetitionQuestion::class, 'ga_competition_question_id');
    }

    public function option(): BelongsTo
    {
        return $this->belongsTo(GaCompetitionOption::class, 'ga_competition_option_id');
    }
}
