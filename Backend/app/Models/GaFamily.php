<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class GaFamily extends Authenticatable
{
    use HasApiTokens;
    use SoftDeletes;

    protected $table = 'ga_families';

    protected $fillable = [
        'family_login_id',
        'display_name',
        'password',
        'permanent_password_secret_hash',
        'must_change_password',
        'status',
        'last_login_at',
        'last_activity_at',
    ];

    protected $hidden = ['password', 'permanent_password_secret_hash'];

    /**
     * When null or empty, legacy permanent password is used (Ga# + 3 name letters + family_login_id).
     * Otherwise the random tail is stored only as a bcrypt hash; plaintext is shown once on create/reset.
     */
    public function hasLegacyPermanentPassword(): bool
    {
        $h = $this->permanent_password_secret_hash;

        return $h === null || $h === '';
    }

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'last_login_at' => 'datetime',
            'last_activity_at' => 'datetime',
        ];
    }
}
