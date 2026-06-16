<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\HasApiTokens;

class Admin extends Authenticatable
{
    use HasApiTokens;

    public const ROLE_SUPER = 'super';

    public const ROLE_STUDENT = 'student';

    public const ROLE_GENERAL_ASSEMBLY = 'general_assembly';

    public const ROLE_SPECIAL = 'special';

    protected $fillable = [
        'name',
        'username',
        'email',
        'phone',
        'address',
        'password',
        'status',
        'admin_role',
        'last_login_at',
        'last_activity_at',
    ];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'last_login_at' => 'datetime',
            'last_activity_at' => 'datetime',
        ];
    }

    public function isSuperAdmin(): bool
    {
        return ($this->admin_role ?? self::ROLE_SUPER) === self::ROLE_SUPER;
    }

    /**
     * @return list<string>
     */
    public function allowedInterfaces(): array
    {
        if (Schema::hasTable('admin_interface_role_scopes')) {
            $scoped = DB::table('admin_interface_role_scopes')
                ->where('admin_role', $this->admin_role ?? self::ROLE_SUPER)
                ->pluck('admin_interface')
                ->filter(fn ($v) => is_string($v) && $v !== '')
                ->values()
                ->all();
            if ($scoped !== []) {
                return $scoped;
            }
        }

        if ($this->isSuperAdmin()) {
            return [self::ROLE_STUDENT, self::ROLE_GENERAL_ASSEMBLY, self::ROLE_SPECIAL];
        }

        return [$this->admin_role ?? self::ROLE_STUDENT];
    }

    public function defaultInterfaceSlug(): string
    {
        return match ($this->admin_role) {
            self::ROLE_GENERAL_ASSEMBLY => self::ROLE_GENERAL_ASSEMBLY,
            self::ROLE_SPECIAL => self::ROLE_SPECIAL,
            default => self::ROLE_STUDENT,
        };
    }
}
