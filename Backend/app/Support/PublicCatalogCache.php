<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

final class PublicCatalogCache
{
    public const SPECIAL_COURSES_KEY = 'public_catalog_special_courses_v1';

    public const GA_COURSES_KEY = 'public_catalog_ga_courses_v1';

    public const GA_LECTURES_KEY = 'public_catalog_ga_lectures_v1';

    public static function forgetAll(): void
    {
        Cache::forget(self::SPECIAL_COURSES_KEY);
        Cache::forget(self::GA_COURSES_KEY);
        Cache::forget(self::GA_LECTURES_KEY);
    }
}
