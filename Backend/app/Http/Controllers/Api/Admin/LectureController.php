<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\ResolvesLmsAdminScope;
use App\Http\Controllers\Concerns\StreamsLectureMedia;
use App\Http\Controllers\Controller;
use App\Models\Lecture;
use App\Support\SecureUploadRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class LectureController extends Controller
{
    use ResolvesLmsAdminScope;
    use StreamsLectureMedia;

    private function audioMaxKb(): int
    {
        return max(1, (int) config('upload_limits.max_audio_upload_mb', 200)) * 1024;
    }

    private function videoMaxKb(): int
    {
        return max(1, (int) config('upload_limits.max_video_upload_mb', 1024)) * 1024;
    }

    public function index(Request $request)
    {
        $scope = $this->lmsAdminScope($request);

        $paginator = Lecture::query()
            ->whereHas('course', fn ($q) => $q->where('admin_interface', $scope))
            ->orderByDesc('id')
            ->paginate(20);
        $paginator->getCollection()->transform(fn (Lecture $l) => $this->adminLectureJson($l, $scope));

        return response()->json([
            'success' => true,
            'data' => $paginator,
        ]);
    }

    /**
     * Stream or redirect lecture media for admins (same authorization as CRUD).
     */
    public function preview(Request $request, Lecture $lecture)
    {
        $this->assertLectureInScope($request, $lecture);

        return $this->streamLectureMediaResponse($lecture);
    }

    /**
     * @return array<string, mixed>
     */
    private function adminLectureJson(Lecture $lecture, string $scope): array
    {
        $arr = $lecture->toArray();
        unset($arr['file_path']);
        $pathPrefix = $scope === 'special' ? '/admin/special-lms/lectures' : '/admin/lectures';
        $arr['preview_url'] = $pathPrefix.'/'.$lecture->id.'/preview';

        return $arr;
    }

    public function store(Request $request)
    {
        $scope = $this->lmsAdminScope($request);
        $data = $request->validate([
            'title' => ['required', 'string'],
            'course_id' => [
                'required',
                'integer',
                Rule::exists('courses', 'id')->where(fn ($q) => $q->where('admin_interface', $scope)),
            ],
            'track_id' => [
                'nullable',
                'integer',
                Rule::exists('tracks', 'id')->where(fn ($q) => $q->where('admin_interface', $scope)),
            ],
            'lecture_type' => ['required', 'in:audio,video'],
            'status' => ['nullable', 'in:active,inactive'],
            'external_url' => ['nullable', 'string', 'url', 'max:2048'],
            'file' => [
                'nullable',
                'file',
                SecureUploadRules::lectureMediaRule(
                    (string) $request->string('lecture_type'),
                    $request->string('lecture_type') === 'audio' ? $this->audioMaxKb() : $this->videoMaxKb(),
                ),
            ],
        ]);

        if (! $request->hasFile('file') && empty($data['external_url'])) {
            throw ValidationException::withMessages([
                'file' => ['Provide a media file or an external_url.'],
            ]);
        }

        if ($request->hasFile('file') && ! empty($data['external_url'])) {
            throw ValidationException::withMessages([
                'file' => ['Provide either a file or external_url, not both.'],
            ]);
        }

        $trackId = isset($data['track_id']) && $data['track_id'] !== null ? (int) $data['track_id'] : null;
        $this->assertCourseAndTrackInScope($request, (int) $data['course_id'], $trackId);
        $this->assertLmsContentTrackMatchesCourse($request, (int) $data['course_id'], $trackId);

        $warnings = [];
        $storageType = null;
        $filePath = null;
        $externalUrl = null;

        if ($request->hasFile('file')) {
            SecureUploadRules::rejectDangerousUpload($request->file('file'));
            $storageType = 'local_private';
            $filePath = $request->file('file')->store('lectures', 'private');
            if ($data['lecture_type'] === 'video') {
                $warnings[] = 'Large videos may affect performance. External streaming recommended.';
            }
        } else {
            $externalUrl = (string) $data['external_url'];
            if ($data['lecture_type'] === 'video') {
                $storageType = 'external_stream';
            } else {
                $storageType = 'external_file';
            }
        }

        unset($data['file'], $data['external_url']);
        $lecture = Lecture::query()->create([...$data, 'file_path' => $filePath, 'external_url' => $externalUrl, 'storage_type' => $storageType]);

        return response()->json([
            'success' => true,
            'warnings' => $warnings,
            'data' => $this->adminLectureJson($lecture->fresh(), $scope),
        ], 201);
    }

    public function update(Request $request, Lecture $lecture)
    {
        $this->assertLectureInScope($request, $lecture);
        $scope = $this->lmsAdminScope($request);
        $data = $request->validate([
            'title' => ['sometimes', 'string'],
            'course_id' => [
                'sometimes',
                'integer',
                Rule::exists('courses', 'id')->where(fn ($q) => $q->where('admin_interface', $scope)),
            ],
            'track_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('tracks', 'id')->where(fn ($q) => $q->where('admin_interface', $scope)),
            ],
            'lecture_type' => ['sometimes', 'in:audio,video'],
            'status' => ['sometimes', 'in:active,inactive'],
            'external_url' => ['sometimes', 'nullable', 'string', 'url', 'max:2048'],
            'file' => ['sometimes', 'nullable', 'file'],
        ]);

        $lectureType = (string) ($data['lecture_type'] ?? $lecture->lecture_type);
        if ($request->hasFile('file')) {
            $v = Validator::make(
                ['file' => $request->file('file')],
                [
                    'file' => [
                        'required',
                        'file',
                        SecureUploadRules::lectureMediaRule(
                            $lectureType,
                            $lectureType === 'audio' ? $this->audioMaxKb() : $this->videoMaxKb(),
                        ),
                    ],
                ]
            );
            $v->validate();
            SecureUploadRules::rejectDangerousUpload($request->file('file'));
        }

        if (isset($data['course_id']) || array_key_exists('track_id', $data)) {
            $newCourseId = (int) ($data['course_id'] ?? $lecture->course_id);
            $newTrackId = array_key_exists('track_id', $data) ? $data['track_id'] : $lecture->track_id;
            $newTrackId = $newTrackId === null ? null : (int) $newTrackId;
            $this->assertCourseAndTrackInScope($request, $newCourseId, $newTrackId);
            $this->assertLmsContentTrackMatchesCourse($request, $newCourseId, $newTrackId);
        }

        $warnings = [];

        if ($request->hasFile('file')) {
            $this->deleteStoredLectureMedia($lecture);
            $data['file_path'] = $request->file('file')->store('lectures', 'private');
            $data['external_url'] = null;
            $data['storage_type'] = 'local_private';
            if ($lectureType === 'video') {
                $warnings[] = 'Large videos may affect performance. External streaming recommended.';
            }
        } elseif (array_key_exists('external_url', $data)) {
            if ($data['external_url'] === null || $data['external_url'] === '') {
                throw ValidationException::withMessages(['external_url' => ['External URL cannot be empty when provided.']]);
            }
            $this->deleteStoredLectureMedia($lecture);
            $data['file_path'] = null;
            $data['storage_type'] = $lectureType === 'video' ? 'external_stream' : 'external_file';
        }

        unset($data['file']);
        $lecture->update($data);

        return response()->json([
            'success' => true,
            'warnings' => $warnings,
            'data' => $this->adminLectureJson($lecture->fresh(), $scope),
        ]);
    }

    public function destroy(Request $request, Lecture $lecture)
    {
        $this->assertLectureInScope($request, $lecture);
        $this->deleteStoredLectureMedia($lecture);
        $lecture->forceDelete();

        return response()->json(['success' => true]);
    }

    public function assignToStudent(Request $request, Lecture $lecture)
    {
        $this->assertLectureInScope($request, $lecture);
        $data = $request->validate(['student_id' => ['required', 'integer', 'exists:students,id']]);
        DB::table('student_lecture_access')->updateOrInsert($data + ['lecture_id' => $lecture->id], ['updated_at' => now(), 'created_at' => now()]);

        return response()->json(['success' => true]);
    }

    public function unassignFromStudent(Request $request, Lecture $lecture)
    {
        $this->assertLectureInScope($request, $lecture);
        $data = $request->validate(['student_id' => ['required', 'integer', 'exists:students,id']]);
        DB::table('student_lecture_access')->where($data + ['lecture_id' => $lecture->id])->delete();

        return response()->json(['success' => true]);
    }

    private function deleteStoredLectureMedia(Lecture $lecture): void
    {
        if ($lecture->storage_type !== 'local_private' || ! $lecture->file_path) {
            return;
        }
        foreach (['private', 'local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($lecture->file_path)) {
                Storage::disk($disk)->delete($lecture->file_path);
                break;
            }
        }
    }
}
