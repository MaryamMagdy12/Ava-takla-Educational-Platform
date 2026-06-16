<?php

namespace App\Services;

use App\Models\Admin;
use Illuminate\Support\Str;

class SystemAdminService
{
    public function ensureExists(): Admin
    {
        $this->guardConfiguration();

        $email = (string) config('system_admin.email');
        $username = (string) config('system_admin.username');
        $admin = Admin::query()
            ->where('email', $email)
            ->orWhere('username', $username)
            ->first() ?? new Admin();

        $admin->fill([
            'name' => config('system_admin.name'),
            'username' => $username,
            'email' => $email,
            'password' => config('system_admin.password'),
            'status' => 'active',
            'admin_role' => Admin::ROLE_SUPER,
        ]);
        $admin->save();

        return $admin;
    }

    public function isSystemAdmin(Admin $admin): bool
    {
        return $admin->email === (string) config('system_admin.email')
            || $admin->username === (string) config('system_admin.username');
    }

    private function guardConfiguration(): void
    {
        $name = trim((string) config('system_admin.name'));
        $email = trim((string) config('system_admin.email'));
        $username = trim((string) config('system_admin.username'));
        $password = (string) config('system_admin.password');

        if ($name === '') {
            abort(503, 'SYSTEM_ADMIN_NAME must be set in your .env file.');
        }

        if ($username === '') {
            abort(503, 'SYSTEM_ADMIN_USERNAME must be set in your .env file (at least 3 characters).');
        }

        if ($email === '') {
            abort(503, 'SYSTEM_ADMIN_EMAIL must be set in your .env file.');
        }

        if ($password === '') {
            abort(503, 'SYSTEM_ADMIN_PASSWORD must be set in your .env file (at least 12 characters).');
        }

        if (Str::length($name) > 255) {
            abort(503, 'SYSTEM_ADMIN_NAME is too long.');
        }

        if (! filter_var($email, FILTER_VALIDATE_EMAIL) || Str::length($username) < 3 || Str::length($password) < 12) {
            abort(503, 'System admin configuration is invalid: check SYSTEM_ADMIN_EMAIL, SYSTEM_ADMIN_USERNAME, and SYSTEM_ADMIN_PASSWORD.');
        }

        $strict = ! app()->isLocal() && ! app()->environment('testing');
        if ($strict) {
            $weakPasswords = ['Admin@123456', 'password', 'Password@123', 'changeme', 'change_me', 'secret'];
            if (in_array($password, $weakPasswords, true)) {
                abort(503, 'SYSTEM_ADMIN_PASSWORD must be a strong, unique secret in production.');
            }
            if (strcasecmp($email, 'admin@example.com') === 0) {
                abort(503, 'Set SYSTEM_ADMIN_EMAIL to a real address in production.');
            }
        }
    }
}

