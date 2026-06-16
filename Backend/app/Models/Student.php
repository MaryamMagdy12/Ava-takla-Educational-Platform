<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Student extends Authenticatable
{
    use HasApiTokens;
    use SoftDeletes;

    public function level()
    {
        return $this->belongsTo(Level::class);
    }

    public function track()
    {
        return $this->belongsTo(Track::class);
    }

    public function levelAttendanceEntries()
    {
        return $this->hasMany(LevelAttendanceEntry::class);
    }

    protected $fillable = [
        'level_id',
        'track_id',
        'full_name',
        'email',
        'parent_name',
        'parent_phone',
        'parent_email',
        'student_unique_id',
        'serial_number',
        'password',
        'permanent_password_secret_hash',
        'must_change_password',
        'status',
        'last_activity_at',
    ];

    protected $hidden = ['password', 'permanent_password_secret_hash'];

    /**
     * When null or empty, the legacy permanent password is used (prefix + 3 name letters + student id).
     * Otherwise the random tail is stored only as a bcrypt hash; plaintext is shown once on create/reset.
     */
    public function hasLegacyPermanentPassword(): bool
    {
        $h = $this->permanent_password_secret_hash;

        return $h === null || $h === '';
    }

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'last_activity_at' => 'datetime',
        ];
    }
}
