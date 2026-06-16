<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\VerifiesAdminPassword;
use App\Http\Controllers\Controller;
use App\Models\SpecialLearner;
use App\Services\AuditLogService;
use App\Services\SpecialLearnerAccountService;
use App\Support\FieldValidation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SpecialLearnerController extends Controller
{
    use VerifiesAdminPassword;

    public function __construct(
        private readonly AuditLogService $auditLogService,
        private readonly SpecialLearnerAccountService $specialLearnerAccountService,
    ) {}

    public function index()
    {
        $rows = SpecialLearner::query()->orderByDesc('id')->paginate(20);

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function show(SpecialLearner $special_learner)
    {
        return response()->json(['success' => true, 'data' => $special_learner]);
    }

    public function update(Request $request, SpecialLearner $special_learner)
    {
        $data = $request->validate([
            'full_name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255'],
            'phone' => ['sometimes', ...FieldValidation::phone11StartsWithZero()],
            'address' => ['sometimes', ...FieldValidation::realisticAddress(255)],
            'age' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:150'],
            'birth_date' => ['sometimes', 'nullable', 'date', 'before_or_equal:today'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);
        $wasInactive = $special_learner->status === 'inactive';
        $willActivate = ($data['status'] ?? $special_learner->status) === 'active' && $wasInactive;
        if ($willActivate) {
            if ($response = $this->verifyAdminPassword($request)) {
                return $response;
            }
        }

        $special_learner->update($data);
        $special_learner->refresh();

        $issuedCredentials = null;
        if ($wasInactive && $special_learner->status === 'active' && ($special_learner->permanent_password_secret_hash === null || $special_learner->permanent_password_secret_hash === '')) {
            $issuedCredentials = $this->specialLearnerAccountService->assignInitialPasswords($special_learner);
        }

        if (($special_learner->status ?? '') !== 'active') {
            $special_learner->tokens()->delete();
        }

        return response()->json([
            'success' => true,
            'data' => $special_learner->fresh(),
            'issued_credentials' => $issuedCredentials,
        ]);
    }

    public function destroy(Request $request, SpecialLearner $special_learner)
    {
        if ($response = $this->verifyAdminPassword($request)) {
            return $response;
        }

        $learnerId = $special_learner->id;
        $rawPicture = (string) ($special_learner->getAttributes()['profile_picture'] ?? '');
        $special_learner->tokens()->delete();
        if ($rawPicture !== '' && ! preg_match('#^https?://#i', $rawPicture)) {
            Storage::disk('public')->delete($rawPicture);
        }
        $special_learner->forceDelete();
        $this->auditLogService->log('special_learner.deleted', $request->user(), null, ['special_learner_id' => $learnerId], $request);

        return response()->json(['success' => true, 'message' => 'Deleted.']);
    }

    public function toggleStatus(Request $request, SpecialLearner $special_learner)
    {
        $from = $special_learner->status;
        if ($from === 'inactive') {
            if ($response = $this->verifyAdminPassword($request)) {
                return $response;
            }
        }

        $special_learner->status = $from === 'active' ? 'inactive' : 'active';

        $issuedCredentials = null;
        if ($from === 'inactive' && $special_learner->status === 'active' && ($special_learner->permanent_password_secret_hash === null || $special_learner->permanent_password_secret_hash === '')) {
            $issuedCredentials = $this->specialLearnerAccountService->assignInitialPasswords($special_learner);
        } else {
            $special_learner->save();
        }

        if ($special_learner->status !== 'active') {
            $special_learner->tokens()->delete();
        }

        return response()->json([
            'success' => true,
            'data' => $special_learner->fresh(),
            'issued_credentials' => $issuedCredentials,
        ]);
    }

    /**
     * Issue new random temporary + permanent passwords (same rules as new registrations). Revokes tokens.
     */
    public function resetPassword(Request $request, SpecialLearner $special_learner)
    {
        if ($response = $this->verifyAdminPassword($request)) {
            return $response;
        }

        $passwords = $this->specialLearnerAccountService->resetPassword($special_learner);
        $this->auditLogService->log('special_learner.password_reset', $request->user(), null, ['special_learner_id' => $special_learner->id], $request);

        return response()->json([
            'success' => true,
            'message' => 'New passwords issued. Share them securely with the learner.',
            'data' => [
                'temporary_password' => $passwords['temporary_password'],
                'permanent_password' => $passwords['permanent_password'],
            ],
        ]);
    }
}
