<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Email parents when attendance is saved
    |--------------------------------------------------------------------------
    |
    | When true, each unique parent_email on the roster receives one email
    | summarizing that day's attendance for their children in that session.
    |
    */
    'notify_parents' => filter_var(env('ATTENDANCE_NOTIFY_PARENTS', true), FILTER_VALIDATE_BOOLEAN),

];
