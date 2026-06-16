<?php

namespace App\Support;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;

class SanctumTokenIssuer
{
    /**
     * Revoke all personal access tokens, stamp activity, issue a fresh token.
     */
    public static function rotatePersonalAccessToken(Authenticatable $user, string $tokenName): string
    {
        if (method_exists($user, 'tokens')) {
            $user->tokens()->delete();
        }

        if ($user instanceof Model) {
            $user->forceFill(['last_activity_at' => now()])->save();
        }

        /** @var \Laravel\Sanctum\Contracts\HasApiTokens $user */
        return $user->createToken($tokenName)->plainTextToken;
    }

    /**
     * Stamp last activity without rotating (e.g. after OTP step before token exists).
     */
    public static function touchActivity(Authenticatable $user): void
    {
        if ($user instanceof Model) {
            $user->forceFill(['last_activity_at' => now()])->save();
        }
    }
}
