<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Lecture extends Model
{
    use SoftDeletes;

    protected $hidden = ['storage_type'];

    protected $fillable = [
        'title',
        'course_id',
        'track_id',
        'lecture_type',
        'duration_minutes',
        'lecturer_name',
        'file_path',
        'external_url',
        'storage_type',
        'status',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Student-safe playback / embed URL (never exposes raw storage paths).
     */
    public function studentAccessPath(): string
    {
        return '/api/student/lectures/'.$this->id.'/view';
    }
}
