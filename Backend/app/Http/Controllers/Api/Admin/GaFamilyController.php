<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\VerifiesAdminPassword;
use App\Http\Controllers\Controller;
use App\Models\GaCompetitionAttempt;
use App\Models\GaFamily;
use App\Models\GaFamilyExamAttempt;
use App\Services\AuditLogService;
use App\Services\GaFamilyAccountService;
use Illuminate\Http\Request;

class GaFamilyController extends Controller
{
    use VerifiesAdminPassword;

    public function __construct(
        private readonly GaFamilyAccountService $familyAccountService,
        private readonly AuditLogService $auditLogService,
    ) {}

    public function index()
    {
        $families = GaFamily::query()->orderByDesc('id')->paginate(20);

        return response()->json(['success' => true, 'data' => $families]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'display_name' => ['required', 'string', 'max:255'],
            'status' => ['nullable', 'in:active,inactive'],
            'must_change_password' => ['nullable', 'boolean'],
        ]);
        [$family, $tempPassword, $permanentPassword] = $this->familyAccountService->createFamily($data);

        $this->auditLogService->log('ga_family.created', $request->user(), $family, [
            'family_login_id' => $family->family_login_id,
        ], $request);

        return response()->json([
            'success' => true,
            'message' => 'Family account created. Copy the login ID and passwords now.',
            'data' => $family,
            'family_login_id' => $family->family_login_id,
            'temporary_password' => $tempPassword,
            'permanent_password' => $permanentPassword,
        ], 201);
    }

    public function show(GaFamily $ga_family)
    {
        return response()->json(['success' => true, 'data' => $ga_family]);
    }

    public function update(Request $request, GaFamily $ga_family)
    {
        $data = $request->validate([
            'display_name' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);
        $ga_family->update($data);
        if (($ga_family->status ?? '') !== 'active') {
            $ga_family->tokens()->delete();
        }

        return response()->json(['success' => true, 'data' => $ga_family->fresh()]);
    }

    public function destroy(Request $request, GaFamily $ga_family)
    {
        if ($response = $this->verifyAdminPassword($request)) {
            return $response;
        }

        $ga_family->tokens()->delete();
        $ga_family->forceDelete();
        $this->auditLogService->log('ga_family.deleted', $request->user(), $ga_family, [], $request);

        return response()->json(['success' => true, 'message' => 'Deleted.']);
    }

    public function toggleStatus(Request $request, GaFamily $ga_family)
    {
        $ga_family->status = $ga_family->status === 'active' ? 'inactive' : 'active';
        $ga_family->save();
        if ($ga_family->status !== 'active') {
            $ga_family->tokens()->delete();
        }

        return response()->json(['success' => true, 'data' => $ga_family]);
    }

    public function resetPassword(Request $request, GaFamily $ga_family)
    {
        if ($response = $this->verifyAdminPassword($request)) {
            return $response;
        }

        $passwords = $this->familyAccountService->resetPassword($ga_family);
        $this->auditLogService->log('ga_family.password_reset', $request->user(), $ga_family, [], $request);

        return response()->json([
            'success' => true,
            'message' => 'Password reset. Copy credentials now.',
            'temporary_password' => $passwords['temporary_password'],
            'permanent_password' => $passwords['permanent_password'],
        ]);
    }

    public function examAttempts(GaFamily $ga_family)
    {
        $attempts = GaFamilyExamAttempt::query()
            ->where('family_id', $ga_family->id)
            ->whereIn('id', function ($query) use ($ga_family) {
                $query->from('exam_attempts_family as latest_exam_attempts')
                    ->selectRaw('MAX(id)')
                    ->where('family_id', $ga_family->id)
                    ->groupBy('exam_id');
            })
            ->with(['exam:id,title,available_from,available_to'])
            ->orderByDesc('id')
            ->paginate(20);

        $attempts->setCollection(
            $attempts->getCollection()->map(function (GaFamilyExamAttempt $attempt) {
                return [
                    'attempt_id' => $attempt->id,
                    'exam_id' => $attempt->exam_id,
                    'title' => $attempt->exam?->title,
                    'score' => $attempt->score,
                    'started_at' => $attempt->started_at?->toIso8601String(),
                    'submitted_at' => $attempt->submitted_at?->toIso8601String(),
                ];
            })
        );

        return response()->json(['success' => true, 'data' => $attempts]);
    }

    public function competitionAttempts(GaFamily $ga_family)
    {
        $attempts = GaCompetitionAttempt::query()
            ->where('ga_family_id', $ga_family->id)
            ->whereIn('id', function ($query) use ($ga_family) {
                $query->from('ga_competition_attempts as latest_competition_attempts')
                    ->selectRaw('MAX(id)')
                    ->where('ga_family_id', $ga_family->id)
                    ->groupBy('ga_competition_id');
            })
            ->with(['competition:id,title,starts_at,ends_at'])
            ->orderByDesc('id')
            ->paginate(20);

        $attempts->setCollection(
            $attempts->getCollection()->map(function (GaCompetitionAttempt $attempt) {
                return [
                    'attempt_id' => $attempt->id,
                    'competition_id' => $attempt->ga_competition_id,
                    'title' => $attempt->competition?->title,
                    'score' => $attempt->score,
                    'started_at' => $attempt->started_at?->toIso8601String(),
                    'submitted_at' => $attempt->submitted_at?->toIso8601String(),
                ];
            })
        );

        return response()->json(['success' => true, 'data' => $attempts]);
    }
}
