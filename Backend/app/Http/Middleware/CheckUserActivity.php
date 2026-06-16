<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Models\GaFamily;
use App\Models\SpecialLearner;
use App\Models\Student;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckUserActivity
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof Admin && ! $user instanceof Student && ! $user instanceof GaFamily && ! $user instanceof SpecialLearner) {
            return $next($request);
        }

        $timeout = (int) config('session_activity.inactivity_timeout_minutes', 120);
        if ($timeout <= 0) {
            return $next($request);
        }

        if ($user->last_activity_at === null) {
            $user->forceFill(['last_activity_at' => now()])->save();

            return $next($request);
        }

        $now = now();
        if ($user->last_activity_at->lt($now->copy()->subMinutes($timeout))) {
            $request->user()?->currentAccessToken()?->delete();

            return ApiResponse::error('Session expired due to inactivity', 401);
        }

        $writeEvery = (int) config('session_activity.write_throttle_minutes', 5);
        if ($writeEvery <= 0 || $user->last_activity_at->lte($now->copy()->subMinutes($writeEvery))) {
            $user->forceFill(['last_activity_at' => $now])->save();
        }

        return $next($request);
    }
}
