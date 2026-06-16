<?php

namespace App\Services;

use App\Models\Level;
use App\Support\FieldValidation;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;

class BulkStudentImportService
{
    public function __construct(
        private readonly SpreadsheetReaderService $reader,
        private readonly StudentAccountService $studentAccountService,
    ) {}

    /**
     * @return array{created: int, errors: list<array{row: int, message: string}>, credentials: list<array<string, mixed>>}
     */
    public function import(UploadedFile $file): array
    {
        $created = 0;
        $errors = [];
        $credentials = [];
        $rowNum = 1;

        foreach ($this->reader->rowsAssociativeFromFirstSheet($file) as $row) {
            $rowNum++;
            $row = $this->normalizeRow($row);
            foreach ($row as $k => $v) {
                if ($v !== null && is_string($v) && trim($v) === '') {
                    $row[$k] = null;
                }
            }
            $validator = Validator::make($row, [
                'full_name' => ['required', 'string', 'max:255'],
                'level_id' => ['nullable', 'numeric', 'exists:levels,id', 'required_without:level_code_prefix'],
                'level_code_prefix' => ['nullable', 'string', 'size:4', 'required_without:level_id'],
                'track_id' => ['nullable', 'numeric', 'exists:tracks,id'],
                'email' => ['nullable', 'email', 'max:255', 'unique:students,email'],
                'parent_name' => ['required', 'string', 'max:255'],
                'parent_phone' => ['required', ...FieldValidation::phone11StartsWithZero()],
                'parent_email' => ['required', 'email', 'max:255'],
                'status' => ['nullable', 'in:active,inactive'],
            ]);

            if ($validator->fails()) {
                $errors[] = ['row' => $rowNum, 'message' => $validator->errors()->first()];

                continue;
            }

            $data = $validator->validated();
            if (empty($data['level_id']) && empty($data['level_code_prefix'])) {
                $errors[] = ['row' => $rowNum, 'message' => 'Provide level_id or level_code_prefix.'];

                continue;
            }

            if (! empty($data['level_code_prefix'])) {
                $level = Level::query()->where('code_prefix', $data['level_code_prefix'])->first();
                if (! $level) {
                    $errors[] = ['row' => $rowNum, 'message' => 'Unknown level_code_prefix.'];

                    continue;
                }
                $data['level_id'] = $level->id;
            }

            try {
                [$student, $tempPassword, $permanentPassword] = $this->studentAccountService->createStudent([
                    'full_name' => $data['full_name'],
                    'level_id' => (int) $data['level_id'],
                    'track_id' => isset($data['track_id']) ? (int) $data['track_id'] : null,
                    'email' => $data['email'] ?? null,
                    'parent_name' => $data['parent_name'] ?? null,
                    'parent_phone' => $data['parent_phone'] ?? null,
                    'parent_email' => $data['parent_email'] ?? null,
                    'status' => $data['status'] ?? 'active',
                ]);
                $created++;
                $credentials[] = [
                    'row' => $rowNum,
                    'full_name' => $student->full_name,
                    'student_unique_id' => $student->student_unique_id,
                    'email' => $student->email,
                    'parent_name' => $student->parent_name,
                    'parent_phone' => $student->parent_phone,
                    'parent_email' => $student->parent_email,
                    'temporary_password' => $tempPassword,
                    'permanent_password' => $permanentPassword,
                ];
            } catch (\Throwable $e) {
                $errors[] = ['row' => $rowNum, 'message' => $e->getMessage()];
            }
        }

        return ['created' => $created, 'errors' => $errors, 'credentials' => $credentials];
    }

