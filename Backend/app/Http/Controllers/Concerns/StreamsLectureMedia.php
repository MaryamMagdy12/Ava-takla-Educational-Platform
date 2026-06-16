<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Lecture;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

trait StreamsLectureMedia
{
    /**
     * Stream a stored lecture file or redirect to an external URL.
     *
     * @return RedirectResponse|StreamedResponse
     */
    protected function streamLectureMediaResponse(Lecture $lecture): RedirectResponse|StreamedResponse
    {
        if (in_array($lecture->storage_type, ['external_stream', 'external_file'], true) && $lecture->external_url) {
            if (! $this->isAllowedExternalLectureUrl($lecture->external_url)) {
                abort(403);
            }

            return redirect()->away($lecture->external_url);
        }

        if (! $lecture->file_path) {
            abort(404);
        }

        foreach (['private', 'local', 'public'] as $diskName) {
            $disk = Storage::disk($diskName);
            if ($disk instanceof FilesystemAdapter && $disk->exists($lecture->file_path)) {
                return $disk->response($lecture->file_path);
            }
        }

        abort(404);
    }

    private function isAllowedExternalLectureUrl(string $url): bool
    {
        $parts = parse_url($url);
        if (! is_array($parts)) {
            return false;
        }

        $scheme = mb_strtolower((string) ($parts['scheme'] ?? ''));
        $host = mb_strtolower((string) ($parts['host'] ?? ''));
        if ($scheme === '' || $host === '') {
            return false;
        }

        $httpsOnly = (bool) config('media.lecture_external_https_only', true);
        if ($httpsOnly && $scheme !== 'https') {
            return false;
        }

        if (! $httpsOnly && ! in_array($scheme, ['https', 'http'], true)) {
            return false;
        }

        $allowedHosts = config('media.lecture_external_allowed_hosts', []);
        if (! is_array($allowedHosts) || $allowedHosts === []) {
            return true;
        }

        foreach ($allowedHosts as $allowed) {
            $allowed = mb_strtolower((string) $allowed);
            if ($allowed === '') {
                continue;
            }
            if ($host === $allowed || Str::endsWith($host, '.'.$allowed)) {
                return true;
            }
        }

        return false;
    }
}
