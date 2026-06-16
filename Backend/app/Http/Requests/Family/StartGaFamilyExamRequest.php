<?php

namespace App\Http\Requests\Family;

use Illuminate\Foundation\Http\FormRequest;

class StartGaFamilyExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [];
    }
}
