@echo off
REM `php artisan serve` uses App\Console\Commands\ServeCommand — injects upload limits into the child `php -S` process.
cd /d "%~dp0"
php artisan serve --host=127.0.0.1 --port=8000
