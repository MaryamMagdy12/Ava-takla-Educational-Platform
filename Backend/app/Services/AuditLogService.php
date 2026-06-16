<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditLogService
{
    public function log(
        string $action,
        ?Authenticatable $actor = null,
        ?Model $subject = null,
        ?array $properties = null,
        ?Request $request = null,
    ): void {
        $req = $request ?? request();

        AuditLog::query()->create([
            'action' => $action,
            'actor_type' => $actor ? $actor::class : null,
            'actor_id' => $actor?->getAuthIdentifier(),
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'ip_address' => $req?->ip(),
            'user_agent' => $req ? substr((string) $req->userAgent(), 0, 2000) : null,
            'properties' => $this->sanitizeProperties($properties),
            'created_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>|null  $properties
     * @return array<string, mixed>|null
     */
    private function sanitizeProperties(?array $properties): ?array
    {
        if ($properties === null) {
            return null;
        }

        return $this->stripSensitiveKeys($properties);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function stripSensitiveKeys(array $data): array
    {
        foreach ($data as $key => $value) {
            $k = strtolower((string) $key);
            if (str_contains($k, 'password') || str_contains($k, 'token') || str_contains($k, 'otp')) {
                unset($data[$key]);

                continue;
            }
            if (is_array($value)) {
                $data[$key] = $this->stripSensitiveKeys($value);
            }
        }

        return $data;
    }
}
