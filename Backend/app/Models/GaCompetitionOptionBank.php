<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GaCompetitionOptionBank extends Model
{
    protected $table = 'ga_competition_option_banks';

    protected $fillable = [
        'ga_competition_question_bank_id',
        'option_text',
        'is_correct',
        'sort_order',
    ];

    protected function casts(): array
    {
        return ['is_correct' => 'boolean'];
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(GaCompetitionQuestionBank::class, 'ga_competition_question_bank_id');
    }
}
