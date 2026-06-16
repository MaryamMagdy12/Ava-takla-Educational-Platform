<?php

return [

    /*
    |--------------------------------------------------------------------------
    | External lecture redirect hosts
    |--------------------------------------------------------------------------
    |
    | Comma-separated allowlist used for `external_stream` / `external_file`
    | lectures. Leave empty to allow any host (still scheme-validated).
    |
    */
    'lecture_external_allowed_hosts' => array_values(array_filter(array_map(
        static fn (string $v): string => mb_strtolower(trim($v)),
        explode(',', (string) env('LECTURE_EXTERNAL_ALLOWED_HOSTS', ''))
    ))),

    /*
    |--------------------------------------------------------------------------
    | Enforce HTTPS redirects for external lecture links
    |--------------------------------------------------------------------------
    |
    | Set to false only in local development when testing plain HTTP sources.
    |
    */
    'lecture_external_https_only' => (bool) env('LECTURE_EXTERNAL_HTTPS_ONLY', true),
];
