<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GaCompetitionQuestionRule extends Model
{
    protected $table = 'ga_competition_question_rules';

    protected $fillable = [
        'ga_competition_id',
        'ga_competition_topic_id',
        'testament_type',
        'chapter_number',
        'question_count',
        'difficulty',
    ];

    public function competition(): BelongsTo
    {
        return $this->belongsTo(GaCompetition::class, 'ga_competition_id');
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(GaCompetitionTopic::class, 'ga_competition_topic_id');
    }
}
