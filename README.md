# Mini Educational Platform

A multi-portal learning platform for church education programs. One **Laravel API** powers several **React (Vite)** frontends for admins, students, families, and special learners.

## Overview

| Layer | Technology |
|-------|------------|
| API | Laravel 12, Sanctum, MySQL (recommended) |
| Frontends | React 19, Vite 6, React Router, Axios |
| Auth | Bearer tokens, role/interface middleware, rate limits |
| Imports | CSV / XLSX (OpenSpout) |

### Portals

| App | Path | Default dev port |
|-----|------|------------------|
| **Interfaces Hub** | `Front/Interfaces_Hub` | 5176 |
| **Admin dashboard** | `Front/Admin_side` | 5173 (Vite default) |
| **Deacons School (students)** | `Front/Deacons_School_students` | 5173 |
| **Specialized Courses** | `Front/Specialized_Courses` | 5175 |
| **General Assembly & Competitions** | `Front/General_Assembly_Competitions` | 5174 |

The hub links to the other portals. Configure URLs in `Front/Interfaces_Hub/src/config/portalUrls.js` or via `VITE_PORTAL_*` env vars.

## Repository structure

```
Mini_educatinal_platform/
├── Backend/          # Laravel API (routes/api.php, services, migrations)
├── Front/
│   ├── Admin_side/
│   ├── Deacons_School_students/
│   ├── Specialized_Courses/
│   ├── General_Assembly_Competitions/
│   └── Interfaces_Hub/
└── README.md
```

## Requirements

- **PHP** 8.2+ with extensions: `pdo_mysql` (or `pdo_sqlite` for quick local tests), `mbstring`, `openssl`, `fileinfo`
- **Composer** 2.x
- **Node.js** 18+ and **npm**
- **MySQL** 8+ for production and full feature parity (SQLite works for PHPUnit only)

## Quick start

### 1. Backend

```bash
cd Backend
cp .env.example .env
composer install
php artisan key:generate
```

Configure `.env` (minimum):

- `DB_CONNECTION=mysql` and database credentials
- `SYSTEM_ADMIN_*` for the bootstrap super admin (see `.env.example`)
- `MAIL_*` if you need OTP / verification emails
- `GOOGLE_CLIENT_ID` for Specialized Courses Google sign-in

```bash
php artisan migrate
php artisan db:seed          # optional: system admin + sample data if seeder is configured
php artisan serve --host=0.0.0.0 --port=8000
```

For large uploads in dev, this project’s custom `php artisan serve` injects higher PHP upload limits into the built-in server.

**Queue worker** (if using queued mail):

```bash
php artisan queue:listen
```

### 2. Frontends

Each app is independent. From any frontend folder:

```bash
cd Front/Admin_side   # or another portal
cp .env.example .env  # if present
npm install
npm run dev -- --host
```

In development, SPAs typically call the API at `http://<same-host>:8000/api` so large uploads hit PHP directly (see each app’s `.env.example`).

Run the **hub** on port **5176** and point portal URLs at your LAN IP if testing from other devices.

## Main features

- **Student LMS** — courses, books, lectures, exams (one attempt per student per exam), attendance, questionnaires
- **Admin** — multi-interface dashboards (student / special / general assembly), bulk student import, credential generation
- **Special learners** — registration, email verification, church activation, exams and questionnaires
- **General Assembly** — family accounts, family exams, competitions, protected GA lecture streaming
- **Security** — structured API errors (`error_code`), exam integrity (resume guards, answer validation, `correct_option_id` snapshots), private media for books/lectures/GA uploads, login throttling and optional account lockout

## Student passwords (business rule)

Admin/system **generates** student credentials. This is intentional and preserved:

- Only a **hash** is stored in the database
- Plain passwords appear **once** on create/reset (and in controlled bulk export when enabled)
- List/show APIs never return password or hash
- `STUDENT_PASSWORD_EXPORT_ENABLED` (default `true`) controls whether permanent passwords are included in create/reset/import responses
- Bulk import can write a private export file; download via `GET /api/admin/students/credential-exports/{token}` (audited)

Logic: `Backend/app/Services/StudentAccountService.php` and `Backend/config/student_accounts.php`.

## Useful environment variables

| Variable | Purpose |
|----------|---------|
| `STUDENT_PASSWORD_EXPORT_ENABLED` | Include permanent password in one-time API/export flows |
| `AUTH_LOCKOUT_ENABLED` | Persistent lockout after repeated failed logins |
| `AUTH_LOCKOUT_MAX_ATTEMPTS` | Failures before lockout (default 5) |
| `AUTH_LOCKOUT_MINUTES` | Lockout duration (default 15) |
| `SANCTUM_EXPIRATION` | Token lifetime (minutes) |
| `SESSION_INACTIVITY_TIMEOUT_MINUTES` | API session inactivity |
| `MAX_*_UPLOAD_MB` | Document / audio / video upload limits |

## Artisan commands

```bash
# Move legacy GA lecture files from public/local to private disk
php artisan ga:migrate-lecture-media-to-private
php artisan ga:migrate-lecture-media-to-private --dry-run

# Tests
php artisan test
```

## API documentation

Detailed backend notes: [`Backend/docs/API_SPEC.md`](Backend/docs/API_SPEC.md)

Standard error shape:

```json
{
  "success": false,
  "message": "Human-readable message",
  "error_code": "STABLE_CODE",
  "errors": {}
}
```

## Testing

From `Backend/`:

```bash
composer test
# or
php artisan test
```

PHPUnit uses in-memory SQLite by default (`phpunit.xml`). Feature tests cover exam security, login lockout, cache helpers, and credential export.

## Production checklist

1. `APP_ENV=production`, `APP_DEBUG=false`
2. MySQL migrated: `php artisan migrate --force`
3. `php artisan config:cache` and `php artisan route:cache`
4. Build each frontend: `npm run build` and serve static assets behind your web server
5. Point all `VITE_API_URL` / production env vars to the HTTPS API
6. Run `php artisan ga:migrate-lecture-media-to-private` if GA media was uploaded before private-disk enforcement
7. Configure real SMTP for OTP and verification mail
8. Set strong `SYSTEM_ADMIN_PASSWORD` and rotate secrets; never commit `.env`

## License

Internal / project-specific — add your license terms here if applicable.
