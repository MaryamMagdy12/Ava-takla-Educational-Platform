<?php

namespace App\Http\Controllers\Api\Family;

use App\Http\Controllers\Concerns\StreamsGaLectureMedia;
use App\Http\Controllers\Controller;
use App\Models\GaLecture;
use Illuminate\Http\Request;

class FamilyGaLectureController extends Controller
{
    use StreamsGaLectureMedia;

    public function view(Request $request, GaLecture $gaLecture)
    {
        if ($gaLecture->status !== 'published') {
            abort(404);
        }

        if ($request->user()->status !== 'active') {
            abort(403);
        }

        return $this->streamGaLectureMediaResponse($gaLecture);
    }
}