    /**
     * Import students where level/track/status defaults are provided and each row
     * needs full_name, parent_name, parent_phone, parent_email (and optionally student email).
     *
     * @param  array{level_id:int,track_id?:int,status?:string}  $defaults
     * @return array{created: int, errors: list<array{row: int, message: string}>, accounts: list<array<string,mixed>>}
     */
    public function importWithDefaults(UploadedFile $file, array $defaults): array
    {
        $created = 0;
        $errors = [];
        $accounts = [];
        $rowNum = 1;

        foreach ($this->reader->rowsAssociativeFromFirstSheet($file) as $row) {
            $rowNum++;
            $row = $this->normalizeRow($row);
            foreach ($row as $k => $v) {
                if ($v !== null && is_string($v) && trim($v) === '') {
                    $row[$k] = null;
                }
            }

            $validator = Validator::make($row, [
                'full_name' => ['required', 'string', 'max:255'],
                'email' => ['nullable', 'email', 'max:255', 'unique:students,email'],
                'parent_name' => ['required', 'string', 'max:255'],
                'parent_phone' => ['required', ...FieldValidation::phone11StartsWithZero()],
                'parent_email' => ['required', 'email', 'max:255'],
            ]);

            if ($validator->fails()) {
                $errors[] = ['row' => $rowNum, 'message' => $validator->errors()->first()];

                continue;
            }

            $data = $validator->validated();

            try {
                [$student, $tempPassword, $permanentPassword] = $this->studentAccountService->createStudent([
                    'full_name' => $data['full_name'],
                    'level_id' => (int) $defaults['level_id'],
                    'track_id' => isset($defaults['track_id']) ? (int) $defaults['track_id'] : null,
                    'email' => $data['email'] ?? null,
                    'parent_name' => $data['parent_name'] ?? null,
                    'parent_phone' => $data['parent_phone'] ?? null,
                    'parent_email' => $data['parent_email'] ?? null,
                    'status' => $defaults['status'] ?? 'active',
                ]);
                $created++;
                $accounts[] = [
                    'full_name' => $student->full_name,
                    'student_unique_id' => $student->student_unique_id,
                    'email' => $student->email,
                    'parent_name' => $student->parent_name,
                    'parent_phone' => $student->parent_phone,
                    'parent_email' => $student->parent_email,
                    'level_id' => $student->level_id,
                    'track_id' => $student->track_id,
                    'temporary_password' => $tempPassword,
                    'permanent_password' => $permanentPassword,
                ];
            } catch (\Throwable $e) {
                $errors[] = ['row' => $rowNum, 'message' => $e->getMessage()];
            }
        }

        return ['created' => $created, 'errors' => $errors, 'accounts' => $accounts];
    }

    /**
     * Normalize common spreadsheet headers so import works with simple files.
     *
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function normalizeRow(array $row): array
    {
        $normalized = [];

        foreach ($row as $key => $value) {
            $cleanKey = $this->normalizeHeaderKey($key);
            $normalized[$cleanKey] = is_string($value) ? trim($value) : $value;
        }

        $aliases = [
            'full_name' => ['name', 'student_name', 'student', 'اسم_الطالب', 'اسم_الطالب_كامل', 'الاسم', 'اسم'],
            'email' => ['mail', 'e_mail', 'البريد_الالكتروني', 'البريد_الإلكتروني', 'الايميل', 'الإيميل', 'بريد_الطالب'],
            'level_id' => ['level', 'grade_id', 'المرحلة', 'الصف'],
            'level_code_prefix' => ['level_prefix', 'code_prefix', 'prefix', 'كود_المرحلة', 'رمز_المرحلة'],
            'track_id' => ['track', 'path_id', 'المسار'],
            'status' => ['state', 'الحالة'],
            'parent_name' => [
                'guardian_name', 'waliy_name', 'اسم_ولي_الامر', 'اسم_ولي_الأمر', 'ولي_الامر', 'ولي_الأمر',
                'اسم_الوالد', 'اسم_ولي_الأمر', 'ولي_الطالب',
            ],
            'parent_phone' => [
                'guardian_phone', 'parent_mobile', 'هاتف_ولي_الامر', 'هاتف_ولي_الأمر', 'جوال_ولي_الامر', 'جوال_ولي_الأمر',
                'هاتف_الوالد', 'جوال_الوالد', 'رقم_ولي_الامر', 'رقم_ولي_الأمر', 'موبايل_ولي_الامر', 'موبايل_ولي_الأمر',
            ],
            'parent_email' => [
                'guardian_email', 'البريد_ولي_الامر', 'البريد_ولي_الأمر', 'بريد_ولي_الامر', 'بريد_ولي_الأمر',
                'ايميل_ولي_الامر', 'ايميل_ولي_الأمر', 'البريد_الالكتروني_ولي_الامر', 'البريد_الإلكتروني_ولي_الأمر',
            ],
        ];

        foreach ($aliases as $canonical => $keys) {
            if (! array_key_exists($canonical, $normalized)) {
                foreach ($keys as $alias) {
                    $normalizedAlias = $this->normalizeHeaderKey($alias);
                    if (array_key_exists($normalizedAlias, $normalized) && $normalized[$normalizedAlias] !== null && $normalized[$normalizedAlias] !== '') {
                        $normalized[$canonical] = $normalized[$normalizedAlias];
                        break;
                    }
                }
            }
        }

        return $normalized;
    }

    private function normalizeHeaderKey(string $key): string
    {
        $key = preg_replace('/^\xEF\xBB\xBF/', '', $key) ?? $key;
        $key = trim(mb_strtolower($key));
        $key = preg_replace('/[\s\-\/\\\\]+/u', '_', $key) ?? $key;

        return $key;
    }
}
