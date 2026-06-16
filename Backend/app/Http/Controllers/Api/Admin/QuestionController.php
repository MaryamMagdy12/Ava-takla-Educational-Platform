<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\ResolvesLmsAdminScope;
use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Services\BulkQuestionImportService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class QuestionController extends Controller
{
    use ResolvesLmsAdminScope;

    public function __construct(private readonly BulkQuestionImportService $bulkQuestionImportService)
    {
    }

    public function index(Request $request)
    {
        $scope = $this->lmsAdminScope($request);
        $questions = Question::query()
            ->with('options')
            ->whereHas('course', fn ($q) => $q->where('admin_interface', $scope))
            ->when($request->filled('q'), fn ($q) => $q->where('question_text', 'like', '%'.$request->string('q').'%'))
            ->when($request->filled('course_id'), function ($q) use ($request, $scope) {
                $q->where('course_id', $request->integer('course_id'))
                    ->whereHas('course', fn ($cq) => $cq->where('admin_interface', $scope));
            })
            ->when($request->filled('track_id'), fn ($q) => $q->where('track_id', $request->integer('track_id')))
            ->when($request->filled('difficulty'), fn ($q) => $q->where('difficulty', $request->string('difficulty')))
            ->orderByDesc('id')
            ->paginate(min($request->integer('per_page', 20), 100));

        return ApiResponse::success($questions);
    }

    public function show(Request $request, Question $question)
    {
        $this->assertQuestionInScope($request, $question);

        return ApiResponse::success($question->load('options'));
    }

    public function store(Request $request)
    {
        $scope = $this->lmsAdminScope($request);
        $data = $request->validate([
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
            'question_text' => 'required|string',
            'question_type' => 'required|in:mcq,true_false',
            'difficulty' => 'required|in:easy,medium,hard',
            'feedback_correct' => 'nullable|string',
            'feedback_wrong' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
            'options' => 'required|array|min:2',
            'options.*.option_text' => 'required|string',
            'options.*.is_correct' => 'required|boolean',
        ]);
        $trackId = isset($data['track_id']) && $data['track_id'] !== null ? (int) $data['track_id'] : null;
        $this->assertCourseAndTrackInScope($request, (int) $data['course_id'], $trackId);
        $this->assertLmsContentTrackMatchesCourse($request, (int) $data['course_id'], $trackId);

        $question = DB::transaction(function () use ($data, $scope) {
            $opts = $data['options'];
            unset($data['options']);
            $data['admin_interface'] = $scope;
            $q = Question::query()->create($data);
            foreach ($opts as $option) {
                QuestionOption::query()->create(['question_id' => $q->id] + $option);
            }

            return $q->load('options');
        });

        return ApiResponse::success($question, 'Question created.', 201);
    }

    public function update(Request $request, Question $question)
    {
        $this->assertQuestionInScope($request, $question);
        $scope = $this->lmsAdminScope($request);
        $data = $request->validate([
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
            'question_text' => 'sometimes|string',
            'question_type' => 'sometimes|in:mcq,true_false',
            'difficulty' => 'sometimes|in:easy,medium,hard',
            'feedback_correct' => 'nullable|string',
            'feedback_wrong' => 'nullable|string',
            'status' => 'sometimes|in:active,inactive',
            'options' => 'sometimes|array|min:2',
            'options.*.option_text' => 'required_with:options|string',
            'options.*.is_correct' => 'required_with:options|boolean',
        ]);
        $newCourseId = (int) ($data['course_id'] ?? $question->course_id);
        $newTrackId = array_key_exists('track_id', $data) ? $data['track_id'] : $question->track_id;
        $newTrackId = $newTrackId === null ? null : (int) $newTrackId;
        if (isset($data['course_id']) || array_key_exists('track_id', $data)) {
            $this->assertCourseAndTrackInScope($request, $newCourseId, $newTrackId);
            $this->assertLmsContentTrackMatchesCourse($request, $newCourseId, $newTrackId);
        }

        DB::transaction(function () use ($question, $data, $scope) {
            if (isset($data['options'])) {
                $opts = $data['options'];
                unset($data['options']);
                $question->options()->delete();
                foreach ($opts as $option) {
                    QuestionOption::query()->create(['question_id' => $question->id] + $option);
                }
            }
            if (! empty($data)) {
                $data['admin_interface'] = $scope;
            }
            $question->update(collect($data)->except(['options'])->all());
        });

        return ApiResponse::success($question->fresh()->load('options'), 'Question updated.');
    }

    public function destroy(Request $request, Question $question)
    {
        $this->assertQuestionInScope($request, $question);
        DB::table('exam_questions')->where('question_id', $question->id)->delete();
        $question->forceDelete();

        return ApiResponse::success(null, 'Question deleted.');
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx', 'max:10240'],
        ]);
        $scope = $this->lmsAdminScope($request);
        $result = $this->bulkQuestionImportService->import($request->file('file'), $scope);

        return ApiResponse::success($result, 'Import finished.');
    }

    public function importForCourseTrack(Request $request)
    {
        $scope = $this->lmsAdminScope($request);
        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx', 'max:10240'],
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
            'difficulty' => ['nullable', 'in:easy,medium,hard'],
            'status' => ['nullable', 'in:active,inactive'],
        ]);
        $trackId = isset($data['track_id']) && $data['track_id'] !== null ? (int) $data['track_id'] : null;
        $this->assertCourseAndTrackInScope($request, (int) $data['course_id'], $trackId);
        $this->assertLmsContentTrackMatchesCourse($request, (int) $data['course_id'], $trackId);

        $result = $this->bulkQuestionImportService->importWithDefaults(
            $request->file('file'),
            [
                'course_id' => $data['course_id'],
                'track_id' => $trackId,
                'difficulty' => $data['difficulty'] ?? null,
                'status' => $data['status'] ?? null,
            ],
            $scope,
        );

        return ApiResponse::success($result, 'Import finished.');
    }

    public function storeOption(Request $request, Question $question)
    {
        $this->assertQuestionInScope($request, $question);
        $data = $request->validate([
            'option_text' => ['required', 'string'],
            'is_correct' => ['required', 'boolean'],
        ]);
        if ($data['is_correct']) {
            $question->options()->update(['is_correct' => false]);
        }
        $option = QuestionOption::query()->create(['question_id' => $question->id] + $data);

        return ApiResponse::success($option, 'Option added.', 201);
    }

    public function updateOption(Request $request, Question $question, QuestionOption $option)
    {
        $this->assertQuestionInScope($request, $question);
        abort_if($option->question_id !== $question->id, 404);
        $data = $request->validate([
            'option_text' => ['sometimes', 'string'],
            'is_correct' => ['sometimes', 'boolean'],
        ]);
        if (($data['is_correct'] ?? false) === true) {
            $question->options()->where('id', '!=', $option->id)->update(['is_correct' => false]);
        }
        $option->update($data);

        return ApiResponse::success($option->fresh(), 'Option updated.');
    }

    public function destroyOption(Request $request, Question $question, QuestionOption $option)
    {
        $this->assertQuestionInScope($request, $question);
        abort_if($option->question_id !== $question->id, 404);
        $option->delete();

        return ApiResponse::success(null, 'Option deleted.');
    }
}
