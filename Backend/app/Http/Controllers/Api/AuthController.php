<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\HandlesLoginLockout;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminResource;
use App\Models\Admin;
use App\Models\GaFamily;
use App\Models\SpecialLearner;
use App\Models\Student;
use App\Services\AuditLogService;
use App\Services\GaFamilyAccountService;
use App\Services\SpecialGoogleIdTokenService;
use App\Services\SpecialLearnerAccountService;
use App\Services\SpecialLearnerVerificationService;
use App\Services\StudentAccountService;
use App\Services\StudentPasswordResetService;
use App\Support\FieldValidation;
use App\Support\ApiErrorCode;
use App\Support\ApiResponse;
use App\Support\SecureUploadRules;
use App\Support\SanctumTokenIssuer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use HandlesLoginLockout;

    public function __construct(
        private readonly StudentPasswordResetService $studentPasswordResetService,
        private readonly StudentAccountService $studentAccountService,
        private readonly GaFamilyAccountService $gaFamilyAccountService,
        private readonly SpecialLearnerAccountService $specialLearnerAccountService,
        private readonly SpecialLearnerVerificationService $specialLearnerVerificationService,
        private readonly SpecialGoogleIdTokenService $specialGoogleIdTokenService,
        private readonly AuditLogService $auditLogService,
    ) {}

    public function adminLogin(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $loginKey = mb_strtolower(trim($data['login']));
        if ($locked = $this->lockedLoginResponse($request, 'admin', $loginKey)) {
            return $locked;
        }

        $admin = Admin::query()
            ->where('email', $data['login'])
            ->orWhere('username', $data['login'])
            ->first();

        if (! $admin || ! Hash::check($data['password'], $admin->password) || $admin->status !== 'active') {
            $this->recordLoginFailure($request, 'admin', $loginKey);

            return ApiResponse::error('Invalid login credentials.', 401, null, ApiErrorCode::AUTH_INVALID_CREDENTIALS);
        }

        $this->clearLoginFailures($request, 'admin', $loginKey);

        $admin->last_login_at = now();
        $admin->save();

        $token = SanctumTokenIssuer::rotatePersonalAccessToken($admin, 'admin-token');
        $this->auditLogService->log('admin.login', $admin, null, [], $request);

        return response()->json([
            'success' => true,
            'message' => 'Authenticated.',
            'data' => [
                'token' => $token,
                'user' => (new AdminResource($admin->fresh()))->resolve(),
                'role' => $admin->admin_role ?? Admin::ROLE_SUPER,
                'allowed_interfaces' => $admin->allowedInterfaces(),
                'default_interface' => $admin->defaultInterfaceSlug(),
            ],
        ]);
    }

    public function studentLogin(Request $request)
    {
        $data = $request->validate([
            'student_unique_id' => ['required', 'string', 'size:8'],
            'password' => ['required', 'string'],
        ]);

        $studentKey = mb_strtolower(trim($data['student_unique_id']));
        if ($locked = $this->lockedLoginResponse($request, 'student', $studentKey)) {
            return $locked;
        }

        $student = Student::query()
            ->where('student_unique_id', $data['student_unique_id'])
            ->with('level')
            ->first();

        if (! $student || $student->status !== 'active') {
            $this->recordLoginFailure($request, 'student', $studentKey);

            return ApiResponse::error('Invalid login credentials.', 401, null, ApiErrorCode::AUTH_INVALID_CREDENTIALS);
        }

        $plain = $data['password'];
        $hashMatches = Hash::check($plain, $student->password);
        $permanentMatches = $this->studentAccountService->studentPermanentPasswordMatchesInput($student, $plain);

        if (! $hashMatches && ! $permanentMatches) {
            $this->recordLoginFailure($request, 'student', $studentKey);

            return ApiResponse::error('Invalid login credentials.', 401, null, ApiErrorCode::AUTH_INVALID_CREDENTIALS);
        }

        $this->clearLoginFailures($request, 'student', $studentKey);

        if ($permanentMatches && ! $hashMatches) {
            $student->password = $plain;
            $student->must_change_password = false;
            $student->save();
        }

        $student->load(['level', 'track']);

        $token = SanctumTokenIssuer::rotatePersonalAccessToken($student, 'student-token');
        $this->auditLogService->log('student.login', $student, null, [], $request);

        return response()->json([
            'success' => true,
            'message' => 'Authenticated.',
            'data' => [
                'token' => $token,
                'must_change_password' => $student->must_change_password,
                'user' => $student,
            ],
        ]);
    }

    public function familyLogin(Request $request)
    {
        $data = $request->validate([
            'family_login_id' => ['required', 'string', 'size:8'],
            'password' => ['required', 'string'],
        ]);

        $familyKey = mb_strtolower(trim($data['family_login_id']));
        if ($locked = $this->lockedLoginResponse($request, 'family', $familyKey)) {
            return $locked;
        }

        $family = GaFamily::query()
            ->where('family_login_id', $data['family_login_id'])
            ->first();

        if (! $family || $family->status !== 'active') {
            $this->recordLoginFailure($request, 'family', $familyKey);

            return ApiResponse::error('Invalid login credentials.', 401, null, ApiErrorCode::AUTH_INVALID_CREDENTIALS);
        }

        $plain = $data['password'];
        $hashMatches = Hash::check($plain, $family->password);
        $permanentMatches = $this->gaFamilyAccountService->familyPermanentPasswordMatchesInput($family, $plain);

        if (! $hashMatches && ! $permanentMatches) {
            $this->recordLoginFailure($request, 'family', $familyKey);

            return ApiResponse::error('Invalid login credentials.', 401, null, ApiErrorCode::AUTH_INVALID_CREDENTIALS);
        }

        $this->clearLoginFailures($request, 'family', $familyKey);

        if ($permanentMatches && ! $hashMatches) {
            $family->password = $plain;
            $family->must_change_password = false;
            $family->save();
        }

        $family->last_login_at = now();
        $family->save();

        $token = SanctumTokenIssuer::rotatePersonalAccessToken($family, 'family-token');
        $this->auditLogService->log('ga_family.login', $family, null, [], $request);

        return response()->json([
            'success' => true,
            'message' => 'Authenticated.',
            'data' => [
                'token' => $token,
                'must_change_password' => $family->must_change_password,
                'user' => $family,
            ],
        ]);
    }

    public function familyChangePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'confirmed'],
        ]);
        /** @var GaFamily $family */
        $family = $request->user();
        $legacyFamily = $family->hasLegacyPermanentPassword();
        $currentOk = Hash::check($data['current_password'], $family->password)
            || $this->gaFamilyAccountService->familyPermanentPasswordMatchesInput($family, $data['current_password']);
        if (! $currentOk) {
            return ApiResponse::error('Current password is incorrect.', 422);
        }

        if (! $this->gaFamilyAccountService->familyPermanentPasswordMatchesInput($family, $data['new_password'])) {
            return ApiResponse::error(
                $legacyFamily
                    ? 'New password must match your official permanent password (Ga#… as issued for your account). For the legacy format you may use different capital or small letters, change the order of the three name letters, or one letter may differ for English names.'
                    : 'New password must match your official permanent password (Ga#… as issued for your account). The secret part must match exactly (same letters and capitalization as issued).',
                422
            );
        }

        $family->password = $data['new_password'];
        $family->must_change_password = false;
        $family->save();
        $family->tokens()->where('id', '!=', $request->user()->currentAccessToken()?->id)->delete();

        return ApiResponse::success(null, 'Password updated.');
    }

    public function specialRegister(Request $request)
    {
        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'phone' => ['required', ...FieldValidation::phone11StartsWithZero()],
            'address' => ['required', ...FieldValidation::realisticAddress(255)],
            'age' => ['required', 'integer', 'min:3', 'max:120'],
            'birth_date' => ['required', 'date', 'before:today', 'after:1900-01-01'],
            'profile_picture' => ['required', 'file', SecureUploadRules::imageRule()],
        ]);

        $this->assertQuadripartiteFullName('full_name', $data['full_name']);
        $fullNameNormalized = preg_replace('/\s+/u', ' ', trim($data['full_name']));

        $email = mb_strtolower(trim($data['email']));
        $existing = SpecialLearner::query()->where('email', $email)->first();

        if ($existing && $existing->email_verified_at !== null) {
            return ApiResponse::error('An account with this email already exists. Sign in or use password reset.', 422);
        }

        if ($existing && $existing->email_verified_at === null) {
            $this->specialLearnerVerificationService->forgetPendingRegistration($email);
            $existing->tokens()->delete();
            $existing->forceDelete();
        }

        SecureUploadRules::rejectDangerousUpload($request->file('profile_picture'));
        $tempPath = $request->file('profile_picture')->store('special_reg_pending', 'local');

        $this->specialLearnerVerificationService->startPendingRegistration([
            'full_name' => $fullNameNormalized,
            'email' => $email,
            'phone' => $data['phone'],
            'address' => $data['address'],
            'age' => (int) $data['age'],
            'birth_date' => $data['birth_date'],
            'profile_picture_temp' => $tempPath,
        ]);
        $this->auditLogService->log('special_learner.registration_code_sent', null, null, ['email' => $email], $request);

        return response()->json([
            'success' => true,
            'message' => 'We sent a verification code to your email. Enter it to finish creating your account.',
            'data' => [
                'email' => $email,
            ],
        ], 200);
    }

    public function specialVerifyEmail(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'otp' => ['required', 'string', 'size:6'],
        ]);
        $email = mb_strtolower(trim($data['email']));
        $result = $this->specialLearnerVerificationService->verifyEmailAndIssueToken($email, $data['otp']);

        if ($result['new_account']) {
            $this->auditLogService->log('special_learner.registered', null, $result['learner'], ['email' => $email], $request);
        }
        $this->auditLogService->log('special_learner.email_verified', null, $result['learner'], [], $request);

        if (! empty($result['activation_required'])) {
            return response()->json([
                'success' => true,
                'message' => 'Email verified. Your account is created but must be activated by the church before you can sign in. You will receive your sign-in passwords from the church when they activate your account (they are not sent by email beforehand).',
                'data' => [
                    'activation_required' => true,
                    'token' => null,
                    'must_change_password' => $result['learner']->must_change_password,
                    'user' => $result['learner'],
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Email verified.',
            'data' => [
                'token' => $result['token'],
                'activation_required' => false,
                'must_change_password' => $result['learner']->must_change_password,
                'user' => $result['learner'],
            ],
        ]);
    }

    public function specialResendVerification(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);
        $email = mb_strtolower(trim($data['email']));
        $this->specialLearnerVerificationService->resendOtpForEmail($email);

        return ApiResponse::success(
            null,
            'If this email has a pending registration or an unverified account, a new code was sent.'
        );
    }

    public function specialRegisterWithGoogle(Request $request)
    {
        $rules = [
            'credential' => ['required', 'string'],
            'full_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', ...FieldValidation::phone11StartsWithZero()],
            'address' => ['required', ...FieldValidation::realisticAddress(255)],
            'age' => ['required', 'integer', 'min:3', 'max:120'],
            'birth_date' => ['required', 'date', 'before:today', 'after:1900-01-01'],
            'profile_picture' => ['nullable', 'file', SecureUploadRules::imageRule()],
            'profile_picture_url' => ['nullable', 'string', 'max:2048', 'url'],
        ];
        $data = $request->validate($rules);

        $this->assertQuadripartiteFullName('full_name', $data['full_name']);
        $fullNameNormalized = preg_replace('/\s+/u', ' ', trim($data['full_name']));

        $google = $this->specialGoogleIdTokenService->verifyAndDecode($data['credential']);
        $email = $google['email'];

        $profilePicture = null;
        if ($request->hasFile('profile_picture')) {
            SecureUploadRules::rejectDangerousUpload($request->file('profile_picture'));
            $profilePicture = $request->file('profile_picture')->store('special-learners', 'public');
        } elseif (! empty($data['profile_picture_url'] ?? null)) {
            $profilePicture = $data['profile_picture_url'];
        } elseif (! empty($google['picture'])) {
            $profilePicture = $google['picture'];
        }

        if ($profilePicture === null || $profilePicture === '') {
            return ApiResponse::error('A profile photo is required. Upload an image, provide profile_picture_url, or use a Google account that includes a profile picture.', 422);
        }

        $existing = SpecialLearner::query()->where('email', $email)->first();
        if ($existing) {
            if ($existing->email_verified_at === null) {
                return ApiResponse::error('This email is already registered but not verified. Use email verification or complete verification first.', 422);
            }
            if ($existing->status !== 'active') {
                return ApiResponse::error('Your account is verified but not activated yet. Please contact the church office to activate it before signing in.', 403);
            }
            if ($existing->google_id !== null && $existing->google_id !== $google['sub']) {
                return ApiResponse::error('This account is linked to a different Google profile.', 403);
            }
            if ($existing->google_id === null) {
                $existing->google_id = $google['sub'];
            }
            $existing->save();
            $this->specialLearnerVerificationService->beginPasswordLoginOtpChallenge($existing);
            $this->auditLogService->log('special_learner.login_otp_sent', $existing, null, ['via' => 'google'], $request);

            return response()->json([
                'success' => true,
                'message' => 'We sent a verification code to your email. Enter it to finish signing in.',
                'data' => [
                    'requires_otp' => true,
                    'email' => mb_strtolower(trim($existing->email)),
                ],
            ]);
        }

        $learner = SpecialLearner::query()->create([
            'full_name' => $fullNameNormalized,
            'email' => $email,
            'phone' => trim($data['phone']),
            'address' => trim($data['address']),
            'age' => (int) $data['age'],
            'birth_date' => $data['birth_date'],
            'profile_picture' => $profilePicture,
            'password' => Str::random(60),
            'permanent_password_secret_hash' => null,
            'must_change_password' => false,
            'status' => 'inactive',
            'email_verified_at' => now(),
            'google_id' => $google['sub'],
        ]);

        $this->specialLearnerVerificationService->queueChurchActivationReminderEmail(
            $learner->email,
            (string) $learner->full_name,
        );
        $this->auditLogService->log('special_learner.registered_google', null, $learner->fresh(), [], $request);

        return response()->json([
            'success' => true,
            'message' => 'Account created. Your account must be activated by the church before you can sign in. Sign-in passwords are issued when the church activates your account.',
            'data' => [
                'activation_required' => true,
                'token' => null,
                'must_change_password' => false,
                'user' => $learner->fresh(),
            ],
        ], 201);
    }

    public function specialLogin(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);
        $email = mb_strtolower(trim($data['email']));
        if ($locked = $this->lockedLoginResponse($request, 'special', $email)) {
            return $locked;
        }

        $learner = SpecialLearner::query()->where('email', $email)->first();

        if (! $learner) {
            $this->recordLoginFailure($request, 'special', $email);

            return ApiResponse::error('Invalid login credentials.', 401, null, ApiErrorCode::AUTH_INVALID_CREDENTIALS);
        }

        if ($learner->email_verified_at === null) {
            return ApiResponse::error('Please verify your account before continuing.', 403, null, ApiErrorCode::AUTH_ACCOUNT_NOT_READY);
        }

        if ($learner->status !== 'active') {
            return ApiResponse::error('Your account is not ready yet. Please contact support.', 403, null, ApiErrorCode::AUTH_ACCOUNT_NOT_READY);
        }

        $plain = $data['password'];
        $hashMatches = Hash::check($plain, $learner->password);
        $permanentMatches = $this->specialLearnerAccountService->learnerPermanentPasswordMatchesInput($learner, $plain);

        if (! $hashMatches && ! $permanentMatches) {
            $this->recordLoginFailure($request, 'special', $email);

            return ApiResponse::error('Invalid login credentials.', 401, null, ApiErrorCode::AUTH_INVALID_CREDENTIALS);
        }

        $this->clearLoginFailures($request, 'special', $email);

        if ($permanentMatches && ! $hashMatches) {
            $learner->password = $plain;
            $learner->must_change_password = false;
            $learner->save();
        }

        $this->specialLearnerVerificationService->beginPasswordLoginOtpChallenge($learner);
        $this->auditLogService->log('special_learner.login_otp_sent', $learner, null, [], $request);

        return response()->json([
            'success' => true,
            'message' => 'We sent a verification code to your email. Enter it to finish signing in.',
            'data' => [
                'requires_otp' => true,
                'email' => $email,
            ],
        ]);
    }

    public function specialVerifyLogin(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'otp' => ['required', 'string', 'size:6'],
        ]);
        $email = mb_strtolower(trim($data['email']));
        $result = $this->specialLearnerVerificationService->completePasswordLoginWithOtp($email, $data['otp']);
        $this->auditLogService->log('special_learner.login', $result['learner'], null, [], $request);

        return response()->json([
            'success' => true,
            'message' => 'Authenticated.',
            'data' => [
                'token' => $result['token'],
                'must_change_password' => $result['learner']->must_change_password,
                'user' => $result['learner'],
            ],
        ]);
    }

    public function specialResendLoginOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);
        $email = mb_strtolower(trim($data['email']));
        $this->specialLearnerVerificationService->resendPasswordLoginOtp($email);

        return ApiResponse::success(null, 'If a sign-in is pending for this email, a new code was sent.');
    }

    public function specialLoginWithGoogle(Request $request)
    {
        $data = $request->validate([
            'credential' => ['required', 'string'],
        ]);

        $google = $this->specialGoogleIdTokenService->verifyAndDecode($data['credential']);
        $learner = SpecialLearner::query()->where('email', $google['email'])->first();

        if (! $learner) {
            return ApiResponse::error('Invalid login credentials.', 401, null, ApiErrorCode::AUTH_INVALID_CREDENTIALS);
        }

        if ($learner->email_verified_at === null) {
            return ApiResponse::error('Please verify your account before continuing.', 403, null, ApiErrorCode::AUTH_ACCOUNT_NOT_READY);
        }

        if ($learner->status !== 'active') {
            return ApiResponse::error('Your account is not ready yet. Please contact support.', 403, null, ApiErrorCode::AUTH_ACCOUNT_NOT_READY);
        }

        if ($learner->google_id === null) {
            $learner->google_id = $google['sub'];
            $learner->save();
        } elseif ($learner->google_id !== $google['sub']) {
            return ApiResponse::error('This account is linked to a different Google profile.', 403);
        }

        $this->specialLearnerVerificationService->beginPasswordLoginOtpChallenge($learner);
        $this->auditLogService->log('special_learner.login_otp_sent', $learner, null, ['via' => 'google'], $request);

        return response()->json([
            'success' => true,
            'message' => 'We sent a verification code to your email. Enter it to finish signing in.',
            'data' => [
                'requires_otp' => true,
                'email' => mb_strtolower(trim($learner->email)),
            ],
        ]);
    }

    public function specialChangePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);
        /** @var SpecialLearner $learner */
        $learner = $request->user();
        $currentOk = Hash::check($data['current_password'], $learner->password)
            || $this->specialLearnerAccountService->learnerPermanentPasswordMatchesInput($learner, $data['current_password']);
        if (! $currentOk) {
            return ApiResponse::error('Current password is incorrect.', 422);
        }

        if (! $this->specialLearnerAccountService->learnerPermanentPasswordMatchesInput($learner, $data['new_password'])) {
            return ApiResponse::error(
                'New password must match your official permanent password (the random password issued for your account). Use the same letters and capitalization as in your welcome email.',
                422
            );
        }

        $learner->password = $data['new_password'];
        $learner->must_change_password = false;
        $learner->save();
        $learner->tokens()->where('id', '!=', $request->user()->currentAccessToken()?->id)->delete();

        return ApiResponse::success(null, 'Password updated.');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return ApiResponse::success(null, 'Logged out.');
    }

    public function studentChangePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'confirmed'],
        ]);
        $student = $request->user();
        $legacyStudent = $student->hasLegacyPermanentPassword();
        $currentOk = Hash::check($data['current_password'], $student->password)
            || $this->studentAccountService->studentPermanentPasswordMatchesInput($student, $data['current_password']);
        if (! $currentOk) {
            return ApiResponse::error('Current password is incorrect.', 422);
        }

        if (! $this->studentAccountService->studentPermanentPasswordMatchesInput($student, $data['new_password'])) {
            return ApiResponse::error(
                $legacyStudent
                    ? 'New password must match your official permanent password (the one issued for your account). For the legacy format you may use different capital or small letters, change the order of the three name letters, or one letter may differ for English names.'
                    : 'New password must match your official permanent password (the one issued for your account). The secret part must match exactly (same letters and capitalization as issued).',
                422
            );
        }

        $student->password = $data['new_password'];
        $student->must_change_password = false;
        $student->save();
        $student->tokens()->where('id', '!=', $request->user()->currentAccessToken()?->id)->delete();

        return ApiResponse::success(null, 'Password updated.');
    }

    /**
     * Sends a 6-digit OTP to the student's email (if on file). Response is always generic.
     */
    public function studentPasswordResetRequest(Request $request)
    {
        $request->validate([
            'student_unique_id' => ['required', 'string', 'size:8'],
        ]);
        $this->studentPasswordResetService->requestOtp($request->string('student_unique_id'));

        return ApiResponse::success(
            null,
            'If an account exists with this ID and has an email on file, a reset code was sent.'
        );
    }

    public function studentPasswordResetVerify(Request $request)
    {
        $data = $request->validate([
            'student_unique_id' => ['required', 'string', 'size:8'],
            'otp' => ['required', 'string', 'size:6'],
            'password' => ['required', 'string', 'confirmed'],
        ]);
        $this->studentPasswordResetService->verifyAndSetPassword(
            $data['student_unique_id'],
            $data['otp'],
            $data['password']
        );

        return ApiResponse::success(null, 'Password has been reset. You can sign in now.');
    }

    /**
     * Authenticated principal for all Sanctum API roles (SPA gate).
     */
    public function me(Request $request)
    {
        $user = $request->user();

        if ($user instanceof Admin) {
            return response()->json([
                'success' => true,
                'data' => [
                    'kind' => 'admin',
                    'role' => $user->admin_role ?? Admin::ROLE_SUPER,
                    'user' => (new AdminResource($user))->resolve(),
                    'allowed_interfaces' => $user->allowedInterfaces(),
                    'default_interface' => $user->defaultInterfaceSlug(),
                ],
            ]);
        }

        if ($user instanceof Student) {
            return response()->json([
                'success' => true,
                'data' => [
                    'kind' => 'student',
                    'must_change_password' => (bool) $user->must_change_password,
                    'user' => $user->loadMissing(['level', 'track'])->makeHidden(['password', 'permanent_password_secret_hash']),
                ],
            ]);
        }

        if ($user instanceof GaFamily) {
            return response()->json([
                'success' => true,
                'data' => [
                    'kind' => 'ga_family',
                    'must_change_password' => (bool) $user->must_change_password,
                    'user' => $user->makeHidden(['password', 'permanent_password_secret_hash']),
                ],
            ]);
        }

        if ($user instanceof SpecialLearner) {
            return response()->json([
                'success' => true,
                'data' => [
                    'kind' => 'special_learner',
                    'must_change_password' => (bool) $user->must_change_password,
                    'user' => $user->makeHidden(['password', 'permanent_password_secret_hash']),
                ],
            ]);
        }

        return ApiResponse::error('Unsupported principal.', 401);
    }

    /**
     * Arabic quadripartite name: at least four space-separated name parts.
     */
    private function assertQuadripartiteFullName(string $field, string $fullName): void
    {
        $normalized = preg_replace('/\s+/u', ' ', trim($fullName));
        if ($normalized === '') {
            throw ValidationException::withMessages([
                $field => ['الاسم الرباعي مطلوب.'],
            ]);
        }
        $parts = preg_split('/\s+/u', $normalized, -1, PREG_SPLIT_NO_EMPTY);
        if (count($parts) < 4) {
            throw ValidationException::withMessages([
                $field => ['يجب إدخال الاسم الرباعي: أربعة أسماء على الأقل مفصولة بمسافات (مثال: الاسم الأول اسم الأب اسم الجد اسم العائلة).'],
            ]);
        }
    }
}
