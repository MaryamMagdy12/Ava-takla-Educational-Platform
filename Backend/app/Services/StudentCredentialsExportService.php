<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class StudentCredentialsExportService
{
    /**
     * @param  list<array<string, mixed>>  $credentials
     */
    public function storeBulkExport(int $adminId, array $credentials): ?string
    {
        if (! config('student_accounts.password_export_enabled', true)) {
            return null;
        }

        if ($credentials === []) {
            return null;
        }

        $token = (string) Str::uuid();
        $relativePath = 'student-credential-exports/'.$token.'.json';

        Storage::disk('private')->put($relativePath, json_encode([
            'exported_at' => now()->toIso8601String(),
            'admin_id' => $adminId,
            'credentials' => $credentials,
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        return $token;
    }

    /**
     * @return array{exported_at: string, admin_id: int, credentials: list<array<string, mixed>>}|null
     */
    public function readBulkExport(string $token): ?array
    {
        if (! preg_match('/^[0-9a-f\-]{36}$/i', $token)) {
            return null;
        }

        $relativePath = 'student-credential-exports/'.$token.'.json';
        if (! Storage::disk('private')->exists($relativePath)) {
            return null;
        }

        $decoded = json_decode((string) Storage::disk('private')->get($relativePath), true);

        return is_array($decoded) ? $decoded : null;
    }

    public function deleteBulkExport(string $token): void
    {
        if (! preg_match('/^[0-9a-f\-]{36}$/i', $token)) {
            return;
        }

        Storage::disk('private')->delete('student-credential-exports/'.$token.'.json');
    }
}
