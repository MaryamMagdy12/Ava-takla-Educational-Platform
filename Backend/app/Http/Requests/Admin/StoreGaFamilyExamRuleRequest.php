<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreGaFamilyExamRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'testament_type' => ['required', 'in:old,new'],
            'chapter_number' => ['nullable', 'integer', 'min:1'],
            'question_count' => ['required', 'integer', 'min:1'],
            'difficulty' => ['nullable', 'in:easy,medium,hard'],
        ];
    }
}
