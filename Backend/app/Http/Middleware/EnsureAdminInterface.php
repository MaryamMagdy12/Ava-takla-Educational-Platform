<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Support\ApiErrorCode;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminInterface
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string $interface): Response
    {
        $user = $request->user();

        if (! $user instanceof Admin) {
            return ApiResponse::error('Unauthorized.', 403);
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        if ($user->admin_role === $interface) {
            return $next($request);
        }

        return ApiResponse::error('You do not have permission to access this dashboard.', 403, null, ApiErrorCode::ACCESS_WRONG_INTERFACE);
    }
}
