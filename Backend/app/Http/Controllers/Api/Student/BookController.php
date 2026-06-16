<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\Student;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Response;

class BookController extends Controller
{
    public function myBooks(Request $request)
    {
        $student = $request->user();
        $books = Book::query()
            ->with('course:id,name')
            ->whereHas('course', fn ($q) => $q->where('admin_interface', 'student'))
            ->where('status', 'active')
            ->where(function ($q) use ($student) {
                $q->where('track_id', $student->track_id)
                    ->orWhereIn('id', function ($sub) use ($student) {
                        $sub->select('book_id')->from('student_book_access')->where('student_id', $student->id);
                    });
            })->paginate(20);

        $books->getCollection()->transform(fn (Book $b) => $this->studentBookPayload($b));

        return response()->json(['success' => true, 'data' => $books]);
    }

    public function view(Request $request, Book $book)
    {
        /** @var Student $student */
        $student = $request->user();
        if (! $this->studentCanAccessBook($student, $book)) {
            abort(403);
        }

        if (! $book->file_path) {
            abort(404);
        }

        foreach (['private', 'local', 'public'] as $diskName) {
            $disk = Storage::disk($diskName);
            if ($disk instanceof FilesystemAdapter && $disk->exists($book->file_path)) {
                return $disk->response($book->file_path);
            }
        }

        abort(404);
    }

    private function studentCanAccessBook(Student $student, Book $book): bool
    {
        return Book::query()
            ->whereKey($book->id)
            ->where('status', 'active')
            ->whereHas('course', fn ($q) => $q->where('admin_interface', 'student'))
            ->where(function ($q) use ($student) {
                $q->where('track_id', $student->track_id)
                    ->orWhereIn('id', function ($sub) use ($student) {
                        $sub->select('book_id')->from('student_book_access')->where('student_id', $student->id);
                    });
            })
            ->exists();
    }

    /**
     * @return array<string, mixed>
     */
    private function studentBookPayload(Book $b): array
    {
        $base = $b->only([
            'id',
            'title',
            'course_id',
            'track_id',
            'file_type',
            'status',
            'file_size_mb',
            'created_at',
            'updated_at',
        ]);
        $base['course'] = $b->relationLoaded('course') ? $b->getRelation('course') : null;
        $base['access_url'] = $b->file_path ? $b->studentAccessPath() : null;

        return $base;
    }
}
