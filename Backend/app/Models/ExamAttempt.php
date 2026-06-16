<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamAttempt extends Model
{
    protected $casts = [
        'started_at' => 'datetime',
        'allowed_end_time' => 'datetime',
        'submitted_at' => 'datetime',
    ];

    protected $fillable = [
        'exam_id',
        'student_id',
        'special_learner_id',
        'started_at',
        'allowed_end_time',
        'submitted_at',
        'score',
        'total_questions',
        'percentage',
        'is_passed',
        'status',
    ];

    public function exam()
    {
        return $this->belongsTo(Exam::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function specialLearner()
    {
        return $this->belongsTo(SpecialLearner::class);
    }
}
