<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GaCompetitionOption extends Model
{
    protected $table = 'ga_competition_options';

    protected $fillable = [
        'ga_competition_question_id',
        'option_text',
        'is_correct',
        'order_no',
    ];

    protected function casts(): array
    {
        return ['is_correct' => 'boolean'];
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(GaCompetitionQuestion::class, 'ga_competition_question_id');
    }
}
