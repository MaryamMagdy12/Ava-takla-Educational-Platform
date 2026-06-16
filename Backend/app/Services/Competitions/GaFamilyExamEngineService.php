<?php

namespace App\Services\Competitions;

use App\Exceptions\ApiHttpException;
use App\Models\GaFamily;
use App\Models\GaFamilyExam;
use App\Models\GaFamilyExamAttempt;
use App\Models\GaFamilyExamAttemptAnswer;
use App\Models\GaFamilyExamAttemptQuestion;
use App\Models\GaFamilyExamQuestion;
use App\Services\Concerns\ValidatesAttemptAnswers;
use App\Support\ApiErrorCode;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class GaFamilyExamEngineService
{
    use ValidatesAttemptAnswers;
    public function startAttempt(GaFamilyExam $exam, GaFamily $family): GaFamilyExamAttempt
    {
        $now = now();
        if ($exam->status !== 'published') {
            ApiHttpException::throw(422, 'This exam is not available.', ApiErrorCode::EXAM_NOT_AVAILABLE);
        }
        if ($now->lt(Carbon::parse($exam->available_from)) || $now->gt(Carbon::parse($exam->available_to))) {
            ApiHttpException::throw(422, 'This exam is not available now.', ApiErrorCode::EXAM_NOT_AVAILABLE);
        }

        return DB::transaction(function () use ($exam, $family, $now) {
            GaFamily::query()->whereKey($family->id)->lockForUpdate()->first();
            $existing = GaFamilyExamAttempt::query()
                ->where('exam_id', $exam->id)
                ->where('family_id', $family->id)
                ->first();

            if ($existing) {
                if ($existing->status !== 'in_progress') {
                    ApiHttpException::throw(422, 'You already have an attempt for this exam.', ApiErrorCode::EXAM_ALREADY_ATTEMPTED);
                }
                if ($existing->attemptQuestions()->exists()) {
                    return $existing->fresh();
                }
                $existing->delete();
            }

            $allowedEnd = $now->clone()->addMinutes((int) $exam->duration_minutes);
            $availableTo = Carbon::parse($exam->available_to);
            if ($availableTo->lt($allowedEnd)) {
                $allowedEnd = $availableTo;
            }

            try {
                $attempt = GaFamilyExamAttempt::query()->create([
                    'exam_id' => $exam->id,
                    'family_id' => $family->id,
                    'started_at' => $now,
                    'allowed_end_time' => $allowedEnd,
                    'status' => 'in_progress',
                ]);
            } catch (QueryException $e) {
                if ($this->isDuplicateAttemptConstraint($e)) {
                    ApiHttpException::throw(422, 'You already have an attempt for this exam.', ApiErrorCode::EXAM_ALREADY_ATTEMPTED);
                }

                $race = GaFamilyExamAttempt::query()
                    ->where('exam_id', $exam->id)
                    ->where('family_id', $family->id)
                    ->first();
                if ($race && $race->status === 'in_progress' && $race->attemptQuestions()->exists()) {
                    return $race->fresh();
                }
                throw $e;
            }

            $selected = $this->pickQuestionsByRules($exam);
            if ($selected->isEmpty()) {
                abort(422, 'لا توجد أسئلة كافية ضمن نطاق الأصحاحات وإعدادات الامتحان.');
            }

            $rows = [];
            foreach ($selected->values() as $idx => $question) {
                $optionIds = $question->options->pluck('id')->map(fn ($id) => (int) $id)->all();
                shuffle($optionIds);
                $correctOption = $question->options->firstWhere('is_correct', true);
                $rows[] = [
                    'attempt_id' => $attempt->id,
                    'question_id' => $question->id,
                    'testament_type' => $question->testament_type,
                    'chapter_number' => $question->chapter_number,
                    'question_order' => $idx + 1,
                    'option_display_order' => json_encode(array_values($optionIds)),
                    'correct_option_id' => $correctOption ? (int) $correctOption->id : null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            GaFamilyExamAttemptQuestion::query()->insert($rows);

            return $attempt->fresh();
        });
    }

    /**
     * @param  array<int, array{question_id:int,selected_option_id?:int|null}>  $answers
     */
    public function submitAttempt(GaFamilyExamAttempt $attempt, array $answers): GaFamilyExamAttempt
    {
        return DB::transaction(function () use ($attempt, $answers) {
            $attempt->refresh();
            if ($attempt->status !== 'in_progress') {
                ApiHttpException::throw(422, 'This attempt is already finished.', ApiErrorCode::EXAM_ATTEMPT_FINISHED);
            }

            if (now()->gt(Carbon::parse($attempt->allowed_end_time))) {
                $attempt->status = 'expired';
                $attempt->submitted_at = now();
                $attempt->save();
            }

            $attemptQuestions = GaFamilyExamAttemptQuestion::query()
                ->where('attempt_id', $attempt->id)
                ->with('question.options')
                ->orderBy('question_order')
                ->get()
                ->keyBy('question_id');

            $pastDeadline = now()->gt(Carbon::parse($attempt->allowed_end_time));
            if (! $pastDeadline) {
                $this->validateAndNormalizeSubmittedAnswers($attemptQuestions, $answers);
            }

            $score = 0;
            $upserts = [];
            foreach ($answers as $answer) {
                $questionId = (int) ($answer['question_id'] ?? 0);
                $selectedOptionId = $answer['selected_option_id'] ?? null;
                $aq = $attemptQuestions->get($questionId);
                if (! $aq) {
                    continue;
                }
                $question = $aq->question;
                $correctOptionId = $this->resolveCorrectOptionId($aq, $question);
                $isCorrect = $correctOptionId !== null && (int) $selectedOptionId === $correctOptionId;
                if ($isCorrect) {
                    $score++;
                }
                $upserts[] = [
                    'attempt_id' => $attempt->id,
                    'question_id' => $questionId,
                    'selected_option_id' => $selectedOptionId,
                    'is_correct' => $isCorrect,
                    'feedback' => $isCorrect ? $question->feedback_correct : $question->feedback_wrong,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            if ($upserts !== []) {
                GaFamilyExamAttemptAnswer::query()->upsert(
                    $upserts,
                    ['attempt_id', 'question_id'],
                    ['selected_option_id', 'is_correct', 'feedback', 'updated_at']
                );
            }

            $maxScore = $attemptQuestions->count();
            $attempt->score = $score;
            $attempt->max_score = $maxScore;
            $attempt->percentage = $maxScore > 0 ? round(($score / $maxScore) * 100, 2) : 0;
            $attempt->status = $attempt->status === 'expired' ? 'expired' : 'submitted';
            $attempt->submitted_at = now();
            $attempt->save();

            return $attempt->fresh();
        });
    }

    private function pickQuestionsByRules(GaFamilyExam $exam): Collection
    {
        $chapterScopes = $exam->chapterScopes()->get();
        if ($chapterScopes->isNotEmpty()) {
            return $this->pickQuestionsByChapterScopes($exam, $chapterScopes);
        }

        $scopeMap = $chapterScopes
            ->groupBy('testament_type')
            ->map(fn (Collection $rows) => $rows->pluck('chapter_number')->map(fn ($x) => (int) $x)->unique()->values());

        $rules = $exam->rules()->get();
        if ($rules->isEmpty()) {
            $query = GaFamilyExamQuestion::query()
                ->where(function (Builder $q) use ($exam) {
                    $q->whereNull('exam_id')
                        ->orWhere('exam_id', $exam->id);
                })
                ->where('status', 'active')
                ->with('options');

            $this->applyScopeToQuestionQuery($query, $scopeMap);

            return $query
                ->inRandomOrder()
                ->get();
        }

        $selected = collect();
        foreach ($rules as $rule) {
            $allowedChapters = $scopeMap->get($rule->testament_type, collect())->values();
            $hasScope = $scopeMap->isNotEmpty();
            if ($hasScope && $allowedChapters->isEmpty()) {
                $label = $rule->testament_type === 'old' ? 'العهد القديم' : 'العهد الجديد';
                abort(422, "لا توجد أصحاحات محددة للامتحان ضمن {$label}.");
            }
            if ($hasScope && $rule->chapter_number !== null && ! $allowedChapters->contains((int) $rule->chapter_number)) {
                $label = $rule->testament_type === 'old' ? 'العهد القديم' : 'العهد الجديد';
                abort(422, "الأصحاح {$rule->chapter_number} في {$label} غير موجود ضمن نطاق الامتحان المحدد.");
            }

            $query = GaFamilyExamQuestion::query()
                ->where(function (Builder $q) use ($exam) {
                    $q->whereNull('exam_id')
                        ->orWhere('exam_id', $exam->id);
                })
                ->where('status', 'active')
                ->where('testament_type', $rule->testament_type)
                ->with('options');

            if ($hasScope) {
                if ($rule->chapter_number !== null) {
                    $query->where('chapter_number', (int) $rule->chapter_number);
                } else {
                    $query->whereIn('chapter_number', $allowedChapters->all());
                }
            } elseif ($rule->chapter_number !== null) {
                $query->where('chapter_number', $rule->chapter_number);
            }
            if ($rule->difficulty !== null) {
                $query->where('difficulty', $rule->difficulty);
            }
            $picked = $query->inRandomOrder()->limit((int) $rule->question_count)->get();
            if ($picked->count() < (int) $rule->question_count) {
                $testamentLabel = $rule->testament_type === 'old' ? 'العهد القديم' : 'العهد الجديد';
                $chapterLabel = $rule->chapter_number !== null ? "، الأصحاح {$rule->chapter_number}" : '';
                abort(422, "عدد الأسئلة غير كافٍ في {$testamentLabel}{$chapterLabel} حسب إعدادات السحب.");
            }
            $selected = $selected->merge($picked);
        }

        return $selected->shuffle()->values();
    }

    private function pickQuestionsByChapterScopes(GaFamilyExam $exam, Collection $chapterScopes): Collection
    {
        $requestedByScope = $this->buildRequestedCountByScope($exam, $chapterScopes);
        $selected = collect();

        foreach ($chapterScopes->values() as $scope) {
            $testamentType = (string) $scope->testament_type;
            $chapterNumber = (int) $scope->chapter_number;
            $scopeKey = $this->scopeKey($testamentType, $chapterNumber);
            $requested = $requestedByScope->get($scopeKey);

            $base = GaFamilyExamQuestion::query()
                ->where(function (Builder $q) use ($exam) {
                    $q->whereNull('exam_id')
                        ->orWhere('exam_id', $exam->id);
                })
                ->where('status', 'active')
                ->where('testament_type', $testamentType)
                ->where('chapter_number', $chapterNumber);

            if ($requested === null) {
                $picked = (clone $base)
                    ->inRandomOrder()
                    ->with('options')
                    ->get();
            } else {
                $limit = max(0, (int) $requested);
                if ($limit === 0) {
                    continue;
                }
                $available = (clone $base)->count();
                if ($available === 0) {
                    continue;
                }
                $limit = min($limit, $available);
                $picked = (clone $base)
                    ->inRandomOrder()
                    ->with('options')
                    ->limit($limit)
                    ->get();
            }

            if ($picked->isNotEmpty()) {
                $selected = $selected->merge($picked);
            }
        }

        return $selected->shuffle()->values();
    }

    private function buildRequestedCountByScope(GaFamilyExam $exam, Collection $chapterScopes): Collection
    {
        $scopes = $chapterScopes->values();
        $legacyTotal = max(0, (int) ($exam->question_count ?? 0));
        $explicitTotal = 0;
        $missingKeys = [];
        $requestedByScope = collect();

        foreach ($scopes as $scope) {
            $scopeKey = $this->scopeKey((string) $scope->testament_type, (int) $scope->chapter_number);
            $scopeQuestionCount = max(0, (int) ($scope->question_count ?? 0));
            if ($scopeQuestionCount > 0) {
                $requestedByScope->put($scopeKey, $scopeQuestionCount);
                $explicitTotal += $scopeQuestionCount;
            } else {
                $missingKeys[] = $scopeKey;
            }
        }

        if ($missingKeys === []) {
            return $requestedByScope;
        }

        if ($explicitTotal === 0 && $legacyTotal === 0) {
            foreach ($missingKeys as $scopeKey) {
                $requestedByScope->put($scopeKey, null);
            }

            return $requestedByScope;
        }

        $remaining = max(0, ($legacyTotal > 0 ? $legacyTotal : $explicitTotal) - $explicitTotal);
        $missingCount = count($missingKeys);
        $base = $missingCount > 0 ? intdiv($remaining, $missingCount) : 0;
        $remainder = $missingCount > 0 ? $remaining % $missingCount : 0;

        foreach ($missingKeys as $idx => $scopeKey) {
            $requestedByScope->put($scopeKey, $base + ($idx < $remainder ? 1 : 0));
        }

        return $requestedByScope;
    }

    private function scopeKey(string $testamentType, int $chapterNumber): string
    {
        return $testamentType.'#'.$chapterNumber;
    }

    private function applyScopeToQuestionQuery(Builder $query, Collection $scopeMap): void
    {
        if ($scopeMap->isEmpty()) {
            return;
        }

        $query->where(function ($nested) use ($scopeMap) {
            foreach ($scopeMap as $testament => $chapters) {
                $chapterValues = collect($chapters)->map(fn ($x) => (int) $x)->filter(fn ($x) => $x > 0)->values();
                if ($chapterValues->isEmpty()) {
                    continue;
                }

                $nested->orWhere(function ($part) use ($testament, $chapterValues) {
                    $part->where('testament_type', $testament)
                        ->whereIn('chapter_number', $chapterValues->all());
                });
            }
        });
    }
}
