<?php

/*
| Entire system super-admin account is defined in .env only (no defaults here).
| See .env.example for SYSTEM_ADMIN_* keys. Used by SystemAdminService::ensureExists().
*/
return [
    'name' => env('SYSTEM_ADMIN_NAME'),
    'username' => env('SYSTEM_ADMIN_USERNAME'),
    'email' => env('SYSTEM_ADMIN_EMAIL'),
    'password' => env('SYSTEM_ADMIN_PASSWORD'),
];

