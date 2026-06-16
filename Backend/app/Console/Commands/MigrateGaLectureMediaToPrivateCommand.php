<?php

namespace App\Console\Commands;

use App\Models\GaLecture;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrateGaLectureMediaToPrivateCommand extends Command
{
    protected $signature = 'ga:migrate-lecture-media-to-private {--dry-run : List files that would be moved without changing storage}';

    protected $description = 'Move GA lecture media files from public/local disks to the private disk';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $moved = 0;
        $skipped = 0;
        $missing = 0;

        GaLecture::query()
            ->whereNotNull('video_file_path')
            ->where('video_file_path', '!=', '')
            ->orderBy('id')
            ->each(function (GaLecture $lecture) use ($dryRun, &$moved, &$skipped, &$missing) {
                $path = (string) $lecture->video_file_path;

                if (Storage::disk('private')->exists($path)) {
                    $skipped++;
                    $this->line("skip #{$lecture->id} already on private: {$path}");

                    return;
                }

                $sourceDisk = null;
                foreach (['public', 'local'] as $diskName) {
                    if (Storage::disk($diskName)->exists($path)) {
                        $sourceDisk = $diskName;
                        break;
                    }
                }

                if ($sourceDisk === null) {
                    $missing++;
                    $this->warn("missing #{$lecture->id}: {$path}");

                    return;
                }

                if ($dryRun) {
                    $this->info("would move #{$lecture->id} from {$sourceDisk} to private: {$path}");
                    $moved++;

                    return;
                }

                $stream = Storage::disk($sourceDisk)->readStream($path);
                if ($stream === false) {
                    $this->error("failed to read #{$lecture->id} from {$sourceDisk}: {$path}");
                    $missing++;

                    return;
                }

                Storage::disk('private')->writeStream($path, $stream);
                if (is_resource($stream)) {
                    fclose($stream);
                }

                Storage::disk($sourceDisk)->delete($path);
                $moved++;
                $this->info("moved #{$lecture->id} from {$sourceDisk} to private: {$path}");
            });

        $this->newLine();
        $this->info(($dryRun ? 'Would move' : 'Moved').": {$moved}, skipped: {$skipped}, missing: {$missing}");

        return self::SUCCESS;
    }
}
