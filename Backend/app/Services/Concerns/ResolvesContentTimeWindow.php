<?php

namespace App\Services\Concerns;

use Carbon\Carbon;

trait ResolvesContentTimeWindow
{
    protected function assertWithinAvailability(Carbon $now, Carbon $availableFrom, Carbon $availableTo): void
    {
        if ($now->lt($availableFrom)) {
            abort(422, 'This content is not yet available.');
        }
        if ($now->gt($availableTo)) {
            abort(422, 'This content is no longer available.');
        }
    }

    protected function computeResponseDeadline(
        Carbon $startedAt,
        Carbon $availableTo,
        ?int $responseDurationMinutes,
    ): Carbon {
        $deadline = $availableTo->clone();
        if ($responseDurationMinutes !== null && $responseDurationMinutes > 0) {
            $byDuration = $startedAt->clone()->addMinutes($responseDurationMinutes);
            if ($byDuration->lt($deadline)) {
                $deadline = $byDuration;
            }
        }

        return $deadline;
    }
}
