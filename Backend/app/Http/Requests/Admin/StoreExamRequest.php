<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreExamRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:500'],
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'track_id' => ['nullable', 'integer', 'exists:tracks,id'],
            'duration_minutes' => ['required', 'integer', 'min:1', 'max:1440'],
            'question_count' => ['required', 'integer', 'min:1'],
            'available_from' => ['required', 'date'],
            'available_to' => ['required', 'date', 'after:available_from'],
            'status' => ['nullable', 'in:draft,published,closed'],
            'easy_count' => ['nullable', 'integer', 'min:0'],
            'medium_count' => ['nullable', 'integer', 'min:0'],
            'hard_count' => ['nullable', 'integer', 'min:0'],
            'pass_mark' => ['nullable', 'integer', 'min:0', 'max:100'],
            'show_correct_answers_after_submit' => ['nullable', 'boolean'],
        ];
    }
}
