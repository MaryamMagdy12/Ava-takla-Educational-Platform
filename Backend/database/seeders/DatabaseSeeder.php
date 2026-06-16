<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\Level;
use App\Models\Track;
use App\Services\SystemAdminService;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $trackA = Track::query()->firstOrCreate(['name' => 'Primary A Track'], ['description' => 'Primary A path']);
        $trackB = Track::query()->firstOrCreate(['name' => 'Primary B Track'], ['description' => 'Primary B path']);
        $trackPS = Track::query()->firstOrCreate(['name' => 'Preparatory/Secondary Track'], ['description' => 'Shared path']);

        Level::query()->firstOrCreate(
            ['name' => 'Primary A'],
            ['track_id' => $trackA->id, 'code_prefix' => '5678', 'permanent_password_prefix' => 'Pa@']
        );
        Level::query()->firstOrCreate(
            ['name' => 'Primary B'],
            ['track_id' => $trackB->id, 'code_prefix' => '8796', 'permanent_password_prefix' => 'Pb$']
        );
        Level::query()->firstOrCreate(
            ['name' => 'Preparatory/Secondary'],
            ['track_id' => $trackPS->id, 'code_prefix' => '3456', 'permanent_password_prefix' => 'PrSe&']
        );

        Course::query()->firstOrCreate(['name' => 'Agpeya']);
        Course::query()->firstOrCreate(['name' => 'Liturgy']);
        Course::query()->firstOrCreate(['name' => 'Coptic language']);

        app(SystemAdminService::class)->ensureExists();
    }
}
