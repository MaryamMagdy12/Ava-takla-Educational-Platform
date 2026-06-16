<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class GaCompetitionTopic extends Model
{
    use SoftDeletes;

    protected $table = 'ga_competition_topics';

    protected $fillable = [
        'ga_competition_id',
        'title',
        'description',
        'sort_order',
    ];

    public function competition(): BelongsTo
    {
        return $this->belongsTo(GaCompetition::class, 'ga_competition_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(GaCompetitionQuestion::class, 'ga_competition_topic_id');
    }

    public function rules(): HasMany
    {
        return $this->hasMany(GaCompetitionQuestionRule::class, 'ga_competition_topic_id');
    }
}
