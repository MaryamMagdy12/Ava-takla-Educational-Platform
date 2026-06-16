<?php

namespace Tests\Unit;

use App\Services\LoginLockoutService;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class LoginLockoutServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'auth_lockout.enabled' => true,
            'auth_lockout.max_attempts' => 3,
            'auth_lockout.lockout_minutes' => 10,
            'auth_lockout.decay_minutes' => 10,
        ]);
        Cache::flush();
    }

    public function test_locks_after_max_failures(): void
    {
        $service = new LoginLockoutService;

        $this->assertFalse($service->isLocked('student', 'abcd1234', '127.0.0.1'));

        $service->recordFailure('student', 'abcd1234', '127.0.0.1');
        $service->recordFailure('student', 'abcd1234', '127.0.0.1');
        $this->assertFalse($service->isLocked('student', 'abcd1234', '127.0.0.1'));

        $service->recordFailure('student', 'abcd1234', '127.0.0.1');
        $this->assertTrue($service->isLocked('student', 'abcd1234', '127.0.0.1'));
    }

    public function test_clear_failures_removes_lock(): void
    {
        $service = new LoginLockoutService;

        foreach (range(1, 3) as $_) {
            $service->recordFailure('admin', 'admin@example.test', '10.0.0.2');
        }

        $this->assertTrue($service->isLocked('admin', 'admin@example.test', '10.0.0.2'));

        $service->clearFailures('admin', 'admin@example.test', '10.0.0.2');

        $this->assertFalse($service->isLocked('admin', 'admin@example.test', '10.0.0.2'));
    }
}
