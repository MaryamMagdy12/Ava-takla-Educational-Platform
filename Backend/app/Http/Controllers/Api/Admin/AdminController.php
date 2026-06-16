<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\VerifiesAdminPassword;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAdminUserRequest;
use App\Models\Admin;
use App\Services\AuditLogService;
use App\Services\SystemAdminService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    use VerifiesAdminPassword;
    public function __construct(
        private readonly SystemAdminService $systemAdminService,
        private readonly AuditLogService $auditLogService,
    ) {}

    public function index()
    {
        $this->systemAdminService->ensureExists();

        $admins = Admin::query()
            ->orderByRaw("case when email = ? then 0 else 1 end", [config('system_admin.email')])
            ->orderBy('name')
            ->paginate(20);

        $admins->getCollection()->transform(function (Admin $admin) {
            return [
                'id' => $admin->id,
                'name' => $admin->name,
                'username' => $admin->username,
                'email' => $admin->email,
                'status' => $admin->status,
                'admin_role' => $admin->admin_role ?? Admin::ROLE_SUPER,
                'is_system' => $this->systemAdminService->isSystemAdmin($admin),
            ];
        });

        return ApiResponse::success($admins);
    }

    public function store(StoreAdminUserRequest $request)
    {
        if ($response = $this->verifyAdminPassword($request)) {
            return $response;
        }

        $data = $request->validated();

        $admin = Admin::query()->create([
            'name' => $data['name'],
            'username' => $data['username'],
            'email' => $data['email'] ?? null,
            'password' => $data['password'],
            'status' => $data['status'] ?? 'active',
            'admin_role' => $data['admin_role'],
        ]);

        $this->auditLogService->log('admin.created', $request->user(), $admin, [
            'admin_role' => $admin->admin_role,
        ], $request);

        return ApiResponse::success($admin, 'Admin created.', 201);
    }

    public function update(Request $request, Admin $admin)
    {
        $wasActive = $admin->status === 'active';
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'username' => ['sometimes', 'string', 'max:255', 'unique:admins,username,'.$admin->id],
            'email' => ['sometimes', 'email', 'max:255', 'unique:admins,email,'.$admin->id],
            'password' => ['nullable', 'string', 'min:8', 'max:255'],
            'status' => ['sometimes', 'in:active,inactive'],
            'admin_role' => [
                'sometimes',
                Rule::in([
                    Admin::ROLE_STUDENT,
                    Admin::ROLE_GENERAL_ASSEMBLY,
                    Admin::ROLE_SPECIAL,
                    Admin::ROLE_SUPER,
                ]),
            ],
            'admin_password' => ['nullable', 'string'],
        ]);

        if (! empty($data['password'])) {
            if ($response = $this->verifyAdminPassword($request)) {
                return $response;
            }
        }

        if (! $request->user()->isSuperAdmin()) {
            unset($data['admin_role']);
        }

        if ($this->systemAdminService->isSystemAdmin($admin)) {
            unset($data['admin_role']);
            unset($data['status']);
            $data['email'] = config('system_admin.email');
            $data['username'] = config('system_admin.username');
        }

        if (empty($data['password'])) {
            unset($data['password']);
        }

        unset($data['admin_password']);

        $admin->update($data);
        if (($data['status'] ?? null) === 'inactive' && $wasActive) {
            $admin->tokens()->delete();
        }
        if (isset($data['password'])) {
            if ((int) $request->user()->id === (int) $admin->id) {
                $admin->tokens()->where('id', '!=', $request->user()->currentAccessToken()?->id)->delete();
            } else {
                $admin->tokens()->delete();
            }
        }

        $this->auditLogService->log('admin.updated', $request->user(), $admin->fresh(), [], $request);

        return ApiResponse::success([
            'id' => $admin->id,
            'name' => $admin->fresh()->name,
            'username' => $admin->fresh()->username,
            'email' => $admin->fresh()->email,
            'status' => $admin->fresh()->status,
            'admin_role' => $admin->fresh()->admin_role ?? Admin::ROLE_SUPER,
            'is_system' => $this->systemAdminService->isSystemAdmin($admin->fresh()),
        ], 'Admin updated.');
    }

    public function destroy(Request $request, Admin $admin)
    {
        if ($response = $this->verifyAdminPassword($request)) {
            return $response;
        }

        if ($this->systemAdminService->isSystemAdmin($admin)) {
            return ApiResponse::error('The main system admin cannot be deleted.', 422);
        }

        $admin->delete();

        return ApiResponse::success(null, 'Admin deleted.');
    }
}

