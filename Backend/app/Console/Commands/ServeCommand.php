<?php

namespace App\Console\Commands;

use Illuminate\Foundation\Console\ServeCommand as BaseServeCommand;

/**
 * Laravel's default `serve` spawns `php -S` without passing CLI `-d` flags from the parent.
 * Those limits must be on the built-in server process or large uploads return HTTP 413.
 */
class ServeCommand extends BaseServeCommand
{
    protected function serverCommand(): array
    {
        $cmd = parent::serverCommand();

        array_splice($cmd, 1, 0, [
            '-d', 'upload_max_filesize=2048M',
            '-d', 'post_max_size=2048M',
            '-d', 'memory_limit=1024M',
            '-d', 'max_execution_time=0',
            '-d', 'max_input_time=3600',
        ]);

        return $cmd;
    }
}
