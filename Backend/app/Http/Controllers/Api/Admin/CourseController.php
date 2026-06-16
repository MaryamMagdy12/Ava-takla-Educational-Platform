<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\ResolvesLmsAdminScope;
use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CourseController extends Controller
{
    use ResolvesLmsAdminScope;

    public function index(Request $request)
    {
        $scope = $this->lmsAdminScope($request);

        return response()->json([
            'success' => true,
            'data' => Course::query()
                ->where('admin_interface', $scope)
                ->with('track:id,name')
                ->when($request->filled('track_id'), fn ($q) => $q->where('track_id', $request->integer('track_id')))
                ->orderBy('name')
                ->paginate(20),
        ]);
    }

    public function store(Request $request)
    {
        $scope = $this->lmsAdminScope($request);

        if ($scope === 'special') {
            $data = $request->validate([
                'name' => [
                    'required',
                    'string',
                    'max:255',
                    Rule::unique('courses', 'name')->where(fn ($q) => $q->where('admin_interface', 'special')),
                ],
                'description' => ['nullable', 'string'],
                'status' => ['nullable', 'in:active,inactive'],
            ]);
            $data['admin_interface'] = 'special';
            $data['track_id'] = null;
        } else {
            $data = $request->validate([
                'name' => [
                    'required',
                    'string',
                    'max:255',
                    Rule::unique('courses', 'name')->where(
                        fn ($q) => $q->where('admin_interface', $scope)->where('track_id', (int) $request->input('track_id'))
                    ),
                ],
                'track_id' => [
                    'required',
                    'integer',
                    Rule::exists('tracks', 'id')->where(fn ($q) => $q->where('admin_interface', $scope)),
                ],
                'description' => ['nullable', 'string'],
                'status' => ['nullable', 'in:active,inactive'],
            ]);
            $data['admin_interface'] = $scope;
        }

        $course = Course::query()->create($data);

        return response()->json([
            'success' => true,
            'data' => $course->fresh()->load('track:id,name'),
        ], 201);
    }

    public function update(Request $request, Course $course)
    {
        $this->assertCourseInScope($request, $course);
        $scope = $this->lmsAdminScope($request);

        if ($scope === 'special') {
            $data = $request->validate([
                'name' => [
                    'sometimes',
                    'string',
                    'max:255',
                    Rule::unique('courses', 'name')
                        ->where(fn ($q) => $q->where('admin_interface', 'special'))
                        ->ignore($course->id),
                ],
                'description' => ['nullable', 'string'],
                'status' => ['sometimes', 'in:active,inactive'],
            ]);
            $data['track_id'] = null;
        } else {
            $data = $request->validate([
                'name' => [
                    'sometimes',
                    'string',
                    'max:255',
                    Rule::unique('courses', 'name')->where(
                        fn ($q) => $q->where('admin_interface', $scope)->where(
                            'track_id',
                            (int) ($request->input('track_id') ?? $course->track_id)
                        )
                    )->ignore($course->id),
                ],
                'track_id' => [
                    'sometimes',
                    'required',
                    'integer',
                    Rule::exists('tracks', 'id')->where(fn ($q) => $q->where('admin_interface', $scope)),
                ],
                'description' => ['nullable', 'string'],
                'status' => ['sometimes', 'in:active,inactive'],
            ]);
            if (array_key_exists('track_id', $data) && isset($data['track_id'])) {
                $newTid = (int) $data['track_id'];
                if ($course->track_id === null || $newTid !== (int) $course->track_id) {
                    $this->assertNoLmsChildrenBlockCourseTrackChange($course, $newTid);
                }
            }
        }

        $course->update($data);

        return response()->json([
            'success' => true,
            'data' => $course->fresh()->load('track:id,name'),
        ]);
    }

    public function destroy(Request $request, Course $course)
    {
        $this->assertCourseInScope($request, $course);
        $course->delete();

        return response()->json(['success' => true]);
    }
}
