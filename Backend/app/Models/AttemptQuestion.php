<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttemptQuestion extends Model
{
    protected $fillable = ['exam_attempt_id', 'question_id', 'order_no', 'option_display_order', 'correct_option_id'];

    protected function casts(): array
    {
        return [
            'option_display_order' => 'array',
        ];
    }

    public function question()
    {
        return $this->belongsTo(Question::class);
    }
}
