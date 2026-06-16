<?php

namespace Tests\Unit;

use App\Support\AdminDashboardCache;
use App\Support\PublicCatalogCache;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class DashboardAndCatalogCacheTest extends TestCase
{
    public function test_admin_dashboard_cache_forget_clears_keys(): void
    {
        Cache::put(AdminDashboardCache::STUDENT_KEY, ['cached' => true], 300);
        Cache::put(AdminDashboardCache::GA_KEY, ['cached' => true], 300);

        AdminDashboardCache::forgetStudent();
        $this->assertFalse(Cache::has(AdminDashboardCache::STUDENT_KEY));
        $this->assertTrue(Cache::has(AdminDashboardCache::GA_KEY));

        AdminDashboardCache::forgetGa();
        $this->assertFalse(Cache::has(AdminDashboardCache::GA_KEY));

        Cache::put(AdminDashboardCache::STUDENT_KEY, ['cached' => true], 300);
        Cache::put(AdminDashboardCache::GA_KEY, ['cached' => true], 300);
        AdminDashboardCache::forgetAll();
        $this->assertFalse(Cache::has(AdminDashboardCache::STUDENT_KEY));
        $this->assertFalse(Cache::has(AdminDashboardCache::GA_KEY));
    }

    public function test_public_catalog_cache_forget_all_clears_keys(): void
    {
        foreach ([
            PublicCatalogCache::SPECIAL_COURSES_KEY,
            PublicCatalogCache::GA_COURSES_KEY,
            PublicCatalogCache::GA_LECTURES_KEY,
        ] as $key) {
            Cache::put($key, ['items' => []], 300);
        }

        PublicCatalogCache::forgetAll();

        $this->assertFalse(Cache::has(PublicCatalogCache::SPECIAL_COURSES_KEY));
        $this->assertFalse(Cache::has(PublicCatalogCache::GA_COURSES_KEY));
        $this->assertFalse(Cache::has(PublicCatalogCache::GA_LECTURES_KEY));
    }
}
