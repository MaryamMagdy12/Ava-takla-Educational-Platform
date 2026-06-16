<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GaLecture;
use App\Support\SecureUploadRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class GaLectureController extends Controller
{
    /** @var int Max upload size in kilobytes (~500 MB). */
    private const VIDEO_MAX_KB = 512000;

    private const GA_MEDIA_MIMETYPES = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/ogg', 'audio/aac',
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska',
    ];

    public function index()
    {
        $rows = GaLecture::query()->orderBy('sort_order')->orderByDesc('id')->paginate(30);

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'summary' => ['nullable', 'string'],
            'video_url' => ['nullable', 'string', 'max:2048'],
            'video' => ['nullable', 'file', SecureUploadRules::fileRule(
                ['mp3', 'mp4', 'mov', 'mkv', 'wav', 'm4a', 'webm', 'ogg', 'oga', 'aac'],
                self::GA_MEDIA_MIMETYPES,
                self::VIDEO_MAX_KB,
            )],
            'duration_label' => ['nullable', 'string', 'max:120'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'in:draft,published,archived'],
        ]);
        $payload = collect($data)->except('video')->all();
        if ($request->hasFile('video')) {
            SecureUploadRules::rejectDangerousUpload($request->file('video'));
            $payload['video_file_path'] = $request->file('video')->store('ga-lectures', 'private');
        }
        $row = GaLecture::query()->create($payload);

        return response()->json(['success' => true, 'data' => $row->fresh()], 201);
    }

    public function show(GaLecture $gaLecture)
    {
        return response()->json(['success' => true, 'data' => $gaLecture]);
    }

    public function update(Request $request, GaLecture $gaLecture)
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'summary' => ['nullable', 'string'],
            'video_url' => ['nullable', 'string', 'max:2048'],
            'video' => ['nullable', 'file', SecureUploadRules::fileRule(
                ['mp3', 'mp4', 'mov', 'mkv', 'wav', 'm4a', 'webm', 'ogg', 'oga', 'aac'],
                self::GA_MEDIA_MIMETYPES,
                self::VIDEO_MAX_KB,
            )],
            'duration_label' => ['nullable', 'string', 'max:120'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'status' => ['sometimes', 'in:draft,published,archived'],
        ]);
        $payload = collect($data)->except('video')->all();
        if ($request->hasFile('video')) {
            SecureUploadRules::rejectDangerousUpload($request->file('video'));
            if ($gaLecture->video_file_path) {
                foreach (['private', 'local', 'public'] as $disk) {
                    Storage::disk($disk)->delete($gaLecture->video_file_path);
                }
            }
            $payload['video_file_path'] = $request->file('video')->store('ga-lectures', 'private');
        }
        $gaLecture->update($payload);

        return response()->json(['success' => true, 'data' => $gaLecture->fresh()]);
    }

    public function destroy(GaLecture $gaLecture)
    {
        if ($gaLecture->video_file_path) {
            foreach (['private', 'local', 'public'] as $disk) {
                Storage::disk($disk)->delete($gaLecture->video_file_path);
            }
        }
        $gaLecture->forceDelete();

        return response()->json(['success' => true, 'message' => 'Deleted.']);
    }
}
