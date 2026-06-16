<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Track;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class BulkQuestionImportService
{
    public function __construct(private readonly SpreadsheetReaderService $reader) {}

    /**
     * @return array{created: int, errors: list<array{row: int, message: string}>}
     */
    public function import(UploadedFile $file, string $adminInterface = 'student'): array
    {
        $created = 0;
        $errors = [];
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
                'course_id' => ['required', 'numeric', 'exists:courses,id'],
                'track_id' => ['nullable', 'numeric', 'exists:tracks,id'],
                'question_text' => ['required', 'string'],
                'question_type' => ['required', 'in:mcq,true_false'],
                'difficulty' => ['required', 'in:easy,medium,hard'],
                'feedback_correct' => ['nullable', 'string'],
                'feedback_wrong' => ['nullable', 'string'],
                'status' => ['nullable', 'in:active,inactive'],
                'option_1' => ['nullable', 'string'],
                'option_2' => ['nullable', 'string'],
                'option_3' => ['nullable', 'string'],
                'option_4' => ['nullable', 'string'],
                'correct_index' => ['required', 'numeric', 'min:1', 'max:4'],
            ]);

            if ($validator->fails()) {
                $errors[] = ['row' => $rowNum, 'message' => $validator->errors()->first()];

                continue;
            }

            $d = $validator->validated();
            $d['course_id'] = (int) $d['course_id'];
            $d['track_id'] = isset($d['track_id']) && $d['track_id'] !== null && $d['track_id'] !== ''
                ? (int) $d['track_id']
                : null;
            if (! $this->courseAndTrackBelongToInterface($d['course_id'], $d['track_id'], $adminInterface)) {
                $errors[] = ['row' => $rowNum, 'message' => 'Course or track does not belong to this admin interface.'];

                continue;
            }
            $d['correct_index'] = (int) $d['correct_index'];
            $options = array_values(array_filter([
                $d['option_1'] ?? null,
                $d['option_2'] ?? null,
                $d['option_3'] ?? null,
                $d['option_4'] ?? null,
            ], static fn ($t) => $t !== null && trim((string) $t) !== ''));

            if (count($options) < 2) {
                $errors[] = ['row' => $rowNum, 'message' => 'At least two non-empty options required.'];

                continue;
            }

            $correctIdx = (int) $d['correct_index'] - 1;
            if (! isset($options[$correctIdx])) {
                $errors[] = ['row' => $rowNum, 'message' => 'correct_index does not match a filled option.'];

                continue;
            }

            try {
                DB::transaction(function () use ($d, $options, $correctIdx, $adminInterface) {
                    $q = Question::query()->create([
                        'admin_interface' => $adminInterface,
                        'course_id' => $d['course_id'],
                        'track_id' => $d['track_id'],
                        'question_text' => $d['question_text'],
                        'question_type' => $d['question_type'],
                        'difficulty' => $d['difficulty'],
                        'feedback_correct' => $d['feedback_correct'] ?? null,
                        'feedback_wrong' => $d['feedback_wrong'] ?? null,
                        'status' => $d['status'] ?? 'active',
                    ]);
                    foreach ($options as $i => $text) {
                        QuestionOption::query()->create([
                            'question_id' => $q->id,
                            'option_text' => $text,
                            'is_correct' => $i === $correctIdx,
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
     * Import questions where course/track/difficulty/status are provided as defaults
     * and each row only needs question_text, option_1..4, correct_index.
     *
     * @param  array{course_id:int,track_id?:int|null,difficulty?:string,status?:string}  $defaults
     * @return array{created: int, errors: list<array{row: int, message: string}>}
     */
    public function importWithDefaults(UploadedFile $file, array $defaults, string $adminInterface = 'student'): array
    {
        $defTrack = $defaults['track_id'] ?? null;
        $defTrack = $defTrack === null || $defTrack === '' ? null : (int) $defTrack;
        if (! $this->courseAndTrackBelongToInterface((int) $defaults['course_id'], $defTrack, $adminInterface)) {
            return ['created' => 0, 'errors' => [['row' => 0, 'message' => 'Course or track does not belong to this admin interface.']]];
        }

        $created = 0;
        $errors = [];
        $rowNum = 1;

        $base = [
            'course_id' => $defaults['course_id'],
            'track_id' => $defTrack,
            'question_type' => 'mcq',
            'difficulty' => $defaults['difficulty'] ?? 'easy',
            'status' => $defaults['status'] ?? 'active',
        ];

        foreach ($this->reader->rowsAssociativeFromFirstSheet($file) as $row) {
            $rowNum++;
            $row = $this->normalizeRow($row);
            foreach ($row as $k => $v) {
                if ($v !== null && is_string($v) && trim($v) === '') {
                    $row[$k] = null;
                }
            }

            $payload = array_merge($base, [
                'question_text' => $row['question_text'] ?? null,
                'feedback_correct' => $row['feedback_correct'] ?? null,
                'feedback_wrong' => $row['feedback_wrong'] ?? null,
                'option_1' => $row['option_1'] ?? null,
                'option_2' => $row['option_2'] ?? null,
                'option_3' => $row['option_3'] ?? null,
                'option_4' => $row['option_4'] ?? null,
                'correct_index' => $row['correct_index'] ?? null,
            ]);

            $validator = Validator::make($payload, [
                'course_id' => ['required', 'numeric', 'exists:courses,id'],
                'track_id' => ['nullable', 'numeric', 'exists:tracks,id'],
                'question_text' => ['required', 'string'],
                'question_type' => ['required', 'in:mcq,true_false'],
                'difficulty' => ['required', 'in:easy,medium,hard'],
                'feedback_correct' => ['nullable', 'string'],
                'feedback_wrong' => ['nullable', 'string'],
                'status' => ['nullable', 'in:active,inactive'],
                'option_1' => ['nullable', 'string'],
                'option_2' => ['nullable', 'string'],
                'option_3' => ['nullable', 'string'],
                'option_4' => ['nullable', 'string'],
                'correct_index' => ['required', 'numeric', 'min:1', 'max:4'],
            ]);

            if ($validator->fails()) {
                $errors[] = ['row' => $rowNum, 'message' => $validator->errors()->first()];

                continue;
            }

            $d = $validator->validated();
            $d['course_id'] = (int) $d['course_id'];
            $d['track_id'] = isset($d['track_id']) && $d['track_id'] !== null && $d['track_id'] !== ''
                ? (int) $d['track_id']
                : null;
            $d['correct_index'] = (int) $d['correct_index'];
            $options = array_values(array_filter([
                $d['option_1'] ?? null,
                $d['option_2'] ?? null,
                $d['option_3'] ?? null,
                $d['option_4'] ?? null,
            ], static fn ($t) => $t !== null && trim((string) $t) !== ''));

            if (count($options) < 2) {
                $errors[] = ['row' => $rowNum, 'message' => 'At least two non-empty options required.'];

                continue;
            }

            $correctIdx = (int) $d['correct_index'] - 1;
            if (! isset($options[$correctIdx])) {
                $errors[] = ['row' => $rowNum, 'message' => 'correct_index does not match a filled option.'];

                continue;
            }

            try {
                DB::transaction(function () use ($d, $options, $correctIdx, $adminInterface) {
                    $q = Question::query()->create([
                        'admin_interface' => $adminInterface,
                        'course_id' => $d['course_id'],
                        'track_id' => $d['track_id'],
                        'question_text' => $d['question_text'],
                        'question_type' => $d['question_type'],
                        'difficulty' => $d['difficulty'],
                        'feedback_correct' => $d['feedback_correct'] ?? null,
                        'feedback_wrong' => $d['feedback_wrong'] ?? null,
                        'status' => $d['status'] ?? 'active',
                    ]);
                    foreach ($options as $i => $text) {
                        QuestionOption::query()->create([
                            'question_id' => $q->id,
                            'option_text' => $text,
                            'is_correct' => $i === $correctIdx,
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
     * Normalize common spreadsheet headers/values so imports are less fragile.
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
            'course_id' => ['course', 'subject_id', 'المادة', 'المقرر'],
            'track_id' => ['track', 'path_id', 'المسار'],
            'question_text' => ['question', 'text', 'question_title', 'السؤال', 'نص_السؤال'],
            'question_type' => ['type', 'نوع_السؤال'],
            'difficulty' => ['level', 'difficulty_level', 'الصعوبة', 'المستوى'],
            'feedback_correct' => ['correct_feedback', 'feedback_right', 'ملاحظات_الصحيح'],
            'feedback_wrong' => ['wrong_feedback', 'incorrect_feedback', 'ملاحظات_الخطأ'],
            'status' => ['state', 'الحالة'],
            'option_1' => ['option_a', 'a', 'choice_1', 'answer_1', 'الاختيار_1', 'الخيار_1'],
            'option_2' => ['option_b', 'b', 'choice_2', 'answer_2', 'الاختيار_2', 'الخيار_2'],
            'option_3' => ['option_c', 'c', 'choice_3', 'answer_3', 'الاختيار_3', 'الخيار_3'],
            'option_4' => ['option_d', 'd', 'choice_4', 'answer_4', 'الاختيار_4', 'الخيار_4'],
            'correct_index' => [
                'correct_answer',
                'correct_answers',
                'correct_option',
                'answer',
                'right_answer',
                'الإجابة_الصحيحة',
                'الاجابة_الصحيحة',
                // Common Excel header with no space between words
                'الإجابةالصحيحة',
                'الاجابةالصحيحة',
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

        $normalized['correct_index'] = $this->normalizeCorrectIndexValue($normalized['correct_index'] ?? null);

        return $normalized;
    }

    /**
     * Accept 1–4, Excel floats, and A/B/C/D (and common variants like "Answer A", "a)").
     */
    private function normalizeCorrectIndexValue(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_int($value) || is_float($value)) {
            $n = (int) round((float) $value);

            return ($n >= 1 && $n <= 4) ? $n : $value;
        }

        $s = trim((string) $value);
        if ($s === '') {
            return null;
        }

        if (preg_match('/^[1-4]$/', $s) === 1) {
            return (int) $s;
        }

        $upper = mb_strtoupper($s, 'UTF-8');
        if (preg_match('/^[A-D]$/u', $upper) === 1) {
            return match ($upper) {
                'A' => 1,
                'B' => 2,
                'C' => 3,
                'D' => 4,
                default => $value,
            };
        }

        if (preg_match('/\b([A-D])\b/u', $upper, $m) === 1) {
            return match ($m[1]) {
                'A' => 1,
                'B' => 2,
                'C' => 3,
                'D' => 4,
                default => $value,
            };
        }

        if (preg_match('/^([A-D])\)/u', $upper, $m) === 1) {
            return match ($m[1]) {
                'A' => 1,
                'B' => 2,
                'C' => 3,
                'D' => 4,
                default => $value,
            };
        }

        return $value;
    }

    private function courseAndTrackBelongToInterface(int $courseId, ?int $trackId, string $adminInterface): bool
    {
        $course = Course::query()->whereKey($courseId)->where('admin_interface', $adminInterface)->first();
        if (! $course) {
            return false;
        }
        if ($course->admin_interface === 'special') {
            if ($trackId === null) {
                return true;
            }

            return Track::query()->whereKey($trackId)->where('admin_interface', $adminInterface)->exists();
        }
        if ($course->track_id !== null) {
            return $trackId !== null && (int) $trackId === (int) $course->track_id;
        }
        if ($trackId === null) {
            return true;
        }

        return Track::query()->whereKey($trackId)->where('admin_interface', $adminInterface)->exists();
    }

    private function normalizeHeaderKey(string $key): string
    {
        $key = preg_replace('/^\xEF\xBB\xBF/', '', $key) ?? $key;
        $key = trim(mb_strtolower($key));
        $key = preg_replace('/[\s\-\/\\\\]+/u', '_', $key) ?? $key;

        return $key;
    }
}
