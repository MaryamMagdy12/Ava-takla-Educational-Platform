<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GaLecture extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title',
        'summary',
        'video_url',
        'video_file_path',
        'duration_label',
        'sort_order',
        'status',
    ];

    protected $appends = [
        'video_file_url',
        'access_url',
    ];

    protected $hidden = [
        'video_file_path',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function getVideoFileUrlAttribute(): ?string
    {
        return $this->familyAccessPath();
    }

    public function getAccessUrlAttribute(): ?string
    {
        return $this->familyAccessPath();
    }

    public function familyAccessPath(): ?string
    {
        if (! $this->video_file_path && ! $this->video_url) {
            return null;
        }

        if ($this->video_file_path) {
            return '/api/family/ga-lectures/'.$this->id.'/view';
        }

        return $this->video_url;
    }
}
