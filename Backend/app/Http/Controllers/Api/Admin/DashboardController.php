<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\AuditLog;
use App\Models\Book;
use App\Models\Course;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\GaCompetition;
use App\Models\GaCompetitionAttempt;
use App\Models\GaFamily;
use App\Models\Lecture;
use App\Models\SpecialLearner;
use App\Models\Student;
use App\Models\StudentQuestionnaire;
use App\Models\StudentQuestionnaireResponse;
use App\Support\AdminDashboardCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $this->studentDashboardData(),
        ]);
    }

    public function studentDashboard(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $this->studentDashboardData(),
        ]);
    }

    public function generalAssemblyDashboard(Request $request)
    {
        if (! Schema::hasTable('ga_families')) {
            return response()->json([
                'success' => true,
                'data' => $this->emptyGaDashboard(),
            ]);
        }

        $data = Cache::remember(AdminDashboardCache::GA_KEY, 60, function () {
            return [
                'total_families' => GaFamily::query()->count(),
                'total_competitions' => GaCompetition::query()->count(),
                'total_competition_attempts' => GaCompetitionAttempt::query()->count(),
                'published_competitions' => GaCompetition::query()->where('status', 'published')->count(),
            ];
        });

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function specialDashboard(Request $request)
    {
        $totalLearners = Schema::hasTable('special_learners')
            ? SpecialLearner::query()->count()
            : 0;
        $totalCourses = Schema::hasTable('courses')
            ? Course::query()->where('admin_interface', 'special')->count()
            : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'message' => 'إدارة المتعلّمين الخاصّين ودورات واجهة التعلّم الخاص (مواد، مكتبة، امتحانات، استبيانات).',
                'total_learners' => $totalLearners,
                'total_courses' => $totalCourses,
            ],
        ]);
    }

    public function interfaces(Request $request)
    {
        /** @var Admin $admin */
        $admin = $request->user();
        $labels = [
            Admin::ROLE_STUDENT => 'Student platform',
            Admin::ROLE_GENERAL_ASSEMBLY => 'General assembly',
            Admin::ROLE_SPECIAL => 'Special courses',
        ];

        $items = [];
        $paths = [
            Admin::ROLE_STUDENT => '/admin/dashboard/student',
            Admin::ROLE_GENERAL_ASSEMBLY => '/admin/general-assembly/dashboard',
            Admin::ROLE_SPECIAL => '/admin/dashboard/special',
        ];
        foreach ($admin->allowedInterfaces() as $key) {
            $items[] = [
                'key' => $key,
                'title' => $labels[$key] ?? $key,
                'dashboard_path' => $paths[$key] ?? '/admin/dashboard/student',
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'interfaces' => $items,
                'default_interface' => $admin->defaultInterfaceSlug(),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function studentDashboardData(): array
    {
        return Cache::remember(AdminDashboardCache::STUDENT_KEY, 60, function () {
            $studentCourse = fn ($q) => $q->where('admin_interface', 'student');

            return [
                'total_students' => Student::query()->count(),
                'total_exams' => Exam::query()->whereHas('course', $studentCourse)->count(),
                'total_attempts' => ExamAttempt::query()->whereHas('exam.course', $studentCourse)->count(),
                'average_score' => round((float) ExamAttempt::query()->whereHas('exam.course', $studentCourse)->avg('percentage'), 2),
                'total_books' => Book::query()->whereHas('course', $studentCourse)->count(),
                'total_lectures' => Lecture::query()->whereHas('course', $studentCourse)->count(),
                'total_questionnaires' => Schema::hasTable('student_questionnaires')
                    ? StudentQuestionnaire::query()->where('admin_interface', 'student')->count()
                    : 0,
                'questionnaire_responses' => Schema::hasTable('student_questionnaire_responses')
                    ? StudentQuestionnaireResponse::query()
                        ->whereHas('questionnaire', fn ($q) => $q->where('admin_interface', 'student'))
                        ->where('status', 'submitted')
                        ->count()
                    : 0,
                'upcoming_exams' => $this->upcomingStudentInterfaceExams(),
                'recent_activity' => $this->recentStudentInterfaceActivity(),
            ];
        });
    }

    /**
     * Recent audit events relevant to the student admin dashboard (Arabic copy for UI).
     *
     * @return list<array{id:int,text:string,created_at:?string}>
     */
    private function recentStudentInterfaceActivity(): array
    {
        if (! Schema::hasTable('audit_logs')) {
            return [];
        }

        $actions = [
            'student.created',
            'student.updated',
            'student.password_reset',
            'admin.created',
            'admin.updated',
            'exam.started',
            'exam.submitted',
            'questionnaire.submitted',
        ];

        $logs = AuditLog::query()
            ->whereIn('action', $actions)
            ->orderByDesc('created_at')
            ->limit(45)
            ->get(['id', 'action', 'subject_type', 'subject_id', 'created_at']);

        if ($logs->isEmpty()) {
            return [];
        }

        $studentSubjectIds = $logs->where('subject_type', Student::class)->pluck('subject_id')->filter()->unique();
        $adminSubjectIds = $logs->where('subject_type', Admin::class)->pluck('subject_id')->filter()->unique();
        $attemptIds = $logs->where('subject_type', ExamAttempt::class)->pluck('subject_id')->filter()->unique();
        $responseIds = $logs->where('subject_type', StudentQuestionnaireResponse::class)->pluck('subject_id')->filter()->unique();

        $students = $studentSubjectIds->isNotEmpty()
            ? Student::query()->whereIn('id', $studentSubjectIds)->get()->keyBy('id')
            : collect();
        $admins = $adminSubjectIds->isNotEmpty()
            ? Admin::query()->whereIn('id', $adminSubjectIds)->get()->keyBy('id')
            : collect();
        $attempts = $attemptIds->isNotEmpty()
            ? ExamAttempt::query()
                ->whereIn('id', $attemptIds)
                ->with([
                    'exam:id,title,admin_interface',
                    'student:id,full_name',
                    'specialLearner:id,full_name',
                ])
                ->get()
                ->keyBy('id')
            : collect();
        $responses = $responseIds->isNotEmpty()
            ? StudentQuestionnaireResponse::query()
                ->whereIn('id', $responseIds)
                ->with(['questionnaire:id,title,admin_interface', 'student:id,full_name'])
                ->get()
                ->keyBy('id')
            : collect();

        $out = [];
        foreach ($logs as $log) {
            $line = $this->mapAuditLogToStudentActivityLine($log, $students, $admins, $attempts, $responses);
            if ($line === null) {
                continue;
            }
            $out[] = [
                'id' => (int) $log->id,
                'text' => $line,
                'created_at' => $log->created_at?->toIso8601String(),
            ];
            if (count($out) >= 12) {
                break;
            }
        }

        return $out;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Student>  $students
     * @param  \Illuminate\Support\Collection<int, Admin>  $admins
     * @param  \Illuminate\Support\Collection<int, ExamAttempt>  $attempts
     * @param  \Illuminate\Support\Collection<int, StudentQuestionnaireResponse>  $responses
     */
    private function mapAuditLogToStudentActivityLine(
        AuditLog $log,
        $students,
        $admins,
        $attempts,
        $responses,
    ): ?string {
        return match ($log->action) {
            'student.created', 'student.updated', 'student.password_reset' => $this->activityLineForStudentSubject(
                $log,
                $students,
            ),
            'admin.created', 'admin.updated' => $this->activityLineForAdminSubject($log, $admins),
            'exam.started', 'exam.submitted' => $this->activityLineForExamAttemptSubject($log, $attempts),
            'questionnaire.submitted' => $this->activityLineForQuestionnaireResponseSubject($log, $responses),
            default => null,
        };
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Student>  $students
     */
    private function activityLineForStudentSubject(AuditLog $log, $students): ?string
    {
        if ($log->subject_type !== Student::class || ! $log->subject_id) {
            return null;
        }
        $s = $students->get((int) $log->subject_id);
        if (! $s) {
            return null;
        }
        $n = (string) ($s->full_name ?? 'طالب');

        return match ($log->action) {
            'student.created' => "تم تسجيل طالب جديد: {$n}.",
            'student.updated' => "تم تحديث بيانات الطالب: {$n}.",
            'student.password_reset' => "تمت إعادة تعيين كلمة مرور الطالب: {$n}.",
            default => null,
        };
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Admin>  $admins
     */
    private function activityLineForAdminSubject(AuditLog $log, $admins): ?string
    {
        if ($log->subject_type !== Admin::class || ! $log->subject_id) {
            return null;
        }
        $a = $admins->get((int) $log->subject_id);
        if (! $a) {
            return null;
        }
        $n = (string) ($a->name ?? $a->username ?? 'مشرف');

        return match ($log->action) {
            'admin.created' => "تمت إضافة مشرف: {$n}.",
            'admin.updated' => "تم تحديث بيانات المشرف: {$n}.",
            default => null,
        };
    }

    /**
     * @param  \Illuminate\Support\Collection<int, ExamAttempt>  $attempts
     */
    private function activityLineForExamAttemptSubject(AuditLog $log, $attempts): ?string
    {
        if ($log->subject_type !== ExamAttempt::class || ! $log->subject_id) {
            return null;
        }
        $attempt = $attempts->get((int) $log->subject_id);
        if (! $attempt || ! $attempt->exam || ($attempt->exam->admin_interface ?? 'student') !== 'student') {
            return null;
        }
        $examTitle = (string) ($attempt->exam->title ?? 'امتحان');
        $who = (string) (
            $attempt->student?->full_name
            ?? $attempt->specialLearner?->full_name
            ?? 'طالب'
        );

        return match ($log->action) {
            'exam.started' => "بدأ {$who} امتحان «{$examTitle}».",
            'exam.submitted' => "سلّم {$who} امتحان «{$examTitle}».",
            default => null,
        };
    }

    /**
     * @param  \Illuminate\Support\Collection<int, StudentQuestionnaireResponse>  $responses
     */
    private function activityLineForQuestionnaireResponseSubject(AuditLog $log, $responses): ?string
    {
        if ($log->subject_type !== StudentQuestionnaireResponse::class || ! $log->subject_id) {
            return null;
        }
        $r = $responses->get((int) $log->subject_id);
        if (! $r || ! $r->questionnaire || ($r->questionnaire->admin_interface ?? 'student') !== 'student') {
            return null;
        }
        $title = (string) ($r->questionnaire->title ?? 'استبيان');
        $who = $r->student?->full_name;

        return $who
            ? "قدّم {$who} استبيان «{$title}»."
            : "تم تقديم استبيان «{$title}».";
    }

    /**
     * Published student-interface exams whose window has not ended, soonest start first.
     *
     * @return list<array{id:int,title:string,stage:string,registered:int,available_from:?string,available_to:?string}>
     */
    private function upcomingStudentInterfaceExams(): array
    {
        $now = now();

        $exams = Exam::query()
            ->select(['exams.id', 'exams.title', 'exams.available_from', 'exams.available_to'])
            ->where('exams.status', 'published')
            ->where('exams.admin_interface', 'student')
            ->where('exams.available_to', '>=', $now)
            ->whereHas('course', fn ($q) => $q->where('admin_interface', 'student'))
            ->with([
                'course:id,title',
                'track:id,name',
            ])
            ->orderBy('exams.available_from')
            ->limit(5)
            ->get();

        if ($exams->isEmpty()) {
            return [];
        }

        $counts = DB::table('student_exam_access')
            ->whereIn('exam_id', $exams->pluck('id'))
            ->selectRaw('exam_id, count(*) as c')
            ->groupBy('exam_id')
            ->pluck('c', 'exam_id');

        return $exams->map(function (Exam $exam) use ($counts) {
            $stage = $exam->track?->name
                ?? $exam->course?->title
                ?? '—';

            return [
                'id' => (int) $exam->id,
                'title' => (string) $exam->title,
                'stage' => (string) $stage,
                'registered' => (int) ($counts[$exam->id] ?? 0),
                'available_from' => $exam->available_from?->toIso8601String(),
                'available_to' => $exam->available_to?->toIso8601String(),
            ];
        })->values()->all();
    }

    /**
     * @return array<string, int>
     */
    private function emptyGaDashboard(): array
    {
        return [
            'total_families' => 0,
            'total_competitions' => 0,
            'total_competition_attempts' => 0,
            'published_competitions' => 0,
        ];
    }
}
