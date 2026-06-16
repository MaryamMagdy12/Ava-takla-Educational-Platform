<?php

namespace App\Support;

/**
 * Relaxed matching for the legacy permanent password (prefix + 3 name letters + 8-char id).
 */
final class PermanentPasswordMatcher
{
    private const ID_LENGTH = 8;

    private const NAME_LENGTH = 3;

    public static function matchesLegacyStructured(string $official, string $input): bool
    {
        $official = trim($official);
        $input = trim($input);
        if ($official === '' || $input === '') {
            return false;
        }
        if (hash_equals($official, $input)) {
            return true;
        }
        if (mb_strlen($official) !== mb_strlen($input)) {
            return false;
        }
        $suffixLen = self::ID_LENGTH + self::NAME_LENGTH;
        if (mb_strlen($official) < $suffixLen) {
            return false;
        }

        $idOfficial = mb_substr($official, -self::ID_LENGTH);
        $idInput = mb_substr($input, -self::ID_LENGTH);
        if (! hash_equals($idOfficial, $idInput)) {
            return false;
        }

        $nameOfficial = mb_substr($official, -$suffixLen, self::NAME_LENGTH);
        $nameInput = mb_substr($input, -$suffixLen, self::NAME_LENGTH);
        $prefixOfficial = mb_substr($official, 0, -$suffixLen);
        $prefixInput = mb_substr($input, 0, -$suffixLen);

        if (mb_strtolower($prefixOfficial) !== mb_strtolower($prefixInput)) {
            return false;
        }

        return self::nameKeyMatches($nameOfficial, $nameInput);
    }

    private static function nameKeyMatches(string $official, string $input): bool
    {
        if ($official === $input) {
            return true;
        }
        if (mb_strtolower($official) === mb_strtolower($input)) {
            return true;
        }

        $sortedOfficial = self::sortedLowerGraphemes($official);
        $sortedInput = self::sortedLowerGraphemes($input);
        if ($sortedOfficial === $sortedInput) {
            return true;
        }

        if (self::isAsciiLettersOnly($official) && self::isAsciiLettersOnly($input)
            && mb_strlen($official) === self::NAME_LENGTH && mb_strlen($input) === self::NAME_LENGTH) {
            return levenshtein(mb_strtolower($official), mb_strtolower($input)) <= 1;
        }

        return false;
    }

    /**
     * @return list<string>
     */
    private static function sortedLowerGraphemes(string $s): array
    {
        $chars = mb_str_split(mb_strtolower($s));
        sort($chars);

        return $chars;
    }

    private static function isAsciiLettersOnly(string $s): bool
    {
        return (bool) preg_match('/^[A-Za-z]+$/', $s);
    }
}
