<?php

namespace App\Http\Requests\Admin;

use App\Models\Admin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdminUserRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:admins,username'],
            'email' => ['required', 'email', 'max:255', 'unique:admins,email'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'admin_role' => [
                'required',
                Rule::in([
                    Admin::ROLE_STUDENT,
                    Admin::ROLE_GENERAL_ASSEMBLY,
                    Admin::ROLE_SPECIAL,
                    Admin::ROLE_SUPER,
                ]),
            ],
            'admin_password' => ['required', 'string'],
        ];
    }
}
