<?php

return [

    'max_document_upload_mb' => max(1, (int) env('MAX_DOCUMENT_UPLOAD_MB', 50)),

    'max_audio_upload_mb' => max(1, (int) env('MAX_AUDIO_UPLOAD_MB', 200)),

    'max_video_upload_mb' => max(1, (int) env('MAX_VIDEO_UPLOAD_MB', 1024)),

];
