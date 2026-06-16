<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Book extends Model
{
    use SoftDeletes;

    protected $fillable = ['title', 'course_id', 'track_id', 'file_path', 'file_type', 'status'];

    protected $appends = ['file_size_mb'];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function getFileSizeMbAttribute(): ?float
    {
        if (! $this->file_path) {
            return null;
        }
        foreach (['private', 'local', 'public'] as $disk) {
            try {
                if (Storage::disk($disk)->exists($this->file_path)) {
                    return round(Storage::disk($disk)->size($this->file_path) / 1024 / 1024, 1);
                }
            } catch (\Throwable) {
                continue;
            }
        }

        return null;
    }

    public function studentAccessPath(): string
    {
        return '/api/student/books/'.$this->id.'/view';
    }
}
