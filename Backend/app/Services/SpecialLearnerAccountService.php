<?php

namespace App\Services;

use App\Models\SpecialLearner;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SpecialLearnerAccountService
{
    private const TEMP_LENGTH = 10;

    private const PERMANENT_LENGTH = 14;

    /**
     * Random temporary login password + random permanent password (no prefix; full string is hashed).
     *
     * @return array{temporary_password: string, permanent_password: string}
     */
    public function assignInitialPasswords(SpecialLearner $learner): array
    {
        $temporaryPassword = Str::random(self::TEMP_LENGTH);
        $permanentPassword = Str::random(self::PERMANENT_LENGTH);
        $learner->password = $temporaryPassword;
        $learner->permanent_password_secret_hash = Hash::make($permanentPassword);
        $learner->must_change_password = true;
        $learner->save();

        return [
            'temporary_password' => $temporaryPassword,
            'permanent_password' => $permanentPassword,
        ];
    }

    /**
     * @return array{temporary_password: string, permanent_password: string}
     */
    public function resetPassword(SpecialLearner $learner): array
    {
        $learner->tokens()->delete();

        return $this->assignInitialPasswords($learner);
    }

    public function learnerPermanentPasswordMatchesInput(SpecialLearner $learner, string $input): bool
    {
        $hash = $learner->permanent_password_secret_hash;
        if ($hash === null || $hash === '') {
            return false;
        }

        return Hash::check(trim($input), $hash);
    }
}
