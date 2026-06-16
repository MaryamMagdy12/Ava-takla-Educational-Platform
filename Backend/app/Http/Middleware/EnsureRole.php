<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Models\GaFamily;
use App\Models\SpecialLearner;
use App\Models\Student;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();
        $ok = ($role === 'admin' && $user instanceof Admin)
            || ($role === 'student' && $user instanceof Student)
            || ($role === 'ga_family' && $user instanceof GaFamily)
            || ($role === 'special_learner' && $user instanceof SpecialLearner);

        if (! $ok) {
            return ApiResponse::error('Unauthorized role access.', 403);
        }

        return $next($request);
    }
}
