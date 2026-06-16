<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\ResolvesLmsAdminScope;
use App\Http\Controllers\Controller;
use App\Models\Level;
use App\Models\LevelAttendanceEntry;
use App\Models\LevelAttendanceSession;
use App\Models\Student;
use App\Services\AttendanceParentNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class LevelAttendanceController extends Controller
{
    use ResolvesLmsAdminScope;

    /**
     * Take-attendance board: students for a level on a date, with optional search and saved checkboxes.
     */
    public function board(Request $request, Level $level)
    {
        $this->assertLevelInScope($request, $level);
        $scope = $this->lmsAdminScope($request);

        $heldOn = $request->date('held_on')?->toDateString() ?? now()->toDateString();
        $needle = mb_strtolower(trim((string) $request->query('q', '')));

        $session = LevelAttendanceSession::query()
            ->where('admin_interface', $scope)
            ->where('level_id', $level->id)
            ->whereDate('held_on', $heldOn)
            ->first();

        $presentIds = $session
            ? $session->entries()->where('is_present', true)->pluck('student_id')->all()
            : [];

        $presentSet = array_fill_keys($presentIds, true);

        $students = $this->rosterQuery($level)
            ->when($needle !== '', function ($q) use ($needle) {
                $q->where(function ($w) use ($needle) {
                    $w->whereRaw('LOWER(full_name) LIKE ?', ['%'.$needle.'%'])
                        ->orWhereRaw('LOWER(student_unique_id) LIKE ?', ['%'.$needle.'%']);
                    if (ctype_digit($needle)) {
                        $w->orWhere('id', (int) $needle)
                            ->orWhere('serial_number', (int) $needle);
                    }
                });
            })
            ->orderBy('serial_number')
            ->orderBy('id')
            ->get(['id', 'full_name', 'student_unique_id', 'serial_number', 'level_id']);

        return response()->json([
            'success' => true,
            'data' => [
                'held_on' => $heldOn,
                'level' => $level->loadMissing('track:id,name'),
                'session' => $session ? $this->sessionPayload($session) : null,
                'students' => $students->map(fn (Student $s) => [
                    'id' => (int) $s->id,
                    'full_name' => (string) $s->full_name,
                    'student_unique_id' => (string) $s->student_unique_id,
                    'serial_number' => (int) $s->serial_number,
                    'is_present' => isset($presentSet[(int) $s->id]),
                ])->values()->all(),
            ],
        ]);
    }

    /**
     * Create or replace attendance for one level on one calendar day.
     *
     * @bodyParam present_student_ids int[] Students marked present; all other roster students are absent.
     */
    public function storeSession(Request $request, AttendanceParentNotifier $attendanceParentNotifier)
    {
        $scope = $this->lmsAdminScope($request);
        $data = $request->validate([
            'level_id' => [
                'required',
                'integer',
                Rule::exists('levels', 'id')->where(fn ($q) => $q->where('admin_interface', $scope)),
            ],
            'held_on' => ['required', 'date'],
            'present_student_ids' => ['nullable', 'array'],
            'present_student_ids.*' => ['integer', 'distinct'],
            'title' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $level = Level::query()->whereKey($data['level_id'])->firstOrFail();
        $this->assertLevelInScope($request, $level);

        $heldOn = $request->date('held_on')->toDateString();
        $presentIds = array_values(array_unique(array_map('intval', $data['present_student_ids'] ?? [])));

        DB::transaction(function () use ($request, $scope, $level, $heldOn, $presentIds, $data) {
            $this->upsertLevelAttendanceSession(
                $request,
                $scope,
                $level,
                $heldOn,
                $presentIds,
                $data['title'] ?? null,
                $data['notes'] ?? null,
            );
        });

        $session = LevelAttendanceSession::query()
            ->where('admin_interface', $scope)
            ->where('level_id', $level->id)
            ->whereDate('held_on', $heldOn)
            ->with(['entries' => fn ($q) => $q->with('student:id,full_name,student_unique_id,serial_number')])
            ->firstOrFail();

        $attendanceParentNotifier->notifyForSession($session);

        return response()->json([
            'success' => true,
            'message' => 'Attendance saved.',
            'data' => $this->sessionMatchPayload($session),
        ]);
    }

    /**
     * Create or replace attendance for many levels on the same calendar day (single transaction).
     *
     * @bodyParam levels array{level_id: int, present_student_ids?: int[]}[]
     */
    public function storeSessionsBulk(Request $request, AttendanceParentNotifier $attendanceParentNotifier)
    {
        $scope = $this->lmsAdminScope($request);
        $data = $request->validate([
            'held_on' => ['required', 'date'],
            'levels' => ['required', 'array', 'min:1'],
            'levels.*.level_id' => [
                'required',
                'integer',
                Rule::exists('levels', 'id')->where(fn ($q) => $q->where('admin_interface', $scope)),
            ],
            'levels.*.present_student_ids' => ['nullable', 'array'],
            'levels.*.present_student_ids.*' => ['integer'],
            'title' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $rows = $data['levels'];
        $levelIds = array_map(fn (array $r) => (int) $r['level_id'], $rows);
        if (count($levelIds) !== count(array_unique($levelIds))) {
            throw ValidationException::withMessages([
                'levels' => ['Duplicate level_id entries are not allowed.'],
            ]);
        }

        $heldOn = $request->date('held_on')->toDateString();
        $title = $data['title'] ?? null;
        $notes = $data['notes'] ?? null;

        DB::transaction(function () use ($request, $scope, $heldOn, $rows, $title, $notes) {
            foreach ($rows as $index => $row) {
                $level = Level::query()->whereKey((int) $row['level_id'])->firstOrFail();
                $this->assertLevelInScope($request, $level);
                $presentIds = array_values(array_unique(array_map('intval', $row['present_student_ids'] ?? [])));
                $this->upsertLevelAttendanceSession(
                    $request,
                    $scope,
                    $level,
                    $heldOn,
                    $presentIds,
                    $title,
                    $notes,
                    'levels.'.$index.'.present_student_ids',
                );
            }
        });

        $sessionsPayload = [];
        foreach ($rows as $row) {
            $session = LevelAttendanceSession::query()
                ->where('admin_interface', $scope)
                ->where('level_id', (int) $row['level_id'])
                ->whereDate('held_on', $heldOn)
                ->with(['entries' => fn ($q) => $q->with('student:id,full_name,student_unique_id,serial_number')])
                ->firstOrFail();
            $attendanceParentNotifier->notifyForSession($session);
            $sessionsPayload[] = $this->sessionMatchPayload($session);
        }

        return response()->json([
            'success' => true,
            'message' => 'Attendance saved for '.count($sessionsPayload).' level(s).',
            'data' => [
                'sessions' => $sessionsPayload,
                'saved_level_count' => count($sessionsPayload),
            ],
        ]);
    }

    /**
     * List recent sessions (filter by level and date range).
     */
    public function indexSessions(Request $request)
    {
        $scope = $this->lmsAdminScope($request);
        $data = $request->validate([
            'level_id' => ['nullable', 'integer', Rule::exists('levels', 'id')->where(fn ($q) => $q->where('admin_interface', $scope))],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $q = LevelAttendanceSession::query()
            ->where('admin_interface', $scope)
            ->with('level:id,name,track_id')
            ->withCount([
                'entries as present_count' => fn ($b) => $b->where('is_present', true),
                'entries as absent_count' => fn ($b) => $b->where('is_present', false),
            ])
            ->orderByDesc('held_on')
            ->orderByDesc('id');

        if (! empty($data['level_id'])) {
            $q->where('level_id', (int) $data['level_id']);
        }
        if (! empty($data['from'])) {
            $q->whereDate('held_on', '>=', $request->date('from')->toDateString());
        }
        if (! empty($data['to'])) {
            $q->whereDate('held_on', '<=', $request->date('to')->toDateString());
        }

        $perPage = min(max($request->integer('per_page', 30), 1), 120);
        $sessions = $q->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $sessions->through(fn (LevelAttendanceSession $s) => $this->sessionPayload($s)),
        ]);
    }

    /**
     * One session: attendees vs absences (for the reconciliation dashboard).
     */
    public function showSession(Request $request, LevelAttendanceSession $level_attendance_session)
    {
        $this->assertSessionInScope($request, $level_attendance_session);
        $level_attendance_session->load([
            'level.track:id,name',
            'entries.student:id,full_name,student_unique_id,serial_number,level_id',
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->sessionMatchPayload($level_attendance_session),
        ]);
    }

    /**
     * Points: 1 point per present session entry; grouped by level for UI tabs.
     */
    public function points(Request $request)
    {
        $scope = $this->lmsAdminScope($request);
        $data = $request->validate([
            'level_id' => ['nullable', 'integer', Rule::exists('levels', 'id')->where(fn ($q) => $q->where('admin_interface', $scope))],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = $request->filled('from') ? $request->date('from')->toDateString() : now()->subMonths(6)->toDateString();
        $to = $request->filled('to') ? $request->date('to')->toDateString() : now()->toDateString();

        $levels = Level::query()
            ->where('admin_interface', $scope)
            ->when(! empty($data['level_id']), fn ($q) => $q->whereKey((int) $data['level_id']))
            ->with('track:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'track_id', 'code_prefix']);

        $byLevel = [];
        foreach ($levels as $level) {
            $students = $this->rosterQuery($level)
                ->orderBy('serial_number')
                ->orderBy('id')
                ->get(['id', 'full_name', 'student_unique_id', 'serial_number']);

            $stats = LevelAttendanceEntry::query()
                ->selectRaw('level_attendance_entries.student_id,
                    SUM(CASE WHEN level_attendance_entries.is_present = 1 THEN 1 ELSE 0 END) as attendance_count,
                    SUM(CASE WHEN level_attendance_entries.is_present = 0 THEN 1 ELSE 0 END) as absence_count')
                ->join('level_attendance_sessions as s', 's.id', '=', 'level_attendance_entries.level_attendance_session_id')
                ->where('s.admin_interface', $scope)
                ->where('s.level_id', $level->id)
                ->whereBetween('s.held_on', [$from, $to])
                ->whereIn('level_attendance_entries.student_id', $students->pluck('id'))
                ->groupBy('level_attendance_entries.student_id')
                ->get()
                ->keyBy('student_id');

            $rows = [];
            foreach ($students as $st) {
                $row = $stats->get($st->id);
                $att = (int) ($row->attendance_count ?? 0);
                $abs = (int) ($row->absence_count ?? 0);
                $rows[] = [
                    'student_id' => (int) $st->id,
                    'full_name' => (string) $st->full_name,
                    'student_unique_id' => (string) $st->student_unique_id,
                    'serial_number' => (int) $st->serial_number,
                    'attendance_count' => $att,
                    'absence_count' => $abs,
                    'points' => $att,
                ];
            }

            $byLevel[] = [
                'level' => [
                    'id' => (int) $level->id,
                    'name' => (string) $level->name,
                    'code_prefix' => (string) $level->code_prefix,
                    'track' => $level->track ? [
                        'id' => (int) $level->track->id,
                        'name' => (string) $level->track->name,
                    ] : null,
                ],
                'students' => $rows,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'from' => $from,
                'to' => $to,
                'by_level' => $byLevel,
            ],
        ]);
    }

    /**
     * @param  array<int>  $presentIds
     */
    private function upsertLevelAttendanceSession(
        Request $request,
        string $scope,
        Level $level,
        string $heldOn,
        array $presentIds,
        ?string $title,
        ?string $notes,
        ?string $validationDotKey = null,
    ): void {
        $rosterIds = $this->rosterQuery($level)->pluck('id')->map(fn ($id) => (int) $id)->all();

        $unknown = array_values(array_diff($presentIds, $rosterIds));
        if ($unknown !== []) {
            $msg = 'Some selected students are not on this level roster: '.implode(', ', $unknown).'.';
            $key = $validationDotKey ?? 'present_student_ids';
            throw ValidationException::withMessages([$key => [$msg]]);
        }

        $session = LevelAttendanceSession::query()->firstOrNew([
            'level_id' => $level->id,
            'held_on' => $heldOn,
        ]);
        if (! $session->exists) {
            $session->created_by = $request->user()?->id;
        }
        $session->admin_interface = $scope;
        $session->title = $title;
        $session->notes = $notes;
        $session->save();

        $presentSet = array_fill_keys($presentIds, true);

        foreach ($rosterIds as $studentId) {
            LevelAttendanceEntry::query()->updateOrCreate(
                [
                    'level_attendance_session_id' => $session->id,
                    'student_id' => $studentId,
                ],
                [
                    'is_present' => isset($presentSet[$studentId]),
                ],
            );
        }

        $session->entries()->whereNotIn('student_id', $rosterIds)->delete();
    }

    private function rosterQuery(Level $level)
    {
        $q = Student::query()->where('level_id', $level->id);
        if (Schema::hasColumn('students', 'status')) {
            $q->where('status', 'active');
        }

        return $q;
    }

    private function assertSessionInScope(Request $request, LevelAttendanceSession $session): void
    {
        abort_if($session->admin_interface !== $this->lmsAdminScope($request), 404);
        $session->loadMissing('level');
        abort_if(! $session->level || $session->level->admin_interface !== $this->lmsAdminScope($request), 404);
    }

    /**
     * @return array<string, mixed>
     */
    private function sessionPayload(LevelAttendanceSession $session): array
    {
        $session->loadMissing('level:id,name,track_id');

        if (array_key_exists('present_count', $session->getAttributes())) {
            $presentCount = (int) $session->present_count;
            $absentCount = (int) $session->absent_count;
        } elseif ($session->relationLoaded('entries')) {
            $presentCount = $session->entries->where('is_present', true)->count();
            $absentCount = $session->entries->where('is_present', false)->count();
        } else {
            $presentCount = (int) $session->entries()->where('is_present', true)->count();
            $absentCount = (int) $session->entries()->where('is_present', false)->count();
        }

        return [
            'id' => (int) $session->id,
            'level_id' => (int) $session->level_id,
            'held_on' => $session->held_on?->toDateString(),
            'title' => $session->title,
            'notes' => $session->notes,
            'level' => $session->level ? [
                'id' => (int) $session->level->id,
                'name' => (string) $session->level->name,
            ] : null,
            'present_count' => $presentCount,
            'absent_count' => $absentCount,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function sessionMatchPayload(LevelAttendanceSession $session): array
    {
        $base = $this->sessionPayload($session);
        $entries = $session->relationLoaded('entries')
            ? $session->entries
            : $session->entries()->with('student:id,full_name,student_unique_id,serial_number,level_id')->get();

        $present = [];
        $absent = [];
        foreach ($entries as $entry) {
            $st = $entry->student;
            if (! $st) {
                continue;
            }
            $row = [
                'student_id' => (int) $st->id,
                'full_name' => (string) $st->full_name,
                'student_unique_id' => (string) $st->student_unique_id,
                'serial_number' => (int) $st->serial_number,
            ];
            if ($entry->is_present) {
                $present[] = $row;
            } else {
                $absent[] = $row;
            }
        }

        return array_merge($base, [
            'attendees' => $present,
            'absentees' => $absent,
        ]);
    }
}
