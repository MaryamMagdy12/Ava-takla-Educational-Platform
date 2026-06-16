<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LevelAttendanceEntry extends Model
{
    protected $fillable = [
        'level_attendance_session_id',
        'student_id',
        'is_present',
    ];

    protected function casts(): array
    {
        return [
            'is_present' => 'boolean',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(LevelAttendanceSession::class, 'level_attendance_session_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
