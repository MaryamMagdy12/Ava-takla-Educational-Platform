<?php

namespace App\Http\Requests\Admin;

use App\Support\FieldValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStudentRequest extends FormRequest
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
            'full_name' => ['required', 'string', 'max:255'],
            'level_id' => [
                'required',
                'integer',
                Rule::exists('levels', 'id')->where(fn ($q) => $q->where('admin_interface', 'student')),
            ],
            'track_id' => [
                'nullable',
                'integer',
                Rule::exists('tracks', 'id')->where(fn ($q) => $q->where('admin_interface', 'student')),
            ],
            'email' => ['nullable', 'email', 'max:255', 'unique:students,email'],
            'parent_name' => ['required', 'string', 'max:255'],
            'parent_phone' => ['required', ...FieldValidation::phone11StartsWithZero()],
            'parent_email' => ['required', 'email', 'max:255'],
            'status' => ['nullable', 'in:active,inactive'],
        ];
    }
}
