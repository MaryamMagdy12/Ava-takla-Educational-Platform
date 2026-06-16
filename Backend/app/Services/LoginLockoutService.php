<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

final class LoginLockoutService
{
    public function isLocked(string $scope, string $identifier, string $ip): bool
    {
        if (! config('auth_lockout.enabled', true)) {
            return false;
        }

        $identifier = $this->normalizeIdentifier($identifier);
        if ($identifier === '') {
            return false;
        }

        return Cache::has($this->lockKey($scope, $identifier, $ip));
    }

    public function lockoutSecondsRemaining(string $scope, string $identifier, string $ip): int
    {
        $identifier = $this->normalizeIdentifier($identifier);

        return max(0, (int) Cache::get($this->lockKey($scope, $identifier, $ip).':ttl', 0));
    }

    public function recordFailure(string $scope, string $identifier, string $ip): void
    {
        if (! config('auth_lockout.enabled', true)) {
            return;
        }

        $identifier = $this->normalizeIdentifier($identifier);
        if ($identifier === '') {
            return;
        }

        $failKey = $this->failKey($scope, $identifier, $ip);
        $maxAttempts = max(1, (int) config('auth_lockout.max_attempts', 5));
        $decayMinutes = max(1, (int) config('auth_lockout.decay_minutes', 15));
        $lockoutMinutes = max(1, (int) config('auth_lockout.lockout_minutes', 15));

        $attempts = (int) Cache::get($failKey, 0) + 1;
        Cache::put($failKey, $attempts, now()->addMinutes($decayMinutes));

        if ($attempts >= $maxAttempts) {
            $lockKey = $this->lockKey($scope, $identifier, $ip);
            Cache::put($lockKey, true, now()->addMinutes($lockoutMinutes));
            Cache::put($lockKey.':ttl', now()->addMinutes($lockoutMinutes)->timestamp, now()->addMinutes($lockoutMinutes));
            Cache::forget($failKey);
        }
    }

    public function clearFailures(string $scope, string $identifier, string $ip): void
    {
        $identifier = $this->normalizeIdentifier($identifier);
        if ($identifier === '') {
            return;
        }

        Cache::forget($this->failKey($scope, $identifier, $ip));
        Cache::forget($this->lockKey($scope, $identifier, $ip));
        Cache::forget($this->lockKey($scope, $identifier, $ip).':ttl');
    }

    private function normalizeIdentifier(string $identifier): string
    {
        return mb_strtolower(trim($identifier));
    }

    private function failKey(string $scope, string $identifier, string $ip): string
    {
        return 'login_fail:'.$scope.':'.sha1($identifier.'|'.$ip);
    }

    private function lockKey(string $scope, string $identifier, string $ip): string
    {
        return 'login_lock:'.$scope.':'.sha1($identifier.'|'.$ip);
    }
}
