<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class GaCompetitionPartBank extends Model
{
    use SoftDeletes;

    protected $table = 'ga_competition_part_banks';

    protected $fillable = [
        'title',
        'description',
        'sort_order',
    ];

    public function questions(): HasMany
    {
        return $this->hasMany(GaCompetitionQuestionBank::class, 'ga_competition_part_bank_id');
    }
}
