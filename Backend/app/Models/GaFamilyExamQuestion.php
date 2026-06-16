<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class GaFamilyExamQuestion extends Model
{
    use SoftDeletes;

    protected $table = 'exam_questions_general_assembly';

    protected $fillable = [
        'exam_id',
        'testament_type',
        'chapter_number',
        'question_text',
        'difficulty',
        'feedback_correct',
        'feedback_wrong',
        'status',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(GaFamilyExam::class, 'exam_id');
    }

    public function scopeQuestionBank($query)
    {
        return $query->whereNull('exam_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(GaFamilyExamQuestionOption::class, 'question_id')->orderBy('sort_order');
    }
}
