<?php

namespace App\Http\Controllers\Api\Special;

use App\Http\Controllers\Controller;
use App\Models\SpecialLearner;
use App\Support\FieldValidation;
use App\Support\SecureUploadRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SpecialProfileController extends Controller
{
    public function show(Request $request)
    {
        /** @var SpecialLearner $user */
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => $user,
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'full_name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', ...FieldValidation::phone11StartsWithZero()],
            'address' => ['sometimes', 'nullable', ...FieldValidation::realisticAddress(2000)],
            'age' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:150'],
            'birth_date' => ['sometimes', 'nullable', 'date', 'before_or_equal:today'],
            'profile_picture' => ['sometimes', 'nullable', 'file', SecureUploadRules::imageRule()],
        ]);

        /** @var SpecialLearner $user */
        $user = $request->user();

        if ($request->hasFile('profile_picture')) {
            SecureUploadRules::rejectDangerousUpload($request->file('profile_picture'));
            $this->storeUploadedProfilePicture($user, $request->file('profile_picture'));
            unset($data['profile_picture']);
        }

        $user->fill($data);
        $user->save();

        return response()->json([
            'success' => true,
            'data' => $user->fresh(),
        ]);
    }

    /**
     * Remove prior on-disk variants for this learner id, then save the new image.
     * (Harmless no-ops if the previous picture was a remote URL only.)
     */
    private function storeUploadedProfilePicture(SpecialLearner $user, \Illuminate\Http\UploadedFile $file): void
    {
        foreach (['jpg', 'jpeg', 'png', 'gif', 'webp'] as $ext) {
            Storage::disk('public')->delete('special-learners/'.$user->id.'.'.$ext);
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        if (! in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true)) {
            $ext = 'jpg';
        }

        $basename = $user->id.'.'.$ext;
        $stored = $file->storeAs('special-learners', $basename, 'public');
        $user->profile_picture = $stored;
    }
}
