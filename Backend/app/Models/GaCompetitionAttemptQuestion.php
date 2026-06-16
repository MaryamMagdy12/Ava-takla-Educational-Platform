<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GaCompetitionAttemptQuestion extends Model
{
    protected $table = 'ga_competition_attempt_questions';

    protected $fillable = [
        'ga_competition_attempt_id',
        'ga_competition_question_id',
        'ga_competition_topic_id',
        'testament_type',
        'chapter_number',
        'order_no',
        'option_display_order',
        'correct_option_id',
    ];

    protected function casts(): array
    {
        return ['option_display_order' => 'array'];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(GaCompetitionAttempt::class, 'ga_competition_attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(GaCompetitionQuestion::class, 'ga_competition_question_id');
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(GaCompetitionTopic::class, 'ga_competition_topic_id');
    }
}
