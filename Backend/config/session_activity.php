<?php

return [

    /*
    |--------------------------------------------------------------------------
    | API session inactivity (Sanctum bearer)
    |--------------------------------------------------------------------------
    |
    | After this many minutes without an authenticated API request, the current
    | personal access token is revoked and the client receives HTTP 401.
    |
    */

    'inactivity_timeout_minutes' => (int) env('SESSION_INACTIVITY_TIMEOUT_MINUTES', 120),

    /*
    |--------------------------------------------------------------------------
    | Activity write throttle
    |--------------------------------------------------------------------------
    |
    | Persist `last_activity_at` at most once every N minutes to reduce DB write
    | amplification on frequently polled SPAs.
    |
    */
    'write_throttle_minutes' => (int) env('SESSION_ACTIVITY_WRITE_THROTTLE_MINUTES', 5),

];
