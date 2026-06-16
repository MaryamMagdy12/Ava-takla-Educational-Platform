<?php

namespace Tests\Unit;

use App\Services\StudentCredentialsExportService;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StudentCredentialsExportServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('private');
        config(['student_accounts.password_export_enabled' => true]);
    }

    public function test_stores_and_reads_bulk_export_on_private_disk(): void
    {
        $service = new StudentCredentialsExportService;
        $credentials = [
            ['student_unique_id' => 'ABCD1234', 'temporary_password' => 'temp', 'permanent_password' => 'perm'],
        ];

        $token = $service->storeBulkExport(7, $credentials);
        $this->assertNotNull($token);

        $payload = $service->readBulkExport((string) $token);
        $this->assertIsArray($payload);
        $this->assertSame(7, $payload['admin_id']);
        $this->assertSame($credentials, $payload['credentials']);
        $path = 'student-credential-exports/'.$token.'.json';
        $this->assertTrue(Storage::disk('private')->exists($path));
    }

    public function test_returns_null_when_export_disabled(): void
    {
        config(['student_accounts.password_export_enabled' => false]);
        $service = new StudentCredentialsExportService;

        $this->assertNull($service->storeBulkExport(1, [['student_unique_id' => 'ABCD1234']]));
    }
}
