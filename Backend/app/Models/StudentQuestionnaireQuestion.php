<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StudentQuestionnaireQuestion extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'student_questionnaire_id',
        'body',
        'type',
        'order_no',
    ];

    public function questionnaire(): BelongsTo
    {
        return $this->belongsTo(StudentQuestionnaire::class, 'student_questionnaire_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(StudentQuestionnaireOption::class)->orderBy('order_no');
    }
}
