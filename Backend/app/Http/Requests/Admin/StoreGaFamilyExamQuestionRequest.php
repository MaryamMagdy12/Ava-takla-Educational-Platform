<?php

namespace App\Http\Requests\Admin;

use App\Models\GaFamilyExam;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreGaFamilyExamQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'testament_type' => ['required', 'in:old,new'],
            'chapter_number' => ['required', 'integer', 'min:1'],
            'question_text' => ['required', 'string'],
            'difficulty' => ['nullable', 'in:easy,medium,hard'],
            'feedback_correct' => ['nullable', 'string'],
            'feedback_wrong' => ['nullable', 'string'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $exam = $this->route('ga_family_exam');
            if (! $exam instanceof GaFamilyExam) {
                return;
            }

            $testamentType = (string) $this->input('testament_type');
            $chapterNumber = (int) $this->input('chapter_number');
            if (! $exam->allowsQuestionScope($testamentType, $chapterNumber)) {
                $validator->errors()->add(
                    'chapter_number',
                    'الأصحاح المحدد خارج نطاق إعدادات الامتحان المختار.'
                );
            }
        });
    }
}
