<?php

return [
    /*
    | Permanent password: {prefix}{first_3_chars_of_first_word}{student_unique_id}
    | Prefix is read from levels.permanent_password_prefix when set; otherwise this map (by level name).
    */
    'permanent_password_prefixes_by_level_name' => [
        'ابتدائي أ' => 'Pa@',
        'ابتدائي ب' => 'Pb$',
        'اعدادي/ثانوي' => 'PrSe&',
    ],

  /*
  | When false, creation/reset responses omit plaintext permanent_password (temporary still returned once).
  */
    'password_export_enabled' => env('STUDENT_PASSWORD_EXPORT_ENABLED', true),
];
