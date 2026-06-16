<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

final class AdminDashboardCache
{
    public const STUDENT_KEY = 'admin_dashboard_student_v5';

    public const GA_KEY = 'admin_dashboard_ga_v1';

    public static function forgetStudent(): void
    {
        Cache::forget(self::STUDENT_KEY);
    }

    public static function forgetGa(): void
    {
        Cache::forget(self::GA_KEY);
    }

    public static function forgetAll(): void
    {
        self::forgetStudent();
        self::forgetGa();
    }
}
