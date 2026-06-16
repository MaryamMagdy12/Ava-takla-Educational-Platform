<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\ResolvesLmsAdminScope;
use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\Exam;
use App\Models\Level;
use App\Models\Lecture;
use App\Models\Question;
use App\Models\Student;
use App\Models\Track;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class LevelTrackController extends Controller
{
    use ResolvesLmsAdminScope;

    public function tracks(Request $request)
    {
        $scope = $this->lmsAdminScope($request);

        return response()->json([
            'success' => true,
            'data' => Track::query()
                ->where('admin_interface', $scope)
                ->select(['id', 'name', 'admin_interface', 'description', 'status'])
                ->orderBy('name')
                ->limit(100)
                ->get(),
        ]);
    }

    public function storeTrack(Request $request)
    {
        $scope = $this->lmsAdminScope($request);
        $data = $request->validate([
            'name' => [
                'required',
                'string',
                Rule::unique('tracks', 'name')->where(fn ($q) => $q->where('admin_interface', $scope)),
            ],
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ]);
        $data['admin_interface'] = $scope;
        $track = Track::query()->create($data);

        return response()->json(['success' => true, 'data' => $track], 201);
    }

    public function updateTrack(Request $request, Track $track)
    {
        $this->assertTrackInScope($request, $track);
        $scope = $this->lmsAdminScope($request);
        $track->update($request->validate([
            'name' => [
                'sometimes',
                'string',
                Rule::unique('tracks', 'name')->where(fn ($q) => $q->where('admin_interface', $scope))->ignore($track->id),
            ],
            'description' => 'nullable|string',
            'status' => 'sometimes|in:active,inactive',
        ]));

        return response()->json(['success' => true, 'data' => $track->fresh()]);
    }

    public function destroyTrack(Request $request, Track $track)
    {
        $this->assertTrackInScope($request, $track);
        $reasons = [];
        if (Level::query()->where('track_id', $track->id)->exists()) {
            $reasons[] = 'levels';
        }
        if (Student::query()->where('track_id', $track->id)->exists()) {
            $reasons[] = 'students';
        }
        if (Exam::query()->where('track_id', $track->id)->exists()) {
            $reasons[] = 'exams';
        }
        if (Book::query()->where('track_id', $track->id)->exists()) {
            $reasons[] = 'books';
        }
        if (Lecture::query()->where('track_id', $track->id)->exists()) {
            $reasons[] = 'lectures';
        }
        if (Question::query()->where('track_id', $track->id)->exists()) {
            $reasons[] = 'questions';
        }
        if ($reasons !== []) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete track: it is still used by: '.implode(', ', $reasons).'.',
            ], 422);
        }
        $track->delete();

        return response()->json(['success' => true]);
    }

    public function levels(Request $request)
    {
        $scope = $this->lmsAdminScope($request);

        return response()->json([
            'success' => true,
            'data' => Level::query()
                ->where('admin_interface', $scope)
                ->select(['id', 'name', 'track_id', 'code_prefix', 'permanent_password_prefix', 'admin_interface', 'status'])
                ->with(['track:id,name'])
                ->orderBy('name')
                ->limit(100)
                ->get(),
        ]);
    }

    public function storeLevel(Request $request)
    {
        $scope = $this->lmsAdminScope($request);
        $data = $request->validate([
            'track_id' => [
                'required',
                'integer',
                Rule::exists('tracks', 'id')->where(fn ($q) => $q->where('admin_interface', $scope)),
            ],
            'name' => [
                'required',
                'string',
                Rule::unique('levels', 'name')->where(fn ($q) => $q->where('track_id', (int) $request->integer('track_id'))),
            ],
            'code_prefix' => [
                'required',
                'string',
                'size:4',
                Rule::unique('levels', 'code_prefix')->where(fn ($q) => $q->where('admin_interface', $scope)),
            ],
            'permanent_password_prefix' => ['required', 'string', 'max:32'],
            'status' => 'nullable|in:active,inactive',
        ]);
        $data['permanent_password_prefix'] = trim($data['permanent_password_prefix']);
        if ($data['permanent_password_prefix'] === '') {
            throw ValidationException::withMessages([
                'permanent_password_prefix' => ['The permanent password prefix cannot be empty.'],
            ]);
        }
        $data['admin_interface'] = $scope;
        $level = Level::query()->create($data);

        return response()->json(['success' => true, 'data' => $level->load('track')], 201);
    }

    public function updateLevel(Request $request, Level $level)
    {
        $this->assertLevelInScope($request, $level);
        $scope = $this->lmsAdminScope($request);
        $trackIdForName = (int) ($request->filled('track_id') ? $request->integer('track_id') : $level->track_id);
        $data = $request->validate([
            'track_id' => [
                'sometimes',
                'integer',
                Rule::exists('tracks', 'id')->where(fn ($q) => $q->where('admin_interface', $scope)),
            ],
            'name' => [
                'sometimes',
                'string',
                Rule::unique('levels', 'name')->where(fn ($q) => $q->where('track_id', $trackIdForName))->ignore($level->id),
            ],
            'code_prefix' => [
                'sometimes',
                'string',
                'size:4',
                Rule::unique('levels', 'code_prefix')->where(fn ($q) => $q->where('admin_interface', $scope))->ignore($level->id),
            ],
            'permanent_password_prefix' => ['sometimes', 'string', 'max:32'],
            'status' => 'sometimes|in:active,inactive',
        ]);
        if (array_key_exists('permanent_password_prefix', $data)) {
            $data['permanent_password_prefix'] = trim($data['permanent_password_prefix']);
            if ($data['permanent_password_prefix'] === '') {
                throw ValidationException::withMessages([
                    'permanent_password_prefix' => ['The permanent password prefix cannot be empty.'],
                ]);
            }
        }
        if (array_key_exists('track_id', $data)) {
            $data['admin_interface'] = $scope;
        }
        $level->update($data);

        return response()->json(['success' => true, 'data' => $level->fresh()->load('track')]);
    }

    public function destroyLevel(Request $request, Level $level)
    {
        $this->assertLevelInScope($request, $level);
        if (Student::query()->where('level_id', $level->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete level: students are assigned to it.',
            ], 422);
        }
        $level->delete();

        return response()->json(['success' => true]);
    }
}
