<?php

namespace App\Http\Resources;

use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Student */
class StudentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'level_id' => $this->level_id,
            'track_id' => $this->track_id,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'parent_name' => $this->parent_name,
            'parent_phone' => $this->parent_phone,
            'parent_email' => $this->parent_email,
            'student_unique_id' => $this->student_unique_id,
            'serial_number' => $this->serial_number,
            'must_change_password' => (bool) $this->must_change_password,
            'status' => $this->status,
            'last_activity_at' => $this->last_activity_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'level' => $this->whenLoaded('level'),
            'track' => $this->whenLoaded('track'),
        ];
    }
}
