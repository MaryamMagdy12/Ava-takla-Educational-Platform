<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Level extends Model
{
    protected $fillable = ['admin_interface', 'track_id', 'name', 'code_prefix', 'permanent_password_prefix', 'status'];

    public function track()
    {
        return $this->belongsTo(Track::class);
    }

    public function attendanceSessions()
    {
        return $this->hasMany(LevelAttendanceSession::class);
    }
}
