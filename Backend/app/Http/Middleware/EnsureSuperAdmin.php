<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdmin
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof Admin || ! $user->isSuperAdmin()) {
            return ApiResponse::error('Only a super administrator can perform this action.', 403);
        }

        return $next($request);
    }
}
