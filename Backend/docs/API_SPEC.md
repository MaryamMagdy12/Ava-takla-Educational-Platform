# Learning Platform Backend API

## Architecture
- Framework: Laravel 12 + Sanctum token auth
- Pattern: MVC + Service layer (`app/Services`)
- Security: hashed passwords, role middleware, guarded routes, validated uploads, rate limiting on auth/OTP
- Storage: MySQL + `public` disk for books/lectures
- Imports: CSV / XLSX via OpenSpout (no PHP `ext-gd` required)
- API JSON shape: `App\Support\ApiResponse` + centralized handlers for `api/*` routes

## Folder Structure
- `app/Support/ApiResponse.php` — unified success/error JSON
- `app/Http/Controllers/Api/AuthController.php`
- `app/Http/Controllers/Api/Admin/*`
- `app/Http/Controllers/Api/Student/*`
- `app/Http/Middleware/EnsureRole.php`
- `app/Mail/StudentPasswordResetOtpMail.php`
- `app/Models/*`
- `app/Services/StudentAccountService.php`
- `app/Services/StudentPasswordResetService.php`
- `app/Services/ExamEngineService.php`
- `app/Services/SpreadsheetReaderService.php`
- `app/Services/BulkStudentImportService.php`
- `app/Services/BulkQuestionImportService.php`
- `routes/api.php`
- `database/migrations/*`
- `database/seeders/DatabaseSeeder.php`

## Database Schema (Implemented)
- `admins`: auth for admin users
- `tracks`: content tracks
- `levels`: mapped to tracks, includes unique 4-digit `code_prefix`
- `courses`: learning courses
- `students`: profile, optional unique `email` (for OTP reset), generated `student_unique_id`, `serial_number`, `must_change_password`
- `books`: track/course file assets
- `lectures`: track/course media assets
- `questions`: bank with type, difficulty, feedback
- `question_options`: answer options and correctness
- `exams`: timing window, duration, question config, status
- `exam_attempts`: one-attempt rule with unique `(student_id, exam_id)`
- `attempt_questions`: locked random questions per attempt
- `attempt_answers`: selected options + correctness + feedback
- `student_book_access`: direct assignment
- `student_lecture_access`: direct assignment
- `student_exam_access`: direct assignment
- `personal_access_tokens`: Sanctum tokens

**Migration note:** `tracks` must be created before `levels` (migrations use `2026_03_29_170454_01_*` then `170454_02_*`). If a previous failed run left a bad state, use `php artisan migrate:fresh` on a dev database.

## Key Logic

### Student ID Generation
- Level has `code_prefix` (4 digits)
- On student create: next per-level `serial_number` (4 digits, padded)
- Final `student_unique_id` = `code_prefix + serial_number` (8 digits)

### Password Flow
- Student create/reset generates temporary password
- Temporary password is returned once in response only
- Password stored hashed automatically by model cast
- `must_change_password = true` until student updates password
- **Forgot password:** request sends a **6-digit OTP** to the student’s `email` (if set). Verify endpoint sets a new password. API responses are generic on request to reduce account enumeration.

### Exam Attempt Rules
- One attempt only (`unique(student_id, exam_id)`)
- Start exam checks: availability window, no existing attempt
- `allowed_end_time = min(started_at + duration, available_to)`
- Random questions are selected once and saved in `attempt_questions`
- Submit uses locked questions only; does not re-randomize
- Auto grading compares selected option with `is_correct`

### Standard JSON Response
- Success: `{ "success": true, "message"?: string, "data"?: ... }`
- Error: `{ "success": false, "message": string, "errors"?: object }`
- Validation (422): `errors` contains Laravel field errors.
- Non-debug `api/*` errors return a safe 500 message; full details only when `APP_DEBUG=true`.

### Rate limits (see `AppServiceProvider`)
- `auth-login`: logins per IP
- `student-otp`: OTP **request** per student ID + IP (per hour)
- `student-otp-verify`: verify attempts per IP (per minute)

