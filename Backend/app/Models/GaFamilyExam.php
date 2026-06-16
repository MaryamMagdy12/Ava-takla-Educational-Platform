<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\GaFamilyExamChapterScope;
use Illuminate\Support\Collection;

class GaFamilyExam extends Model
{
    use SoftDeletes;

    protected $table = 'exams_general_assembly';

    protected $fillable = [
        'title',
        'description',
        'question_count',
        'duration_minutes',
        'available_from',
        'available_to',
        'status',
        'show_result_immediately',
    ];

    protected function casts(): array
    {
        return [
            'question_count' => 'integer',
            'available_from' => 'datetime',
            'available_to' => 'datetime',
            'show_result_immediately' => 'boolean',
        ];
    }

    public function questions(): HasMany
    {
        return $this->hasMany(GaFamilyExamQuestion::class, 'exam_id');
    }

    public function rules(): HasMany
    {
        return $this->hasMany(GaFamilyExamQuestionRule::class, 'exam_id');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(GaFamilyExamAttempt::class, 'exam_id');
    }

    public function chapterScopes(): HasMany
    {
        return $this->hasMany(GaFamilyExamChapterScope::class, 'exam_id');
    }

    public function allowsQuestionScope(string $testamentType, int $chapterNumber): bool
    {
        if (! in_array($testamentType, ['old', 'new'], true) || $chapterNumber < 1) {
            return false;
        }

        /** @var Collection<int, GaFamilyExamChapterScope> $scopes */
        $scopes = $this->relationLoaded('chapterScopes')
            ? $this->chapterScopes
            : $this->chapterScopes()->get();

        if ($scopes->isEmpty()) {
            return true;
        }

        return $scopes->contains(function (GaFamilyExamChapterScope $scope) use ($testamentType, $chapterNumber) {
            return (string) $scope->testament_type === $testamentType
                && (int) $scope->chapter_number === $chapterNumber;
        });
    }
}
