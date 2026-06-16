<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Filesystem\FilesystemAdapter;
class SpecialLearner extends Authenticatable
{
    use HasApiTokens;
    use SoftDeletes;

    protected $table = 'special_learners';

    protected $fillable = [
        'full_name',
        'email',
        'phone',
        'address',
        'age',
        'birth_date',
        'profile_picture',
        'password',
        'permanent_password_secret_hash',
        'must_change_password',
        'status',
        'email_verified_at',
        'google_id',
        'last_login_at',
        'last_activity_at',
    ];

    protected $hidden = ['password', 'permanent_password_secret_hash'];

    protected $appends = ['profile_picture_url'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'last_activity_at' => 'datetime',
            'birth_date' => 'date',
            'age' => 'integer',
        ];
    }

    /**
     * Full URL for external images (e.g. Google) or /storage/… for uploaded files.
     */
    protected function profilePictureUrl(): Attribute
    {
        return Attribute::get(function (): ?string {
            $raw = $this->attributes['profile_picture'] ?? null;
            if ($raw === null || $raw === '') {
                return null;
            }
            if (preg_match('#^https?://#i', (string) $raw)) {
                return (string) $raw;
            }

            $disk = Storage::disk('public');
            if ($disk instanceof FilesystemAdapter && $disk->exists($raw)) {
                return $disk->url($raw);
            }

            return null;
        });
    }
}