### Performance
- Admin dashboard stats cached **60 seconds** (`admin_dashboard_stats_v1`)
- Extra composite indexes on `students`, `exams`, `books`, `lectures` for common filters

## Core API Endpoints

### Auth
- `POST /api/auth/admin/login` (throttle: `auth-login`)
- `POST /api/auth/student/login` (throttle: `auth-login`)
- `POST /api/auth/student/password-reset/request` (throttle: `student-otp`)
- `POST /api/auth/student/password-reset/verify` (throttle: `student-otp-verify`)
- `POST /api/auth/logout` (auth)
- `POST /api/student/change-password` (auth, student)

### Admin
- Dashboard: `GET /api/admin/dashboard/stats`
- Students: list/create/**import**/show/update/toggle/reset-password  
  - `POST /api/admin/students/import` — multipart `file` (csv, txt, xlsx)
- Tracks/Levels: list/create/update
- Courses: CRUD
- Books: CRUD + assign/unassign
- Lectures: CRUD + assign/unassign
- Questions: list (filters: `course_id`, `track_id`, `difficulty`, `q`, `per_page`) / create / **import** / show / update / delete  
  - Options: `POST .../questions/{id}/options`, `PUT .../questions/{id}/options/{option}`, `DELETE ...`
  - `POST /api/admin/questions/import` — multipart `file`
- Exams: CRUD + publish/unpublish + assign/unassign
- Attempts: list/show/reset

### Student
- Dashboard: `GET /api/student/dashboard`
- Profile: `GET /api/student/profile`
- Books: `GET /api/student/books`
- Lectures: `GET /api/student/lectures`
- Exams: list / start / resume / submit / result

## Bulk import file formats

### Students (first row = headers)
| Column | Required | Notes |
|--------|----------|--------|
| `full_name` | yes | |
| `level_id` | one of level_id / level_code_prefix | Numeric DB id |
| `level_code_prefix` | one of level_id / level_code_prefix | 4 chars, e.g. `5678` |
| `track_id` | no | Overrides default from level |
| `email` | no | Must be unique if set; needed for student OTP reset |
| `status` | no | `active` or `inactive` |

Temporary passwords for bulk-created students are **not** returned in the import response; use per-student reset if needed.

### Questions (first row = headers)
| Column | Required | Notes |
|--------|----------|--------|
| `course_id` | yes | |
| `track_id` | yes | |
| `question_text` | yes | |
| `question_type` | yes | `mcq` or `true_false` |
| `difficulty` | yes | `easy`, `medium`, `hard` |
| `option_1` … `option_4` | at least 2 non-empty | |
| `correct_index` | yes | 1–4, must point to a filled option |
| `feedback_correct` | no | |
| `feedback_wrong` | no | |
| `status` | no | default `active` |

Response shape: `{ "created": n, "errors": [ { "row": n, "message": "..." } ] }`.

## Sample Payloads

### Admin Login Request
```json
{
  "login": "admin@example.com",
  "password": "Admin@12345"
}
```

### Student password reset — request
```json
{ "student_unique_id": "56780001" }
```

### Student password reset — verify
```json
{
  "student_unique_id": "56780001",
  "otp": "123456",
  "password": "NewSecurePass1",
  "password_confirmation": "NewSecurePass1"
}
```

### Student Create Request
```json
{
  "full_name": "John Mark",
  "level_id": 1,
  "email": "john@example.com"
}
```

### Student Create Response (excerpt)
```json
{
  "success": true,
  "data": {
    "id": 12,
    "student_unique_id": "56780012"
  },
  "temporary_password": "A8gkJ2mPq1"
}
```

### Start Exam Response (excerpt)
```json
{
  "success": true,
  "data": {
    "attempt": {
      "id": 7,
      "allowed_end_time": "2026-03-29T20:00:00Z"
    },
    "remaining_seconds": 2100,
    "questions": []
  }
}
```

## Mail / `.env`
Configure `MAIL_*` for OTP delivery. With `MAIL_MAILER=log`, messages go to the log file (fine for local dev).
