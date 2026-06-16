# Frontend Admin Dashboard (React)

## Run

```bash
cd frontend
npm install
npm run dev
```

## Included

- Admin login gate (frontend-protected routes)
- Dashboard overview with stats and recent activity
- Level management view
- Student management with:
  - auto-generated ID (`prefix + 4-digit serial`)
  - random password generation on create (not displayed as stored password)
  - activate/deactivate action
- Exams management with publish/unpublish
- Question bank and library scaffolding UI
- Responsive dark theme using:
  - `#c97837`
  - `#902821`
- Framer Motion page/card animations
- Smooth scrolling transitions

## Security Note

This frontend is API-ready and uses mock data for now. Final secure logic (hashing, one-attempt constraints, access control, enforcement) must be done server-side in Laravel.
