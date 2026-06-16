<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StudentQuestionnaire extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'admin_interface',
        'title',
        'description',
        'level_id',
        'available_from',
        'available_to',
        'response_duration_minutes',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'available_from' => 'datetime',
            'available_to' => 'datetime',
            'response_duration_minutes' => 'integer',
        ];
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(StudentQuestionnaireQuestion::class)->orderBy('order_no');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(StudentQuestionnaireResponse::class);
    }
}
