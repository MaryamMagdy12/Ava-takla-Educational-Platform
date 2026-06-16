<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

final class ApiResponse
{
    public static function success(mixed $data = null, ?string $message = null, int $status = 200): JsonResponse
    {
        $body = ['success' => true];
        if ($message !== null) {
            $body['message'] = $message;
        }
        if ($data !== null) {
            $body['data'] = $data;
        }

        return response()->json($body, $status);
    }

    public static function error(
        string $message,
        int $status = 400,
        mixed $errors = null,
        ?string $errorCode = null,
    ): JsonResponse {
        $body = [
            'success' => false,
            'message' => $message,
        ];
        if ($errorCode !== null) {
            $body['error_code'] = $errorCode;
        }
        if ($errors !== null) {
            $body['errors'] = $errors;
        }

        return response()->json($body, $status);
    }

    public static function errorWithCode(
        string $message,
        string $errorCode,
        int $status = 400,
        mixed $errors = null,
    ): JsonResponse {
        return self::error($message, $status, $errors, $errorCode);
    }
}
