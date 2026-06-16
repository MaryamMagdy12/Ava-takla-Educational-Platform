<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStudentQuestionnaireRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $scope = request()->attributes->get('questionnaire_admin_scope');

        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'level_id' => [
                'nullable',
                Rule::requiredIf($scope === 'student'),
                'integer',
                'exists:levels,id',
            ],
            'available_from' => ['required', 'date'],
            'available_to' => ['required', 'date', 'after:available_from'],
            'response_duration_minutes' => ['nullable', 'integer', 'min:1', 'max:10080'],
            'status' => ['nullable', 'in:draft,published,closed'],
        ];
    }

    public function withValidator($validator): void
    {
        $scope = request()->attributes->get('questionnaire_admin_scope');
        if (! is_string($scope) || $scope === '') {
            $validator->after(function ($v): void {
                $v->errors()->add('scope', 'Missing questionnaire admin scope.');
            });
        }
    }
}
