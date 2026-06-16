<?php

namespace App\Support;

use App\Exceptions\ApiHttpException;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rules\File as FileRule;

final class SecureUploadRules
{
    /**
     * @param  list<string>  $extensions
     * @param  list<string>  $mimetypes
     */
    public static function fileRule(array $extensions, array $mimetypes, int $maxKilobytes): FileRule
    {
        $rule = (new FileRule)
            ->extensions($extensions)
            ->max($maxKilobytes);

        if ($mimetypes !== []) {
            $rule = $rule->types($mimetypes);
        }

        return $rule;
    }

    public static function imageRule(int $maxKilobytes = 2048): FileRule
    {
        return self::fileRule(
            ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            $maxKilobytes,
        );
    }

    /**
     * @param  list<string>  $extensions
     */
    public static function lectureMediaRule(string $lectureType, int $maxKilobytes, array $extensions = []): FileRule
    {
        if ($extensions === []) {
            $extensions = $lectureType === 'audio' ? ['mp3', 'wav', 'm4a'] : ['mp4', 'webm'];
        }

        $mimetypes = $lectureType === 'audio'
            ? ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a']
            : ['video/mp4', 'video/webm'];

        return self::fileRule($extensions, $mimetypes, $maxKilobytes);
    }

    public static function spreadsheetRule(int $maxKilobytes = 5120): FileRule
    {
        return self::fileRule(
            ['csv', 'txt', 'xlsx'],
            [
                'text/csv',
                'text/plain',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/csv',
            ],
            $maxKilobytes,
        );
    }

    public static function rejectDangerousUpload(UploadedFile $file): void
    {
        $name = mb_strtolower($file->getClientOriginalName());
        foreach (['.php', '.phtml', '.phar', '.exe', '.bat', '.cmd', '.sh', '.js', '.html', '.htm', '.svg'] as $blocked) {
            if (str_ends_with($name, $blocked)) {
                ApiHttpException::throw(422, 'Invalid file type or file size.', ApiErrorCode::MEDIA_INVALID_UPLOAD);
            }
        }
    }
}
