<?php

namespace App\Http\Controllers\Concerns;

use App\Services\LoginLockoutService;
use App\Support\ApiErrorCode;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

trait HandlesLoginLockout
{
    protected function loginLockout(): LoginLockoutService
    {
        return app(LoginLockoutService::class);
    }

    protected function lockedLoginResponse(Request $request, string $scope, string $identifier): ?JsonResponse
    {
        if (! $this->loginLockout()->isLocked($scope, $identifier, (string) $request->ip())) {
            return null;
        }

        return ApiResponse::error(
            'Too many attempts. Please try again later.',
            429,
            null,
            ApiErrorCode::AUTH_TOO_MANY_ATTEMPTS,
        );
    }

    protected function recordLoginFailure(Request $request, string $scope, string $identifier): void
    {
        $this->loginLockout()->recordFailure($scope, $identifier, (string) $request->ip());
    }

    protected function clearLoginFailures(Request $request, string $scope, string $identifier): void
    {
        $this->loginLockout()->clearFailures($scope, $identifier, (string) $request->ip());
    }
}
