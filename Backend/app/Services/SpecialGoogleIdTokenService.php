<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class SpecialGoogleIdTokenService
{
    /**
     * @return array{sub: string, email: string, email_verified: bool, aud: string, picture?: string}
     */
    public function verifyAndDecode(string $idToken): array
    {
        $expectedAud = config('services.google.client_id');
        if (! is_string($expectedAud) || $expectedAud === '') {
            abort(503, 'Google Sign-In is not configured on the server.');
        }

        $response = Http::timeout(15)->get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        if (! $response->ok()) {
            abort(422, 'Invalid Google credential.');
        }

        $data = $response->json();
        $aud = (string) ($data['aud'] ?? '');
        if ($aud !== $expectedAud) {
            abort(422, 'Invalid Google credential audience.');
        }

        $email = (string) ($data['email'] ?? '');
        $sub = (string) ($data['sub'] ?? '');
        if ($email === '' || $sub === '') {
            abort(422, 'Google did not return a valid email.');
        }

        $emailVerified = filter_var($data['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if (! $emailVerified) {
            abort(422, 'Your Google account email is not verified. Verify it with Google first.');
        }

        $picture = (string) ($data['picture'] ?? '');

        return [
            'sub' => $sub,
            'email' => mb_strtolower($email),
            'email_verified' => true,
            'aud' => $aud,
            'picture' => $picture,
        ];
    }
}
