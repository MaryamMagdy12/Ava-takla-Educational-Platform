<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\ResolvesLmsAdminScope;
use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Support\SecureUploadRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BookController extends Controller
{
    use ResolvesLmsAdminScope;

    private function documentMaxKb(): int
    {
        return max(1, (int) config('upload_limits.max_document_upload_mb', 50)) * 1024;
    }

    public function index(Request $request)
    {
        $scope = $this->lmsAdminScope($request);

        return response()->json([
            'success' => true,
            'data' => Book::query()
                ->whereHas('course', fn ($q) => $q->where('admin_interface', $scope))
                ->orderByDesc('id')
                ->paginate(20),
        ]);
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
            'status' => ['nullable', 'in:active,inactive'],
            'file' => [
                'required',
                'file',
                SecureUploadRules::fileRule(
                    ['pdf', 'docx', 'pptx'],
                    ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
                    $this->documentMaxKb(),
                ),
            ],
        ]);
        $trackId = isset($data['track_id']) && $data['track_id'] !== null ? (int) $data['track_id'] : null;
        $this->assertCourseAndTrackInScope($request, (int) $data['course_id'], $trackId);
        $this->assertLmsContentTrackMatchesCourse($request, (int) $data['course_id'], $trackId);
        SecureUploadRules::rejectDangerousUpload($request->file('file'));
        $path = $request->file('file')->store('books', 'private');
        $book = Book::query()->create([...$data, 'file_path' => $path, 'file_type' => $request->file('file')->getClientMimeType()]);

        return response()->json(['success' => true, 'data' => $book], 201);
    }

    public function update(Request $request, Book $book)
    {
        $this->assertBookInScope($request, $book);
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
            'file' => [
                'sometimes',
                'file',
                SecureUploadRules::fileRule(
                    ['pdf', 'docx', 'pptx'],
                    ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
                    $this->documentMaxKb(),
                ),
            ],
        ]);
        if (isset($data['course_id']) || array_key_exists('track_id', $data)) {
            $newCourseId = (int) ($data['course_id'] ?? $book->course_id);
            $newTrackId = array_key_exists('track_id', $data) ? $data['track_id'] : $book->track_id;
            $newTrackId = $newTrackId === null ? null : (int) $newTrackId;
            $this->assertCourseAndTrackInScope($request, $newCourseId, $newTrackId);
            $this->assertLmsContentTrackMatchesCourse($request, $newCourseId, $newTrackId);
        }
        if ($request->hasFile('file')) {
            SecureUploadRules::rejectDangerousUpload($request->file('file'));
            $data['file_path'] = $request->file('file')->store('books', 'private');
            $data['file_type'] = $request->file('file')->getClientMimeType();
        }
        $book->update($data);

        return response()->json(['success' => true, 'data' => $book->fresh()]);
    }

    public function destroy(Request $request, Book $book)
    {
        $this->assertBookInScope($request, $book);
        $book->forceDelete();

        return response()->json(['success' => true]);
    }

    public function assignToStudent(Request $request, Book $book)
    {
        $this->assertBookInScope($request, $book);
        $data = $request->validate(['student_id' => ['required', 'integer', 'exists:students,id']]);
        DB::table('student_book_access')->updateOrInsert($data + ['book_id' => $book->id], ['updated_at' => now(), 'created_at' => now()]);

        return response()->json(['success' => true]);
    }

    public function unassignFromStudent(Request $request, Book $book)
    {
        $this->assertBookInScope($request, $book);
        $data = $request->validate(['student_id' => ['required', 'integer', 'exists:students,id']]);
        DB::table('student_book_access')->where($data + ['book_id' => $book->id])->delete();

        return response()->json(['success' => true]);
    }
}
