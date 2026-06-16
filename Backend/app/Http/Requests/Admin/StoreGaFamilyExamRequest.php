<?php

namespace App\Http\Requests\Admin;

use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;

class StoreGaFamilyExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $titleRequirement = $this->isMethod('post') ? 'required' : 'sometimes';
        $durationRequirement = $this->isMethod('post') ? 'required' : 'sometimes';
        $availableFromRequirement = $this->isMethod('post') ? 'required' : 'sometimes';
        $availableToRequirement = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'title' => [$titleRequirement, 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'question_count' => ['nullable', 'integer', 'min:0'],
            'duration_minutes' => [$durationRequirement, 'integer', 'min:1', 'max:720'],
            'available_from' => [$availableFromRequirement, 'date'],
            'available_to' => [$availableToRequirement, 'date'],
            'status' => ['nullable', 'in:draft,published,closed'],
            'show_result_immediately' => ['nullable', 'boolean'],
            'chapter_scopes' => ['nullable', 'array'],
            'chapter_scopes.*.testament_type' => ['required_with:chapter_scopes', 'in:old,new'],
            'chapter_scopes.*.chapter_number' => ['required_with:chapter_scopes', 'integer', 'min:1'],
            'chapter_scopes.*.question_count' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $gaFamilyExam = $this->route('ga_family_exam');
            $availableFrom = $this->input('available_from', $gaFamilyExam?->available_from);
            $availableTo = $this->input('available_to', $gaFamilyExam?->available_to);

            if ($availableFrom === null || $availableTo === null) {
                return;
            }

            try {
                if (Carbon::parse((string) $availableTo)->lessThanOrEqualTo(Carbon::parse((string) $availableFrom))) {
                    $validator->errors()->add('available_to', 'The available to must be a date after available from.');
                }
            } catch (\Throwable) {
                // Date parsing failures are already handled by the base date rules.
            }
        });
    }
}
