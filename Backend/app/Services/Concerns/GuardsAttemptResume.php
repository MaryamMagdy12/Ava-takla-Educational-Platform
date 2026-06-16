<?php

namespace App\Services\Concerns;

use App\Exceptions\ApiHttpException;
use App\Support\ApiErrorCode;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

trait GuardsAttemptResume
{
    protected function assertAttemptResumable(
        Model $attempt,
        string $deadlineColumn = 'allowed_end_time',
        string $expiredErrorCode = ApiErrorCode::EXAM_ATTEMPT_EXPIRED,
        string $finishedErrorCode = ApiErrorCode::EXAM_ATTEMPT_FINISHED,
    ): void {
        if ($attempt->status !== 'in_progress') {
            ApiHttpException::throw(422, 'This attempt is already finished.', $finishedErrorCode);
        }

        $deadlineValue = $attempt->{$deadlineColumn} ?? null;
        if ($deadlineValue === null) {
            return;
        }

        if (now()->gt(Carbon::parse($deadlineValue))) {
            $attempt->status = 'expired';
            if ($attempt->submitted_at === null) {
                $attempt->submitted_at = now();
            }
            $attempt->save();

            ApiHttpException::throw(422, 'This attempt has expired.', $expiredErrorCode);
        }
    }
}
