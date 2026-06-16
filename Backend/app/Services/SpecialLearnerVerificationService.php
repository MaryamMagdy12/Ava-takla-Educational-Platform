<?php

namespace App\Services;

use App\Mail\SpecialLearnerChurchReminderMail;
use App\Mail\SpecialLearnerVerifyEmailOtpMail;
use App\Models\SpecialLearner;
use App\Support\SanctumTokenIssuer;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class SpecialLearnerVerificationService
{
    private const CACHE_PREFIX = 'special_learner_email_otp:';

    private const PENDING_REG_PREFIX = 'special_learner_pending_reg:';

    private const PENDING_OTP_PREFIX = 'special_learner_otp_pending:';

    private const LOGIN_PENDING_PREFIX = 'special_learner_login_pending:';

    private const LOGIN_OTP_PREFIX = 'special_learner_login_otp:';

    private const TTL_SECONDS = 900;

    /**
     * New email sign-up: store profile in cache only, queue OTP email.
     * No database row until the user submits a valid OTP (verifyEmailAndIssueToken).
     *
     * @param  array{full_name: string, email: string, phone: string, address: string, age: int, birth_date: string, profile_picture_temp?: string|null}  $data
     */
    public function startPendingRegistration(array $data): void
    {
        $email = $this->normalizedEmail($data['email']);
        $payloadKey = $this->pendingPayloadKey($email);
        $otpKey = $this->pendingOtpKey($email);

        $previous = Cache::get($payloadKey);
        if (is_array($previous) && ! empty($previous['profile_picture_temp'])) {
            Storage::disk('local')->delete($previous['profile_picture_temp']);
        }

        Cache::put($payloadKey, [
            'full_name' => trim($data['full_name']),
            'phone' => trim($data['phone']),
            'address' => trim($data['address']),
            'age' => (int) $data['age'],
            'birth_date' => $data['birth_date'],
            'profile_picture_temp' => $data['profile_picture_temp'] ?? null,
        ], self::TTL_SECONDS);

        $otp = $this->storeOtp($otpKey);
        $this->sendOtpMailAfterResponse($email, trim($data['full_name']), $otp);
    }

    public function forgetPendingRegistration(string $email): void
    {
        $email = $this->normalizedEmail($email);
        $payloadKey = $this->pendingPayloadKey($email);
        $pending = Cache::get($payloadKey);
        if (is_array($pending) && ! empty($pending['profile_picture_temp'])) {
            Storage::disk('local')->delete($pending['profile_picture_temp']);
        }
        Cache::forget($payloadKey);
        Cache::forget($this->pendingOtpKey($email));
    }

    /**
     * @return bool True if an OTP was queued (pending registration or legacy unverified learner).
     */
    public function resendOtpForEmail(string $email): bool
    {
        $email = $this->normalizedEmail($email);
        $payloadKey = $this->pendingPayloadKey($email);
        $pending = Cache::get($payloadKey);

        if (is_array($pending)) {
            $otpKey = $this->pendingOtpKey($email);
            $otp = $this->storeOtp($otpKey);
            $this->sendOtpMailAfterResponse($email, $pending['full_name'], $otp);

            return true;
        }

        $learner = SpecialLearner::query()
            ->where('email', $email)
            ->whereNull('email_verified_at')
            ->first();

        if ($learner && $learner->status === 'active') {
            $this->sendOtp($learner);

            return true;
        }

        return false;
    }

    /**
     * @return array{learner: SpecialLearner, token: ?string, new_account: bool, activation_required?: bool}
     */
    public function verifyEmailAndIssueToken(string $email, string $otp): array
    {
        $email = $this->normalizedEmail($email);
        $pending = Cache::get($this->pendingPayloadKey($email));

        if (is_array($pending)) {
            return $this->createLearnerFromPending($email, $otp, $pending);
        }

        $learner = SpecialLearner::query()
            ->where('email', $email)
            ->whereNull('email_verified_at')
            ->first();

        if (! $learner || $learner->status !== 'active') {
            abort(422, 'Invalid or expired verification request.');
        }

        $out = $this->verifyAndIssueToken($learner, $otp);

        return ['learner' => $out['learner'], 'token' => $out['token'], 'new_account' => false, 'activation_required' => false];
    }

    public function sendOtp(SpecialLearner $learner): void
    {
        $key = self::CACHE_PREFIX.$learner->id;
        $otp = $this->storeOtp($key);
        $this->sendOtpMailAfterResponse($learner->email, $learner->full_name, $otp);
    }

    /**
     * @return array{learner: SpecialLearner, token: string}
     */
    public function verifyAndIssueToken(SpecialLearner $learner, string $otp): array
    {
        $this->consumeOtp(self::CACHE_PREFIX.$learner->id, $otp);

        $learner->email_verified_at = now();
        $learner->must_change_password = false;
        $learner->save();

        $token = SanctumTokenIssuer::rotatePersonalAccessToken($learner, 'special-learner-token');

        return ['learner' => $learner->fresh(), 'token' => $token];
    }

    /**
     * @param  array{full_name: string, phone: string, address: string, age: int, birth_date: string, profile_picture_temp?: string|null}  $pending
     * @return array{learner: SpecialLearner, token: null, new_account: bool, activation_required: true}
     */
    private function createLearnerFromPending(string $email, string $otp, array $pending): array
    {
        $otpKey = $this->pendingOtpKey($email);
        $payloadKey = $this->pendingPayloadKey($email);

        $this->consumeOtp($otpKey, $otp);

        if (SpecialLearner::query()->where('email', $email)->exists()) {
            if (! empty($pending['profile_picture_temp'])) {
                Storage::disk('local')->delete($pending['profile_picture_temp']);
            }
            Cache::forget($payloadKey);
            abort(422, 'An account with this email already exists.');
        }

        $temp = $pending['profile_picture_temp'] ?? null;
        if ($temp === null || $temp === '' || ! Storage::disk('local')->exists($temp)) {
            Cache::forget($payloadKey);
            abort(422, 'Profile photo is missing or expired. Please register again and upload your photo.');
        }

        $learner = SpecialLearner::query()->create([
            'full_name' => $pending['full_name'],
            'email' => $email,
            'phone' => $pending['phone'],
            'address' => $pending['address'],
            'age' => (int) ($pending['age'] ?? 0),
            'birth_date' => $pending['birth_date'] ?? null,
            'profile_picture' => '',
            'password' => Str::random(60),
            'permanent_password_secret_hash' => null,
            'must_change_password' => false,
            'status' => 'inactive',
            'email_verified_at' => now(),
        ]);

        $ext = strtolower(pathinfo($temp, PATHINFO_EXTENSION) ?: 'jpg');
        if (! in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true)) {
            $ext = 'jpg';
        }
        $dest = 'special-learners/'.$learner->id.'.'.$ext;
        Storage::disk('public')->put($dest, Storage::disk('local')->get($temp));
        Storage::disk('local')->delete($temp);
        $learner->profile_picture = $dest;
        $learner->save();

        Cache::forget($payloadKey);

        $learner = $learner->fresh();
        $this->queueChurchActivationReminderEmail($email, (string) $learner->full_name);

        return [
            'learner' => $learner,
            'token' => null,
            'new_account' => true,
            'activation_required' => true,
        ];
    }

    public function queueChurchActivationReminderEmail(string $email, string $learnerName): void
    {
        dispatch(function () use ($email, $learnerName) {
            try {
                Mail::to($email)->send(new SpecialLearnerChurchReminderMail($learnerName));
            } catch (Throwable $e) {
                Log::error('Special learner church-reminder mail failed.', [
                    'email' => $email,
                    'message' => $e->getMessage(),
                ]);
            }
        })->afterResponse();
    }

    private function normalizedEmail(string $email): string
    {
        return mb_strtolower(trim($email));
    }

    private function pendingPayloadKey(string $normalizedEmail): string
    {
        return self::PENDING_REG_PREFIX.hash('sha256', $normalizedEmail);
    }

    private function pendingOtpKey(string $normalizedEmail): string
    {
        return self::PENDING_OTP_PREFIX.hash('sha256', $normalizedEmail);
    }

    private function storeOtp(string $cacheKey): string
    {
        $otp = (string) random_int(100000, 999999);
        Cache::put(
            $cacheKey,
            ['hash' => hash('sha256', $otp), 'expires_at' => now()->addSeconds(self::TTL_SECONDS)->timestamp],
            self::TTL_SECONDS
        );

        return $otp;
    }

    private function consumeOtp(string $cacheKey, string $otp): void
    {
        $payload = Cache::get($cacheKey);
        if (! is_array($payload) || empty($payload['hash'])) {
            abort(422, 'Invalid or expired code.');
        }
        if (now()->timestamp > ($payload['expires_at'] ?? 0)) {
            Cache::forget($cacheKey);
            abort(422, 'Invalid or expired code.');
        }
        if (! hash_equals($payload['hash'], hash('sha256', $otp))) {
            abort(422, 'Invalid or expired code.');
        }
        Cache::forget($cacheKey);
    }

    /**
     * Send after the HTTP response so the client does not wait on SMTP (avoids 30s+ frontend timeouts).
     */
    private function sendOtpMailAfterResponse(string $email, string $recipientName, string $otp): void
    {
        dispatch(function () use ($email, $recipientName, $otp) {
            try {
                Mail::to($email)->send(new SpecialLearnerVerifyEmailOtpMail($recipientName, $otp));
            } catch (Throwable $e) {
                Log::error('Special learner OTP mail failed.', [
                    'email' => $email,
                    'message' => $e->getMessage(),
                ]);
            }
        })->afterResponse();
    }

    public function beginPasswordLoginOtpChallenge(SpecialLearner $learner): void
    {
        $email = $this->normalizedEmail($learner->email);
        $pendingKey = $this->loginPendingKey($email);
        $otpKey = $this->loginOtpKey($email);
        Cache::put($pendingKey, ['learner_id' => $learner->id], self::TTL_SECONDS);
        $otp = $this->storeOtp($otpKey);
        $this->sendOtpMailAfterResponse($learner->email, $learner->full_name, $otp);
    }

    /**
     * @return array{learner: SpecialLearner, token: string}
     */
    public function completePasswordLoginWithOtp(string $email, string $otp): array
    {
        $email = $this->normalizedEmail($email);
        $pendingKey = $this->loginPendingKey($email);
        $otpKey = $this->loginOtpKey($email);
        $pending = Cache::get($pendingKey);
        if (! is_array($pending) || empty($pending['learner_id'])) {
            abort(422, 'Invalid or expired verification request.');
        }

        $this->consumeOtp($otpKey, $otp);
        Cache::forget($pendingKey);

        $learner = SpecialLearner::query()->whereKey((int) $pending['learner_id'])->first();
        if (! $learner || $learner->status !== 'active' || $learner->email_verified_at === null) {
            abort(422, 'Account no longer available for sign-in.');
        }

        if ($this->normalizedEmail($learner->email) !== $email) {
            abort(422, 'Invalid or expired verification request.');
        }

        $learner->last_login_at = now();
        $learner->save();

        $token = SanctumTokenIssuer::rotatePersonalAccessToken($learner, 'special-learner-token');

        return ['learner' => $learner->fresh(), 'token' => $token];
    }

    /**
     * Resend login OTP when a password sign-in is pending. No-op if none (caller returns a generic message).
     */
    public function resendPasswordLoginOtp(string $email): void
    {
        $email = $this->normalizedEmail($email);
        $pendingKey = $this->loginPendingKey($email);
        $pending = Cache::get($pendingKey);
        if (! is_array($pending) || empty($pending['learner_id'])) {
            return;
        }

        $learner = SpecialLearner::query()->whereKey((int) $pending['learner_id'])->first();
        if (! $learner || $this->normalizedEmail($learner->email) !== $email) {
            return;
        }

        $otpKey = $this->loginOtpKey($email);
        $otp = $this->storeOtp($otpKey);
        $this->sendOtpMailAfterResponse($learner->email, $learner->full_name, $otp);
    }

    private function loginPendingKey(string $normalizedEmail): string
    {
        return self::LOGIN_PENDING_PREFIX.hash('sha256', $normalizedEmail);
    }

    private function loginOtpKey(string $normalizedEmail): string
    {
        return self::LOGIN_OTP_PREFIX.hash('sha256', $normalizedEmail);
    }
}
