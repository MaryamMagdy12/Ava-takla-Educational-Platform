<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreGaCompetitionQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ga_competition_topic_id' => ['required', 'integer', 'exists:ga_competition_topics,id'],
            'body' => ['required', 'string'],
            'type' => ['required', 'in:mcq,true_false'],
            'testament_type' => ['required', 'in:old,new'],
            'chapter_number' => ['required', 'integer', 'min:1'],
            'difficulty' => ['nullable', 'in:easy,medium,hard'],
            'feedback_correct' => ['nullable', 'string'],
            'feedback_wrong' => ['nullable', 'string'],
            'status' => ['nullable', 'in:active,inactive'],
            'order_no' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
