<?php

use App\Http\Middleware\AssignLmsScope;
use App\Http\Middleware\AssignQuestionnaireScope;
use App\Http\Middleware\CheckUserActivity;
use App\Http\Middleware\EnsureAdminInterface;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\EnsureActiveApiUser;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\SecurityHeaders;
use App\Exceptions\ApiHttpException;
use App\Support\ApiErrorCode;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            SecurityHeaders::class,
        ]);
        $middleware->alias([
            'role' => EnsureRole::class,
            'active_api_user' => EnsureActiveApiUser::class,
            'check.user.activity' => CheckUserActivity::class,
            'admin.interface' => EnsureAdminInterface::class,
            'super.admin' => EnsureSuperAdmin::class,
            'questionnaire.scope' => AssignQuestionnaireScope::class,
            'lms.scope' => AssignLmsScope::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                $errors = $e->errors();
                $first = collect($errors)->flatten()->filter(fn ($m) => is_string($m) && $m !== '')->first();

                return ApiResponse::error(
                    $first ?: 'Validation failed.',
                    422,
                    $errors,
                    ApiErrorCode::VALIDATION_FAILED,
                );
            }
        });

        $exceptions->render(function (ModelNotFoundException $e, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error('Resource not found.', 404, null, ApiErrorCode::RESOURCE_NOT_FOUND);
            }
        });

        $exceptions->render(function (PostTooLargeException $e, Request $request) {
            if ($request->is('api/*')) {
                if (! config('app.debug')) {
                    return ApiResponse::error('Uploaded file is too large for this server.', 413);
                }

                $post = ini_get('post_max_size') ?: 'unknown';
                $upload = ini_get('upload_max_filesize') ?: 'unknown';

                return ApiResponse::error(
                    "HTTP 413: request body is larger than PHP allows (post_max_size={$post}, upload_max_filesize={$upload}). ".
                    'Fix: raise both in the php.ini used by your web server, restart Apache, or use this project’s `php artisan serve` (custom ServeCommand injects -d limits). '.
                    'With APP_DEBUG=true, GET /api/_dev/php-upload-limits shows the active values for the running app.',
                    413
                );
            }
        });

        $exceptions->render(function (ApiHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::errorWithCode(
                    $e->getMessage() !== '' ? $e->getMessage() : 'Request could not be completed.',
                    $e->errorCode,
                    $e->getStatusCode(),
                );
            }
        });

        $exceptions->render(function (HttpException $e, Request $request) {
            if ($request->is('api/*')) {
                if ($e instanceof ApiHttpException) {
                    return null;
                }

                $msg = $e->getMessage();
                $status = $e->getStatusCode();

                if (! config('app.debug')) {
                    $msg = match ($status) {
                        400 => 'Bad request.',
                        401 => 'Unauthenticated.',
                        403 => 'Forbidden.',
                        404 => 'Resource not found.',
                        405 => 'Method not allowed.',
                        409 => 'Conflict.',
                        413 => 'Uploaded file is too large for this server.',
                        422 => $msg !== '' ? $msg : 'Validation failed.',
                        429 => 'Too many attempts. Please try again later.',
                        default => 'Request could not be completed.',
                    };
                } elseif ($msg === '') {
                    $msg = 'Request could not be completed.';
                }

                $errorCode = match ($status) {
                    401 => ApiErrorCode::AUTH_INVALID_CREDENTIALS,
                    403 => ApiErrorCode::ACCESS_FORBIDDEN,
                    404 => ApiErrorCode::RESOURCE_NOT_FOUND,
                    409 => ApiErrorCode::RESOURCE_CONFLICT,
                    422 => ApiErrorCode::VALIDATION_FAILED,
                    429 => ApiErrorCode::AUTH_TOO_MANY_ATTEMPTS,
                    default => ApiErrorCode::SERVER_ERROR,
                };

                return ApiResponse::error($msg, $status, null, $errorCode);
            }
        });

        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*') && ! config('app.debug')) {
                report($e);

                return ApiResponse::error('Something went wrong.', 500, null, ApiErrorCode::SERVER_ERROR);
            }
        });
    })->create();
