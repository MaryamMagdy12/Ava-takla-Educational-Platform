<?php

namespace App\Services;

use App\Mail\StudentPasswordResetOtpMail;
use App\Models\Student;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

class StudentPasswordResetService
{
    public function __construct(
        private readonly StudentAccountService $studentAccountService
    ) {}

    private const CACHE_PREFIX = 'student_pw_otp:';

    private const TTL_SECONDS = 900;

    public function requestOtp(string $studentUniqueId): void
    {
        $student = Student::query()->where('student_unique_id', $studentUniqueId)->first();
        if (! $student || ! $student->email) {
            return;
        }

        $otp = (string) random_int(100000, 999999);
        Cache::put(
            self::CACHE_PREFIX.$student->id,
            ['hash' => hash('sha256', $otp), 'expires_at' => now()->addSeconds(self::TTL_SECONDS)->timestamp],
            self::TTL_SECONDS
        );

        Mail::to($student->email)->send(new StudentPasswordResetOtpMail($student->full_name, $otp));
    }

    public function verifyAndSetPassword(string $studentUniqueId, string $otp, string $newPassword): void
    {
        $student = Student::query()->where('student_unique_id', $studentUniqueId)->firstOrFail();
        $payload = Cache::get(self::CACHE_PREFIX.$student->id);
        if (! is_array($payload) || empty($payload['hash'])) {
            abort(422, 'Invalid or expired code.');
        }
        if (now()->timestamp > ($payload['expires_at'] ?? 0)) {
            Cache::forget(self::CACHE_PREFIX.$student->id);
            abort(422, 'Invalid or expired code.');
        }
        if (! hash_equals($payload['hash'], hash('sha256', $otp))) {
            abort(422, 'Invalid or expired code.');
        }

        if (! $this->studentAccountService->studentPermanentPasswordMatchesInput($student, $newPassword)) {
            $msg = $student->hasLegacyPermanentPassword()
                ? 'Password must match your official permanent password for this account (legacy format rules apply). Ask your administrator if you do not have it.'
                : 'Password must match your official permanent password for this account (prefix and secret exactly as issued). Ask your administrator if you do not have it.';
            abort(422, $msg);
        }

        $student->password = $newPassword;
        $student->must_change_password = false;
        $student->save();
        $student->tokens()->delete();
        Cache::forget(self::CACHE_PREFIX.$student->id);
    }
}
