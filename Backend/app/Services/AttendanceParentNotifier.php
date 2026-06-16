<?php

namespace App\Services;

use App\Mail\AttendanceSavedParentMail;
use App\Models\LevelAttendanceSession;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AttendanceParentNotifier
{
    public function notifyForSession(LevelAttendanceSession $session): void
    {
        if (! config('attendance.notify_parents', true)) {
            return;
        }

        // Controller often eager-loads `student` without parent columns; loadMissing would skip.
        $session->unsetRelation('entries');
        $session->load([
            'level.track:id,name',
            'entries' => fn ($q) => $q->with([
                'student:id,full_name,student_unique_id,parent_email,parent_name',
            ]),
        ]);

        $level = $session->level;
        $levelName = $level ? trim((string) $level->name) : '—';
        $trackName = $level && $level->relationLoaded('track') && $level->track
            ? trim((string) $level->track->name)
            : '';
        $levelLabel = $trackName !== '' ? $levelName: $levelName;

        $heldOnDisplay = $session->held_on?->toDateString() ?? '—';

        $byEmail = [];
        foreach ($session->entries as $entry) {
            $student = $entry->student;
            if (! $student) {
                continue;
            }
            $raw = trim((string) ($student->parent_email ?? ''));
            if ($raw === '' || ! filter_var($raw, FILTER_VALIDATE_EMAIL)) {
                continue;
            }
            $key = mb_strtolower($raw);
            if (! isset($byEmail[$key])) {
                $byEmail[$key] = [
                    'to' => $raw,
                    'greeting' => $this->greetingFor($student->parent_name),
                    'lines' => [],
                ];
            }
            $byEmail[$key]['lines'][] = [
                'name' => (string) $student->full_name,
                'code' => (string) $student->student_unique_id,
                'state' => $entry->is_present ? 'حاضر' : 'غائب',
            ];
        }

        if ($session->entries->isNotEmpty() && $byEmail === []) {
            Log::info('attendance.parent_mails_skipped', [
                'session_id' => $session->id,
                'reason' => 'no_valid_parent_emails',
                'entry_count' => $session->entries->count(),
            ]);
        }

        foreach ($byEmail as $bucket) {
            try {
                Mail::to($bucket['to'])->send(new AttendanceSavedParentMail(
                    parentGreeting: $bucket['greeting'],
                    heldOn: $heldOnDisplay,
                    levelLabel: $levelLabel,
                    sessionTitle: $session->title ? trim((string) $session->title) : null,
                    sessionNotes: $session->notes ? trim((string) $session->notes) : null,
                    lines: $bucket['lines'],
                ));
            } catch (\Throwable $e) {
                Log::warning('attendance.parent_mail_failed', [
                    'to' => $bucket['to'],
                    'session_id' => $session->id,
                    'message' => $e->getMessage(),
                ]);
            }
        }
    }

    private function greetingFor(?string $parentName): string
    {
        $name = trim((string) ($parentName ?? ''));
        if ($name !== '') {
            return 'عزيزي ولي الأمر '.$name.' المحترم،';
        }

        return 'عزيزي ولي الأمر المحترم،';
    }
}
