<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Exam extends Model
{
    use SoftDeletes;

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function track()
    {
        return $this->belongsTo(Track::class);
    }

    public function examQuestions()
    {
        return $this->hasMany(ExamQuestion::class)->orderBy('position');
    }

    protected $fillable = [
        'admin_interface',
        'title',
        'course_id',
        'track_id',
        'duration_minutes',
        'question_count',
        'available_from',
        'available_to',
        'status',
        'pass_mark',
        'show_correct_answers_after_submit',
        'easy_count',
        'medium_count',
        'hard_count',
    ];

    /**
     * Parse ISO-8601 from the API (e.g. …T…Z) into values MySQL datetime accepts.
     */
    protected function casts(): array
    {
        return [
            'available_from' => 'datetime',
            'available_to' => 'datetime',
            'show_correct_answers_after_submit' => 'boolean',
        ];
    }
}
