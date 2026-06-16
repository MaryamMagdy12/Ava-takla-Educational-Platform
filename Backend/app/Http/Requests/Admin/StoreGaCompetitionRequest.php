<?php

namespace App\Http\Requests\Admin;

use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreGaCompetitionRequest extends FormRequest
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
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'max_attempt_duration_hours' => ['nullable', 'integer', 'min:1', 'max:720'],
            'status' => ['nullable', 'in:draft,published,closed'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $starts = $this->input('starts_at');
            $ends = $this->input('ends_at');
            if (! $starts || ! $ends) {
                return;
            }
            $hours = Carbon::parse($starts)->diffInHours(Carbon::parse($ends));
            if ($hours < 48 || $hours > 120) {
                $validator->errors()->add('ends_at', 'Competition window must be between 2 and 5 days (48–120 hours).');
            }
        });
    }
}
