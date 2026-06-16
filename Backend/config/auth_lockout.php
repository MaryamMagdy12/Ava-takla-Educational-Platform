<?php

return [
    /*
    | Persistent lockout after repeated failed logins (per account scope + identifier + IP).
    */
    'enabled' => env('AUTH_LOCKOUT_ENABLED', true),

    /** Failed attempts allowed before lockout. */
    'max_attempts' => (int) env('AUTH_LOCKOUT_MAX_ATTEMPTS', 5),

    /** Minutes to block sign-in after max_attempts is reached. */
    'lockout_minutes' => (int) env('AUTH_LOCKOUT_MINUTES', 15),

    /** Minutes before failed-attempt counter resets when below max_attempts. */
    'decay_minutes' => (int) env('AUTH_LOCKOUT_DECAY_MINUTES', 15),
];
