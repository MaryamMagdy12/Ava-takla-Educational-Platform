<?php

namespace App\Exceptions;

use App\Support\ApiErrorCode;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ApiHttpException extends HttpException
{
    public function __construct(
        int $statusCode,
        string $message,
        public readonly string $errorCode = ApiErrorCode::SERVER_ERROR,
        ?\Throwable $previous = null,
        int $code = 0,
        array $headers = [],
    ) {
        parent::__construct($statusCode, $message, $previous, $headers, $code);
    }

    public static function throw(int $statusCode, string $message, string $errorCode = ApiErrorCode::SERVER_ERROR): never
    {
        throw new self($statusCode, $message, $errorCode);
    }
}
