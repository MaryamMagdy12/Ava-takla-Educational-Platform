<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Admin;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

trait VerifiesAdminPassword
{
    protected function verifyAdminPassword(Request $request): ?JsonResponse
    {
        $request->validate([
            'admin_password' => ['required', 'string'],
        ]);

        $admin = $request->user();
        if (! $admin instanceof Admin || ! Hash::check((string) $request->input('admin_password'), $admin->password)) {
            return ApiResponse::error('Admin password is incorrect.', 422);
        }

        return null;
    }
}
