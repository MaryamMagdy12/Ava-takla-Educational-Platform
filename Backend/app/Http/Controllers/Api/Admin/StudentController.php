<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\VerifiesAdminPassword;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreStudentRequest;
use App\Http\Resources\StudentResource;
use App\Models\ExamAttempt;
use App\Models\Student;
use App\Services\AuditLogService;
use App\Services\BulkStudentImportService;
use App\Services\StudentAccountService;
use App\Services\StudentCredentialsExportService;
use App\Support\FieldValidation;
use App\Support\SecureUploadRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StudentController extends Controller
{
    use VerifiesAdminPassword;

    public function __construct(
        private readonly StudentAccountService $studentAccountService,
        private readonly BulkStudentImportService $bulkStudentImportService,
        private readonly StudentCredentialsExportService $credentialsExportService,
        private readonly AuditLogService $auditLogService,
    ) {}

    public function index(Request $request)
    {
        $students = Student::query()
            ->with(['level', 'track'])
            ->when($request->filled('level_id'), fn ($q) => $q->where('level_id', $request->integer('level_id')))
            ->when($request->filled('track_id'), fn ($q) => $q->where('track_id', $request->integer('track_id')))
            ->paginate(20);

        $students->setCollection(
            $students->getCollection()->map(fn (Student $student) => new StudentResource($student))
        );

        return response()->json(['success' => true, 'data' => $students]);
    }

    public function store(StoreStudentRequest $request)
    {
        $data = $request->validated();
        [$student, $tempPassword, $permanentPassword] = $this->studentAccountService->createStudent($data);

        $this->auditLogService->log('student.created', $request->user(), $student, [
            'student_unique_id' => $student->student_unique_id,
        ], $request);
        $this->auditLogService->log('student.credentials_generated', $request->user(), $student, [
            'student_unique_id' => $student->student_unique_id,
            'export_enabled' => (bool) config('student_accounts.password_export_enabled', true),
        ], $request);

        $exportEnabled = (bool) config('student_accounts.password_export_enabled', true);
        $payload = [
            'success' => true,
            'message' => 'Student created. Copy credentials now; they are not stored in plain text and cannot be retrieved later.',
            'data' => new StudentResource($student->load(['level', 'track'])),
            'temporary_password' => $tempPassword,
            'temporary_visible_password' => $tempPassword,
            'show_once' => true,
        ];
        if ($exportEnabled) {
            $payload['permanent_password'] = $permanentPassword;
        }

        return response()->json($payload, 201);
    }

    public function show(Student $student)
    {
        $attempts = ExamAttempt::query()
            ->with('exam')
            ->where('student_id', $student->id)
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->paginate(10);
        return response()->json([
            'success' => true,
            'data' => [
                'student' => new StudentResource($student->load(['level', 'track'])),
                'attempts' => $attempts,
            ],
        ]);
    }

    public function update(Request $request, Student $student)
    {
        $wasActive = $student->status === 'active';
        $data = $request->validate([
            'full_name' => ['sometimes', 'string', 'max:255'],
            'level_id' => [
                'sometimes',
                'integer',
                Rule::exists('levels', 'id')->where(fn ($q) => $q->where('admin_interface', 'student')),
            ],
            'track_id' => [
                'sometimes',
                'integer',
                Rule::exists('tracks', 'id')->where(fn ($q) => $q->where('admin_interface', 'student')),
            ],
            'email' => ['nullable', 'email', 'max:255', 'unique:students,email,'.$student->id],
            'parent_name' => ['required', 'string', 'max:255'],
            'parent_phone' => ['required', ...FieldValidation::phone11StartsWithZero()],
            'parent_email' => ['required', 'email', 'max:255'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);

        $targetLevelId = (int) ($data['level_id'] ?? $student->level_id);
        $targetTrackId = (int) ($data['track_id'] ?? $student->track_id);
        $targetFullName = preg_replace('/\s+/u', ' ', trim((string) ($data['full_name'] ?? $student->full_name))) ?? trim((string) ($data['full_name'] ?? $student->full_name));

        $duplicateExists = Student::query()
            ->where('id', '!=', $student->id)
            ->where('level_id', $targetLevelId)
            ->where('track_id', $targetTrackId)
            ->whereRaw('LOWER(TRIM(full_name)) = ?', [mb_strtolower($targetFullName)])
            ->exists();

        if ($duplicateExists) {
            throw ValidationException::withMessages([
                'full_name' => ['A student with the same full name already exists in this level and track.'],
            ]);
        }

        $data['full_name'] = $targetFullName;
        foreach (['parent_name', 'parent_phone', 'parent_email'] as $k) {
            if (array_key_exists($k, $data)) {
                $data[$k] = trim((string) $data[$k]);
            }
        }
        $student->update($data);
        if (($data['status'] ?? null) === 'inactive' && $wasActive) {
            $student->tokens()->delete();
        }
        $this->auditLogService->log('student.updated', $request->user(), $student->fresh(), [], $request);

        return response()->json(['success' => true, 'data' => new StudentResource($student->fresh()->load(['level', 'track']))]);
    }

    public function toggleStatus(Student $student)
    {
        $student->status = $student->status === 'active' ? 'inactive' : 'active';
        $student->save();
        if ($student->status !== 'active') {
            $student->tokens()->delete();
        }
        return response()->json(['success' => true, 'data' => new StudentResource($student)]);
    }

    public function resetPassword(Request $request, Student $student)
    {
        if ($response = $this->verifyAdminPassword($request)) {
            return $response;
        }

        $passwords = $this->studentAccountService->resetPassword($student);
        $this->auditLogService->log('student.password_reset', $request->user(), $student, [], $request);
        $this->auditLogService->log('student.credentials_generated', $request->user(), $student, [
            'student_unique_id' => $student->student_unique_id,
            'export_enabled' => (bool) config('student_accounts.password_export_enabled', true),
            'action' => 'password_reset',
        ], $request);

        $exportEnabled = (bool) config('student_accounts.password_export_enabled', true);
        $payload = [
            'success' => true,
            'message' => 'Password reset. Copy credentials now; they are not stored in plain text.',
            'temporary_password' => $passwords['temporary_password'],
            'temporary_visible_password' => $passwords['temporary_password'],
            'show_once' => true,
        ];
        if ($exportEnabled) {
            $payload['permanent_password'] = $passwords['permanent_password'];
        }

        return response()->json($payload);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', SecureUploadRules::spreadsheetRule()],
        ]);
        SecureUploadRules::rejectDangerousUpload($request->file('file'));
        $result = $this->finalizeImportResult($request, $this->bulkStudentImportService->import($request->file('file')));

        return response()->json([
            'success' => true,
            'message' => 'Import finished.',
            'data' => $result,
        ]);
    }

    public function importWithDefaults(Request $request)
    {
        $data = $request->validate([
            'file' => ['required', 'file', SecureUploadRules::spreadsheetRule()],
            'level_id' => [
                'required',
                'integer',
                Rule::exists('levels', 'id')->where(fn ($q) => $q->where('admin_interface', 'student')),
            ],
            'track_id' => [
                'nullable',
                'integer',
                Rule::exists('tracks', 'id')->where(fn ($q) => $q->where('admin_interface', 'student')),
            ],
            'status' => ['nullable', 'in:active,inactive'],
        ]);
        SecureUploadRules::rejectDangerousUpload($request->file('file'));

        $result = $this->finalizeImportResult(
            $request,
            $this->bulkStudentImportService->importWithDefaults(
                $request->file('file'),
                [
                    'level_id' => $data['level_id'],
                    'track_id' => $data['track_id'] ?? null,
                    'status' => $data['status'] ?? null,
                ],
            ),
        );

        return response()->json([
            'success' => true,
            'message' => 'Import finished.',
            'data' => $result,
        ]);
    }

    public function downloadCredentialsExport(Request $request, string $token)
    {
        $payload = $this->credentialsExportService->readBulkExport($token);
        if ($payload === null) {
            return response()->json(['success' => false, 'message' => 'Export not found.'], 404);
        }

        $this->auditLogService->log('student.credentials_bulk_export_download', $request->user(), null, [
            'export_token' => $token,
            'exported_at' => $payload['exported_at'] ?? null,
            'row_count' => is_array($payload['credentials'] ?? null) ? count($payload['credentials']) : 0,
        ], $request);

        return response()->json([
            'success' => true,
            'data' => $payload,
        ]);
    }

    /**
     * @param  array{created: int, errors: list<array{row: int, message: string}>, credentials: list<array<string, mixed>>}  $result
     * @return array{created: int, errors: list<array{row: int, message: string}>, credentials: list<array<string, mixed>>, credentials_export_token?: string}
     */
    private function finalizeImportResult(Request $request, array $result): array
    {
        $exportEnabled = (bool) config('student_accounts.password_export_enabled', true);

        if (! $exportEnabled) {
            $result['credentials'] = array_map(
                static fn (array $row) => collect($row)->except('permanent_password')->all(),
                $result['credentials'] ?? [],
            );

            return $result;
        }

        $credentials = $result['credentials'] ?? [];
        if ($credentials === []) {
            return $result;
        }

        $token = $this->credentialsExportService->storeBulkExport((int) $request->user()->id, $credentials);
        if ($token !== null) {
            $this->auditLogService->log('student.credentials_bulk_export', $request->user(), null, [
                'export_token' => $token,
                'row_count' => count($credentials),
            ], $request);
            $result['credentials_export_token'] = $token;
        }

        return $result;
    }

    public function destroy(Request $request, Student $student)
    {
        if ($response = $this->verifyAdminPassword($request)) {
            return $response;
        }

        DB::transaction(function () use ($student) {
            $student->tokens()->delete();
            DB::table('level_attendance_entries')->where('student_id', $student->id)->delete();
            DB::table('exam_attempts')->where('student_id', $student->id)->delete();
            $student->forceDelete();
        });

        return response()->json(['success' => true]);
    }
}

