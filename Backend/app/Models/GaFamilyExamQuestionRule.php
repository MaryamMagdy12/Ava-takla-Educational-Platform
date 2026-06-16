<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GaFamilyExamQuestionRule extends Model
{
    protected $table = 'exam_question_rules_general_assembly';

    protected $fillable = [
        'exam_id',
        'testament_type',
        'chapter_number',
        'question_count',
        'difficulty',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(GaFamilyExam::class, 'exam_id');
    }
}
