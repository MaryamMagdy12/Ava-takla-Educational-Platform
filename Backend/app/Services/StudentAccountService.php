<?php

namespace App\Services;

use App\Models\Level;
use App\Models\Student;
use App\Support\PermanentPasswordMatcher;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class StudentAccountService
{
    private const PERMANENT_SECRET_LENGTH = 14;

    public function createStudent(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $level = Level::query()->whereKey($data['level_id'])->lockForUpdate()->firstOrFail();
            $effectiveTrackId = $data['track_id'] ?? $level->track_id;
            $normalizedName = $this->normalizeFullName($data['full_name']);

            $duplicateExists = Student::query()
                ->where('level_id', $level->id)
                ->where('track_id', $effectiveTrackId)
                ->whereRaw('LOWER(TRIM(full_name)) = ?', [mb_strtolower($normalizedName)])
                ->lockForUpdate()
                ->exists();

            if ($duplicateExists) {
                throw ValidationException::withMessages([
                    'full_name' => ['A student with the same full name already exists in this level and track.'],
                ]);
            }

            $nextSerial = (int) Student::query()
                ->where('level_id', $level->id)
                ->lockForUpdate()
                ->max('serial_number') + 1;

            $studentUniqueId = $level->code_prefix.str_pad((string) $nextSerial, 4, '0', STR_PAD_LEFT);
            $tempPassword = Str::random(10);
            $prefix = $this->permanentPasswordPrefixForLevel($level);
            $secret = $this->generatePermanentPasswordSecret();
            $permanentPassword = $prefix.$secret;

            $student = Student::query()->create([
                'level_id' => $level->id,
                'track_id' => $effectiveTrackId,
                'full_name' => $normalizedName,
                'email' => $data['email'] ?? null,
                'parent_name' => $this->nullableTrimmedString($data['parent_name'] ?? null),
                'parent_phone' => $this->nullableTrimmedString($data['parent_phone'] ?? null),
                'parent_email' => $this->nullableTrimmedString($data['parent_email'] ?? null),
                'student_unique_id' => $studentUniqueId,
                'serial_number' => $nextSerial,
                'password' => $tempPassword,
                'permanent_password_secret_hash' => Hash::make($secret),
                'status' => $data['status'] ?? 'active',
                'must_change_password' => true,
            ]);

            return [$student, $tempPassword, $permanentPassword];
        });
    }

    /**
     * @return array{temporary_password: string, permanent_password: string}
     */
    public function resetPassword(Student $student): array
    {
        $tempPassword = Str::random(10);
        $secret = $this->generatePermanentPasswordSecret();
        $student->password = $tempPassword;
        $student->permanent_password_secret_hash = Hash::make($secret);
        $student->must_change_password = true;
        $student->save();
        $student->tokens()->delete();
        $student->loadMissing('level');

        $prefix = $this->permanentPasswordPrefixForLevel($student->level);

        return [
            'temporary_password' => $tempPassword,
            'permanent_password' => $prefix.$secret,
        ];
    }

    /**
     * Legacy deterministic formula (prefix + first 3 letters of first name + student id).
     */
    public function derivePermanentPassword(Level $level, string $normalizedFullName, string $studentUniqueId): string
    {
        return $this->legacyDerivePermanentPassword($level, $normalizedFullName, $studentUniqueId);
    }

    /**
     * Whether the given string is the student's permanent password (legacy formula or prefix + secret verified against hash).
     */
    public function studentPermanentPasswordMatchesInput(Student $student, string $input): bool
    {
        $student->loadMissing('level');
        if (! $student->level) {
            return false;
        }

        if ($student->hasLegacyPermanentPassword()) {
            try {
                $official = $this->legacyDerivePermanentPassword(
                    $student->level,
                    $student->full_name,
                    $student->student_unique_id
                );
            } catch (ValidationException) {
                return false;
            }

            return PermanentPasswordMatcher::matchesLegacyStructured($official, $input);
        }

        try {
            $prefix = $this->permanentPasswordPrefixForLevel($student->level);
        } catch (ValidationException) {
            return false;
        }

        return $this->hashedSecretTailMatches($prefix, $input, $student->permanent_password_secret_hash);
    }

    /**
     * Plaintext permanent password only exists for legacy accounts (derivable). Always null for random-secret accounts.
     */
    public function plainPermanentPasswordForStudent(Student $student): ?string
    {
        if (! $student->hasLegacyPermanentPassword()) {
            return null;
        }
        $student->loadMissing('level');
        if (! $student->level) {
            return null;
        }

        try {
            return $this->legacyDerivePermanentPassword(
                $student->level,
                $student->full_name,
                $student->student_unique_id
            );
        } catch (ValidationException) {
            return null;
        }
    }

    private function legacyDerivePermanentPassword(Level $level, string $normalizedFullName, string $studentUniqueId): string
    {
        $prefix = $this->permanentPasswordPrefixForLevel($level);
        $nameKey = $this->firstThreeLettersFromStudentName($normalizedFullName);

        return $prefix.$nameKey.$studentUniqueId;
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

    private function permanentPasswordPrefixForLevel(Level $level): string
    {
        $stored = trim((string) ($level->permanent_password_prefix ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        $map = config('student_accounts.permanent_password_prefixes_by_level_name', []);
        if (! is_array($map)) {
            $map = [];
        }
        $target = mb_strtolower(trim($level->name));
        foreach ($map as $levelName => $prefix) {
            if (mb_strtolower(trim((string) $levelName)) === $target) {
                return (string) $prefix;
            }
        }

        throw ValidationException::withMessages([
            'level_id' => ['No permanent password prefix is set for level: '.$level->name.'. Add it on the level or in config/student_accounts.php.'],
        ]);
    }

    private function generatePermanentPasswordSecret(): string
    {
        return Str::random(self::PERMANENT_SECRET_LENGTH);
    }

    /**
     * First three characters of the first word (Arabic or English), uppercased where applicable, padded with X to length 3.
     */
    private function firstThreeLettersFromStudentName(string $normalizedFullName): string
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

    private function normalizeFullName(string $fullName): string
    {
        $fullName = preg_replace('/\s+/u', ' ', trim($fullName)) ?? trim($fullName);

        return $fullName;
    }

    private function nullableTrimmedString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);

        return $s === '' ? null : $s;
    }
}
