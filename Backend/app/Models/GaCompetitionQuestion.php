<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class GaCompetitionQuestion extends Model
{
    use SoftDeletes;

    protected $table = 'ga_competition_questions';

    protected $fillable = [
        'ga_competition_id',
        'ga_competition_topic_id',
        'body',
        'type',
        'testament_type',
        'chapter_number',
        'difficulty',
        'feedback_correct',
        'feedback_wrong',
        'status',
        'order_no',
    ];

    public function competition(): BelongsTo
    {
        return $this->belongsTo(GaCompetition::class, 'ga_competition_id');
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(GaCompetitionTopic::class, 'ga_competition_topic_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(GaCompetitionOption::class, 'ga_competition_question_id')->orderBy('order_no');
    }
}
