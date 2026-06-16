<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class GaCompetitionQuestionBank extends Model
{
    use SoftDeletes;

    protected $table = 'ga_competition_question_banks';

    protected $fillable = [
        'ga_competition_part_bank_id',
        'question_text',
        'question_type',
        'testament_type',
        'chapter_number',
        'difficulty',
        'feedback_correct',
        'feedback_wrong',
        'status',
    ];

    public function part(): BelongsTo
    {
        return $this->belongsTo(GaCompetitionPartBank::class, 'ga_competition_part_bank_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(GaCompetitionOptionBank::class, 'ga_competition_question_bank_id')->orderBy('sort_order');
    }
}
