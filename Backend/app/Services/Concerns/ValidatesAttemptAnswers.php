<?php

namespace App\Services\Concerns;

use App\Exceptions\ApiHttpException;
use App\Support\ApiErrorCode;
use Illuminate\Support\Collection;

trait ValidatesAttemptAnswers
{
    /**
     * @param  Collection<int|string, mixed>  $attemptQuestions  keyed by question id
     * @param  array<int, array<string, mixed>>  $answers
     * @return Collection<int, array<string, mixed>> keyed by question id
     */
    protected function validateAndNormalizeSubmittedAnswers(
        Collection $attemptQuestions,
        array $answers,
        string $questionIdKey = 'question_id',
        string $optionIdKey = 'selected_option_id',
        string $incompleteMessage = 'Please answer all questions before submitting.',
        string $invalidMessage = 'One or more submitted answers are invalid. Please refresh and try again.',
        string $incompleteErrorCode = ApiErrorCode::EXAM_INCOMPLETE_ANSWERS,
        string $invalidErrorCode = ApiErrorCode::EXAM_INVALID_ANSWER,
    ): Collection {
        $answersByQuestionId = collect($answers)->keyBy(fn ($a) => (int) ($a[$questionIdKey] ?? 0));

        foreach ($attemptQuestions as $questionId => $attemptQuestion) {
            $qid = (int) $questionId;
            $row = $answersByQuestionId->get($qid);
            if ($row === null) {
                ApiHttpException::throw(422, $incompleteMessage, $incompleteErrorCode);
            }
            $opt = $row[$optionIdKey] ?? null;
            if ($opt === null || $opt === '') {
                ApiHttpException::throw(422, $incompleteMessage, $incompleteErrorCode);
            }

            $this->assertOptionBelongsToAttemptQuestion($attemptQuestion, (int) $opt, $invalidMessage, $invalidErrorCode);
        }

        foreach ($answers as $answer) {
            $questionId = (int) ($answer[$questionIdKey] ?? 0);
            if ($questionId < 1) {
                ApiHttpException::throw(422, $invalidMessage, $invalidErrorCode);
            }
            if (! $attemptQuestions->has($questionId)) {
                ApiHttpException::throw(422, $invalidMessage, $invalidErrorCode);
            }
            $optionId = (int) ($answer[$optionIdKey] ?? 0);
            if ($optionId < 1) {
                ApiHttpException::throw(422, $invalidMessage, $invalidErrorCode);
            }
            $this->assertOptionBelongsToAttemptQuestion(
                $attemptQuestions->get($questionId),
                $optionId,
                $invalidMessage,
                $invalidErrorCode,
            );
        }

        return $answersByQuestionId;
    }

    protected function assertOptionBelongsToAttemptQuestion(
        mixed $attemptQuestion,
        int $optionId,
        string $invalidMessage,
        string $invalidErrorCode,
    ): void {
        $order = $attemptQuestion->option_display_order ?? null;
        if (is_string($order)) {
            $order = json_decode($order, true);
        }
        if (is_array($order) && $order !== []) {
            $allowed = array_map('intval', $order);
            if (! in_array($optionId, $allowed, true)) {
                ApiHttpException::throw(422, $invalidMessage, $invalidErrorCode);
            }

            return;
        }

        $question = $attemptQuestion->question ?? null;
        if ($question && $question->relationLoaded('options')) {
            if (! $question->options->contains('id', $optionId)) {
                ApiHttpException::throw(422, $invalidMessage, $invalidErrorCode);
            }
        }
    }

    protected function resolveCorrectOptionId(mixed $attemptQuestion, mixed $question): ?int
    {
        $snapshot = $attemptQuestion->correct_option_id ?? null;
        if ($snapshot !== null) {
            return (int) $snapshot;
        }

        if ($question && $question->relationLoaded('options')) {
            $correct = $question->options->firstWhere('is_correct', true);

            return $correct ? (int) $correct->id : null;
        }

        return null;
    }

    protected function isDuplicateAttemptConstraint(\Illuminate\Database\QueryException $e): bool
    {
        $sqlState = (string) ($e->errorInfo[0] ?? '');
        $driverCode = (int) ($e->errorInfo[1] ?? 0);

        return $sqlState === '23000' || $driverCode === 1062;
    }
}
