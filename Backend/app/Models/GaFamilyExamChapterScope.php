<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GaFamilyExamChapterScope extends Model
{
    protected $table = 'exam_chapter_scopes_general_assembly';

    protected $fillable = [
        'exam_id',
        'testament_type',
        'chapter_number',
        'question_count',
    ];

    protected function casts(): array
    {
        return [
            'chapter_number' => 'integer',
            'question_count' => 'integer',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(GaFamilyExam::class, 'exam_id');
    }
}
