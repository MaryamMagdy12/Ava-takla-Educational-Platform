<?php

namespace App\Providers;

use App\Console\Commands\ServeCommand as AppServeCommand;
use App\Models\Course;
use App\Models\Book;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\GaCompetition;
use App\Models\GaCompetitionAttempt;
use App\Models\GaFamily;
use App\Models\GaLecture;
use App\Models\Lecture;
use App\Models\Student;
use App\Models\StudentQuestionnaire;
use App\Models\StudentQuestionnaireResponse;
use App\Support\AdminDashboardCache;
use App\Support\PublicCatalogCache;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Console\Application as ArtisanConsoleApplication;
use Illuminate\Foundation\Console\ServeCommand as FrameworkServeCommand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        /**
         * `ArtisanServiceProvider` is deferred: it registers after `boot()` and overwrites any
         * `ServeCommand` binding from `register()`. Re-bind when the console application boots
         * (after deferred providers), so `php artisan serve` injects `-d upload_max_filesize` /
         * `post_max_size` into the child `php -S` process.
         */
        $app = $this->app;

        ArtisanConsoleApplication::starting(function () use ($app) {
            $app->singleton(FrameworkServeCommand::class, function () {
                return new AppServeCommand;
            });
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->registerDashboardCacheInvalidation();
        $this->registerRateLimiters();
    }

    private function registerDashboardCacheInvalidation(): void
    {
        $forgetStudent = static fn () => AdminDashboardCache::forgetStudent();
        $forgetGa = static fn () => AdminDashboardCache::forgetGa();

        foreach ([Student::class] as $model) {
            $model::saved($forgetStudent);
            $model::deleted($forgetStudent);
        }

        foreach ([Exam::class, ExamAttempt::class, Book::class, Lecture::class] as $model) {
            $model::saved($forgetStudent);
            $model::deleted($forgetStudent);
        }

        foreach ([StudentQuestionnaire::class, StudentQuestionnaireResponse::class] as $model) {
            $model::saved($forgetStudent);
            $model::deleted($forgetStudent);
        }

        foreach ([GaFamily::class, GaCompetition::class, GaCompetitionAttempt::class] as $model) {
            $model::saved($forgetGa);
            $model::deleted($forgetGa);
        }

        $forgetCatalog = static fn () => PublicCatalogCache::forgetAll();
        foreach ([Course::class, Book::class, Lecture::class, GaLecture::class] as $model) {
            $model::saved($forgetCatalog);
            $model::deleted($forgetCatalog);
        }
    }

    private function registerRateLimiters(): void
    {
        RateLimiter::for('auth-login', function (Request $request) {
            $login = mb_strtolower(trim((string) (
                $request->input('login')
                ?? $request->input('student_unique_id')
                ?? $request->input('family_login_id')
                ?? $request->input('email')
                ?? ''
            )));

            return [
                Limit::perMinute(5)->by('ip:'.$request->ip()),
                Limit::perMinute(10)->by('account:'.$login.'|ip:'.$request->ip()),
            ];
        });

        RateLimiter::for('api-authenticated', function (Request $request) {
            $userKey = (string) ($request->user()?->getAuthIdentifier() ?? 'guest');

            return Limit::perMinute(120)->by('user:'.$userKey.'|ip:'.$request->ip());
        });

        RateLimiter::for('exam-submit', function (Request $request) {
            $userKey = (string) ($request->user()?->getAuthIdentifier() ?? 'guest');

            return Limit::perMinute(10)->by($userKey.'|'.$request->ip());
        });

        RateLimiter::for('student-otp', function (Request $request) {
            $id = (string) $request->input('student_unique_id', '');

            return Limit::perHour(5)->by($id.'|'.$request->ip());
        });

        RateLimiter::for('student-otp-verify', function (Request $request) {
            $id = (string) $request->input('student_unique_id', '');

            return [
                Limit::perMinute(10)->by('ip:'.$request->ip()),
                Limit::perMinute(6)->by('student:'.$id),
            ];
        });

        RateLimiter::for('special-email-verify', function (Request $request) {
            $email = (string) $request->input('email', '');

            return Limit::perHour(8)->by(mb_strtolower($email).'|'.$request->ip());
        });
    }
}
