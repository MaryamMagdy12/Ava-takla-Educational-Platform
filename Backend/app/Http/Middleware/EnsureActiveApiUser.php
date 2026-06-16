<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Models\GaFamily;
use App\Models\SpecialLearner;
use App\Models\Student;
use App\Support\ApiErrorCode;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveApiUser
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof Admin || $user instanceof Student || $user instanceof GaFamily || $user instanceof SpecialLearner) {
            if (($user->status ?? 'inactive') !== 'active') {
                $request->user()?->currentAccessToken()?->delete();

                return ApiResponse::error('Your account is inactive.', 403, null, ApiErrorCode::AUTH_ACCOUNT_INACTIVE);
            }

            if (
                $user instanceof Student
                && ($user->must_change_password ?? false) === true
                && ! $request->is('api/student/change-password', 'api/auth/me')
            ) {
                return ApiResponse::error('Password change is required before using the platform.', 403, null, ApiErrorCode::AUTH_PASSWORD_CHANGE_REQUIRED);
            }

            if (
                $user instanceof GaFamily
                && ($user->must_change_password ?? false) === true
                && ! $request->is('api/family/change-password', 'api/auth/me')
            ) {
                return ApiResponse::error('Password change is required before using the platform.', 403, null, ApiErrorCode::AUTH_PASSWORD_CHANGE_REQUIRED);
            }

            if ($user instanceof SpecialLearner && $user->email_verified_at === null) {
                $request->user()?->currentAccessToken()?->delete();

                return ApiResponse::error('Please verify your account before continuing.', 403, null, ApiErrorCode::AUTH_ACCOUNT_NOT_READY);
            }

            if (
                $user instanceof SpecialLearner
                && ($user->must_change_password ?? false) === true
                && ! $request->is('api/special/change-password', 'api/auth/me')
            ) {
                return ApiResponse::error('Password change is required before using the platform.', 403, null, ApiErrorCode::AUTH_PASSWORD_CHANGE_REQUIRED);
            }
        }

        return $next($request);
    }
}

