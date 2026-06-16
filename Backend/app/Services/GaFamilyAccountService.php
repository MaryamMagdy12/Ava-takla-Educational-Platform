<?php

namespace App\Services;

use App\Models\GaFamily;
use App\Support\PermanentPasswordMatcher;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

class GaFamilyAccountService
{
    private const FAMILY_PERMANENT_PREFIX = 'Ga#';

    private const PERMANENT_SECRET_LENGTH = 14;

    /**
     * @return array{0: GaFamily, 1: string, 2: string} family, temporary plain, permanent plain
     */
    public function createFamily(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $loginId = $this->generateUniqueLoginId();
            $normalizedName = $this->normalizeDisplayName($data['display_name']);
            $tempPassword = Str::random(10);
            $secret = $this->generatePermanentPasswordSecret();
            $permanentPassword = self::FAMILY_PERMANENT_PREFIX.$secret;

            $family = GaFamily::query()->create([
                'family_login_id' => $loginId,
                'display_name' => $normalizedName,
                'password' => $tempPassword,
                'permanent_password_secret_hash' => Hash::make($secret),
                'status' => $data['status'] ?? 'active',
                'must_change_password' => $data['must_change_password'] ?? true,
            ]);

            return [$family, $tempPassword, $permanentPassword];
        });
    }

    /**
     * @return array{temporary_password: string, permanent_password: string}
     */
    public function resetPassword(GaFamily $family): array
    {
        $tempPassword = Str::random(10);
        $secret = $this->generatePermanentPasswordSecret();
        $family->password = $tempPassword;
        $family->permanent_password_secret_hash = Hash::make($secret);
        $family->must_change_password = true;
        $family->save();
        $family->tokens()->delete();

        return [
            'temporary_password' => $tempPassword,
            'permanent_password' => self::FAMILY_PERMANENT_PREFIX.$secret,
        ];
    }

    public function familyPermanentPasswordMatchesInput(GaFamily $family, string $input): bool
    {
        if ($family->hasLegacyPermanentPassword()) {
            try {
                $official = $this->legacyDerivePermanentPassword(
                    $this->normalizeDisplayName($family->display_name),
                    $family->family_login_id
                );
            } catch (\Throwable) {
                return false;
            }

            return PermanentPasswordMatcher::matchesLegacyStructured($official, $input);
        }

        return $this->hashedSecretTailMatches(
            self::FAMILY_PERMANENT_PREFIX,
            $input,
            $family->permanent_password_secret_hash
        );
    }

    /**
     * Plaintext permanent password only for legacy accounts.
     */
    public function plainPermanentPasswordForFamily(GaFamily $family): ?string
    {
        if (! $family->hasLegacyPermanentPassword()) {
            return null;
        }

        try {
            return $this->legacyDerivePermanentPassword(
                $this->normalizeDisplayName($family->display_name),
                $family->family_login_id
            );
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Legacy formula: Ga# + first 3 letters of first word + family_login_id (8 digits).
     */
    public function derivePermanentPassword(string $normalizedDisplayName, string $familyLoginId): string
    {
        return $this->legacyDerivePermanentPassword($normalizedDisplayName, $familyLoginId);
    }

    private function legacyDerivePermanentPassword(string $normalizedDisplayName, string $familyLoginId): string
    {
        $nameKey = $this->firstThreeLettersFromName($normalizedDisplayName);

        return self::FAMILY_PERMANENT_PREFIX.$nameKey.$familyLoginId;
    }

    private function hashedSecretTailMatches(string $prefix, string $input, ?string $hash): bool
    {
        if ($hash === null || $hash === '') {
            return false;
        }
        $input = trim($input);
        $prefixLen = mb_strlen($prefix);
        $secretLen = self::PERMANENT_SECRET_LENGTH;
        if (mb_strlen($input) !== $prefixLen + $secretLen) {
            return false;
        }
        if (mb_strtolower(mb_substr($input, 0, $prefixLen)) !== mb_strtolower($prefix)) {
            return false;
        }
        $candidate = mb_substr($input, $prefixLen);

        return Hash::check($candidate, $hash);
    }

    private function generatePermanentPasswordSecret(): string
    {
        return Str::random(self::PERMANENT_SECRET_LENGTH);
    }

    private function generateUniqueLoginId(): string
    {
        for ($i = 0; $i < 50; $i++) {
            $id = (string) random_int(10_000_000, 99_999_999);
            if (! GaFamily::query()->where('family_login_id', $id)->exists()) {
                return $id;
            }
        }

        throw ValidationException::withMessages([
            'family_login_id' => ['Could not allocate a unique family login ID. Try again.'],
        ]);
    }

    private function normalizeDisplayName(string $displayName): string
    {
        return preg_replace('/\s+/u', ' ', trim($displayName)) ?? trim($displayName);
    }

    private function firstThreeLettersFromName(string $normalizedFullName): string
    {
        $parts = preg_split('/\s+/u', trim($normalizedFullName)) ?: [];
        $firstWord = (string) ($parts[0] ?? '');
        if ($firstWord === '') {
            return 'XXX';
        }

        $slice = mb_strtoupper(mb_substr($firstWord, 0, 3));
        while (mb_strlen($slice) < 3) {
            $slice .= 'X';
        }

        return $slice;
    }
}
