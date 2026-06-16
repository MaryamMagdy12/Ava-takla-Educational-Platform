<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentQuestionnaireOption extends Model
{
    protected $fillable = [
        'student_questionnaire_question_id',
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
        return $this->belongsTo(StudentQuestionnaireQuestion::class, 'student_questionnaire_question_id');
    }
}
