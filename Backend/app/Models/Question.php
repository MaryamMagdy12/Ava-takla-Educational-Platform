<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Question extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'admin_interface',
        'course_id',
        'track_id',
        'question_text',
        'question_type',
        'difficulty',
        'feedback_correct',
        'feedback_wrong',
        'status',
    ];

    protected $hidden = [
        'feedback_correct',
        'feedback_wrong',
    ];

    public function options(): HasMany
    {
        return $this->hasMany(QuestionOption::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }
}
