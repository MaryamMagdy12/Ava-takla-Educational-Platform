<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminResource;
use App\Models\Admin;
use App\Support\ApiResponse;
use App\Support\FieldValidation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminProfileController extends Controller
{
    public function show(Request $request)
    {
        /** @var Admin $admin */
        $admin = $request->user();

        return response()->json([
            'success' => true,
            'data' => new AdminResource($admin),
        ]);
    }

    public function update(Request $request)
    {
        /** @var Admin $admin */
        $admin = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', ...FieldValidation::phone11StartsWithZero()],
            'address' => ['nullable', ...FieldValidation::realisticAddress(512)],
            'current_password' => ['required_with:new_password', 'string'],
            'new_password' => ['nullable', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);

        if (! empty($data['new_password'])) {
            if (! Hash::check($data['current_password'], $admin->password)) {
                return ApiResponse::error('Current password is incorrect.', 422);
            }
            $admin->password = $data['new_password'];
        }

        $admin->fill([
            'name' => $data['name'] ?? $admin->name,
            'phone' => array_key_exists('phone', $data) ? $data['phone'] : $admin->phone,
            'address' => array_key_exists('address', $data) ? $data['address'] : $admin->address,
        ]);
        $admin->save();

        if (! empty($data['new_password'])) {
            $admin->tokens()->where('id', '!=', $request->user()->currentAccessToken()?->id)->delete();
        }

        return ApiResponse::success(new AdminResource($admin->fresh()), 'Profile updated.');
    }
}
