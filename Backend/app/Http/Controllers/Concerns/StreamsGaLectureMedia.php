<?php

namespace App\Http\Controllers\Concerns;

use App\Models\GaLecture;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

trait StreamsGaLectureMedia
{
    /**
     * @return RedirectResponse|StreamedResponse
     */
    protected function streamGaLectureMediaResponse(GaLecture $lecture): RedirectResponse|StreamedResponse
    {
        if ($lecture->video_url) {
            return redirect()->away($lecture->video_url);
        }

        if (! $lecture->video_file_path) {
            abort(404);
        }

        foreach (['private', 'local', 'public'] as $diskName) {
            $disk = Storage::disk($diskName);
            if ($disk instanceof FilesystemAdapter && $disk->exists($lecture->video_file_path)) {
                return $disk->response($lecture->video_file_path);
            }
        }

        abort(404);
    }
}
