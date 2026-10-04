# Attendora backend changes

This backend is aligned with the finalized Attendora UI.

## Added
- Master/coordinator login: `POST /api/auth/master-login`
- Batch schedule/status: `GET /api/attendance/batches/today`
- Batch students for the selected batch: `GET /api/attendance/batch/:batch/today`
- Student today lookup: `GET /api/attendance/student/:rollNumber/today`
- Attendance correction submission: `POST /api/attendance/correction`
- Master authentication middleware
- Master account setup script
- SQL migration for master credentials, coordinator name, and correction requests

## Changed
- Mark attendance now accepts the selected batch from the master dropdown.
- Coordinator name, college ID and email are saved with attendance.
- Students without an attendance row are presented as `PRESENT`; `NOT_MARKED` is not exposed by the final student/mark-attendance endpoints.
- Batch schedule is checked before attendance can be submitted.

## Before starting
1. Run `database/attendora_migration.sql` in the existing database.
2. Add `MASTER_USERNAME`, `MASTER_PASSWORD`, `MASTER_NAME`, and `MASTER_EMAIL` to `.env`.
3. Run `npm install` because `multer` was added for the optional correction-document upload.
4. Run `node setupMasterAccount.js`.
5. Start the server with `node server.js`.

The existing `.env` is intentionally not included in the updated package. Keep your local credentials in your own `.env`.
