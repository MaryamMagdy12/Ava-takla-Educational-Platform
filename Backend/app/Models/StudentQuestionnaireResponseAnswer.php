<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentQuestionnaireResponseAnswer extends Model
{
    protected $fillable = [
        'student_questionnaire_response_id',
        'student_questionnaire_question_id',
        'student_questionnaire_option_id',
        'text_answer',
    ];

    public function response(): BelongsTo
    {
        return $this->belongsTo(StudentQuestionnaireResponse::class, 'student_questionnaire_response_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(StudentQuestionnaireQuestion::class, 'student_questionnaire_question_id');
    }

    public function option(): BelongsTo
    {
        return $this->belongsTo(StudentQuestionnaireOption::class, 'student_questionnaire_option_id');
    }
}
