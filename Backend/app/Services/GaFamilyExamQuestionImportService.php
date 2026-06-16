<?php

namespace App\Services;

use App\Models\GaFamilyExam;
use App\Models\GaFamilyExamQuestion;
use App\Models\GaFamilyExamQuestionOption;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class GaFamilyExamQuestionImportService
{
    public function __construct(private readonly SpreadsheetReaderService $reader) {}

    /**
     * @return array{created:int,errors:list<array{row:int,message:string}>}
     */
    public function import(UploadedFile $file, ?GaFamilyExam $exam = null): array
    {
        $exam?->loadMissing('chapterScopes');
        $created = 0;
        $errors = [];
        $rowNum = 1;

        foreach ($this->reader->rowsAssociativeFromFirstSheet($file) as $row) {
            $rowNum++;
            $row = $this->normalizeImportRow($row);
            $validator = Validator::make($row, [
                'question_text' => ['required', 'string'],
                'testament_type' => ['required', 'in:old,new'],
                'chapter_number' => ['required', 'integer', 'min:1'],
                'difficulty' => ['nullable', 'in:easy,medium,hard'],
                'feedback_correct' => ['nullable', 'string'],
                'feedback_wrong' => ['nullable', 'string'],
                'status' => ['nullable', 'in:active,inactive'],
                'option_1' => ['nullable', 'string'],
                'option_2' => ['nullable', 'string'],
                'option_3' => ['nullable', 'string'],
                'option_4' => ['nullable', 'string'],
                'correct_index' => ['required', 'integer', 'min:1', 'max:4'],
            ]);
            if ($validator->fails()) {
                $errors[] = ['row' => $rowNum, 'message' => $validator->errors()->first()];
                continue;
            }
            $data = $validator->validated();
            if ($exam && ! $exam->allowsQuestionScope((string) $data['testament_type'], (int) $data['chapter_number'])) {
                $errors[] = [
                    'row' => $rowNum,
                    'message' => 'الصف خارج نطاق الأصحاحات المسموح بها في الامتحان المحدد.',
                ];
                continue;
            }
            $options = array_values(array_filter([
                $data['option_1'] ?? null,
                $data['option_2'] ?? null,
                $data['option_3'] ?? null,
                $data['option_4'] ?? null,
            ], static fn ($x) => $x !== null && trim((string) $x) !== ''));
            if (count($options) < 2) {
                $errors[] = ['row' => $rowNum, 'message' => 'At least two options required.'];
                continue;
            }
            $correctIdx = ((int) $data['correct_index']) - 1;
            if (! isset($options[$correctIdx])) {
                $errors[] = ['row' => $rowNum, 'message' => 'correct_index is invalid for provided options.'];
                continue;
            }
            try {
                DB::transaction(function () use ($exam, $data, $options, $correctIdx) {
                    $question = GaFamilyExamQuestion::query()->create([
                        'exam_id' => $exam?->id,
                        'testament_type' => $data['testament_type'],
                        'chapter_number' => (int) $data['chapter_number'],
                        'question_text' => $data['question_text'],
                        'difficulty' => $data['difficulty'] ?? null,
                        'feedback_correct' => $data['feedback_correct'] ?? null,
                        'feedback_wrong' => $data['feedback_wrong'] ?? null,
                        'status' => $data['status'] ?? 'active',
                    ]);
                    foreach ($options as $idx => $text) {
                        GaFamilyExamQuestionOption::query()->create([
                            'question_id' => $question->id,
                            'option_text' => $text,
                            'is_correct' => $idx === $correctIdx,
                            'sort_order' => $idx + 1,
                        ]);
                    }
                });
                $created++;
            } catch (\Throwable $e) {
                $errors[] = ['row' => $rowNum, 'message' => $e->getMessage()];
            }
        }

        return ['created' => $created, 'errors' => $errors];
    }

    /**
     * Accept both English and Arabic headers/enum values.
     *
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function normalizeImportRow(array $row): array
    {
        $headerMap = [
            'نص_السؤال' => 'question_text',
            'نص السؤال' => 'question_text',
            'نوع_العهد' => 'testament_type',
            'نوع العهد' => 'testament_type',
            'العهد' => 'testament_type',
            'رقم_الأصحاح' => 'chapter_number',
            'رقم الأصحاح' => 'chapter_number',
            'مستوى_الصعوبة' => 'difficulty',
            'مستوى الصعوبة' => 'difficulty',
            'الصعوبة' => 'difficulty',
            'ملاحظة_للإجابة_الصحيحة' => 'feedback_correct',
            'ملاحظة_الإجابة_الصحيحة' => 'feedback_correct',
            'ملاحظات_الإجابة_الصحيحة' => 'feedback_correct',
            'ملاحظات الإجابة الصحيحة' => 'feedback_correct',
            'ملاحظة_للإجابة_الخاطئة' => 'feedback_wrong',
            'ملاحظة_الإجابة_الخاطئة' => 'feedback_wrong',
            'ملاحظات_الإجابة_الخاطئة' => 'feedback_wrong',
            'ملاحظات الإجابة الخاطئة' => 'feedback_wrong',
            'الحالة' => 'status',
            'الاختيار_1' => 'option_1',
            'الاختيار 1' => 'option_1',
            'الاختيار_2' => 'option_2',
            'الاختيار 2' => 'option_2',
            'الاختيار_3' => 'option_3',
            'الاختيار 3' => 'option_3',
            'الاختيار_4' => 'option_4',
            'الاختيار 4' => 'option_4',
            'ترتيب_الإجابة_الصحيحة' => 'correct_index',
            'ترتيب الإجابة الصحيحة' => 'correct_index',
            'رقم_الإجابة_الصحيحة' => 'correct_index',
            'رقم الإجابة الصحيحة' => 'correct_index',
        ];

        $normalized = [];
        foreach ($row as $key => $value) {
            $trimmedKey = trim((string) $key);
            $targetKey = $headerMap[$trimmedKey] ?? $trimmedKey;
            $normalized[$targetKey] = $value;
        }

        $normalized['testament_type'] = $this->normalizeTestamentType($normalized['testament_type'] ?? null);
        $normalized['difficulty'] = $this->normalizeDifficulty($normalized['difficulty'] ?? null);
        $normalized['status'] = $this->normalizeStatus($normalized['status'] ?? null);

        return $normalized;
    }

    private function normalizeTestamentType(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return $value;
        }
        $v = mb_strtolower(trim((string) $value));
        $map = [
            'عهد_قديم' => 'old',
            'عهد قديم' => 'old',
            'العهد_القديم' => 'old',
            'العهد القديم' => 'old',
            'قديم' => 'old',
            'عهد_جديد' => 'new',
            'عهد جديد' => 'new',
            'العهد_الجديد' => 'new',
            'العهد الجديد' => 'new',
            'جديد' => 'new',
        ];

        return $map[$v] ?? $v;
    }

    private function normalizeDifficulty(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return $value;
        }
        $v = mb_strtolower(trim((string) $value));
        $map = [
            'سهل' => 'easy',
            'متوسط' => 'medium',
            'صعب' => 'hard',
        ];

        return $map[$v] ?? $v;
    }

    private function normalizeStatus(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return $value;
        }
        $v = mb_strtolower(trim((string) $value));
        $map = [
            'نشط' => 'active',
            'فعال' => 'active',
            'غير_نشط' => 'inactive',
            'غير نشط' => 'inactive',
        ];

        return $map[$v] ?? $v;
    }
}
