<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class StudentQuestionnaireResponse extends Model
{
    protected $fillable = [
        'student_questionnaire_id',
        'respondent_type',
        'respondent_id',
        'student_id',
        'started_at',
        'deadline_at',
        'submitted_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'deadline_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    public function questionnaire(): BelongsTo
    {
        return $this->belongsTo(StudentQuestionnaire::class, 'student_questionnaire_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(StudentQuestionnaireResponseAnswer::class, 'student_questionnaire_response_id');
    }

    public function specialLearner(): HasOne
    {
        return $this->hasOne(SpecialLearner::class, 'id', 'respondent_id');
    }

    public function gaFamily(): HasOne
    {
        return $this->hasOne(GaFamily::class, 'id', 'respondent_id');
    }
}
