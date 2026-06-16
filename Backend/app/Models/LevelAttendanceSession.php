<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LevelAttendanceSession extends Model
{
    protected $fillable = [
        'admin_interface',
        'level_id',
        'held_on',
        'title',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'held_on' => 'date',
        ];
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(LevelAttendanceEntry::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'created_by');
    }
}
