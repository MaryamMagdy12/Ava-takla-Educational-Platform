<?php

namespace App\Support;

class FieldValidation
{
    /**
     * Egyptian-style mobile number: exactly 11 digits and starts with 0.
     *
     * @return array<int, string>
     */
    public static function phone11StartsWithZero(): array
    {
        return [
            'string',
            'size:11',
            'regex:/^0\d{10}$/',
        ];
    }

    /**
     * Real-looking address check:
     * - keeps common address characters only,
     * - has at least one letter,
     * - has at least two words.
     *
     * @return array<int, mixed>
     */
    public static function realisticAddress(int $max = 255): array
    {
        return [
            'string',
            'min:8',
            'max:'.$max,
            'regex:/^(?=.*\p{L})[\p{L}\p{N}\s,\.\-\/#()]+$/u',
            function (string $attribute, mixed $value, \Closure $fail): void {
                $clean = preg_replace('/\s+/u', ' ', trim((string) $value)) ?? '';
                $parts = preg_split('/\s+/u', $clean, -1, PREG_SPLIT_NO_EMPTY) ?: [];
                if (count($parts) < 2) {
                    $fail('The '.$attribute.' must include a detailed real address.');
                }
            },
        ];
    }
}
