<?php

namespace App\Http\Requests\Family;

use Illuminate\Foundation\Http\FormRequest;

class SubmitGaFamilyExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'answers' => ['required', 'array'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.selected_option_id' => ['nullable', 'integer'],
        ];
    }
}
