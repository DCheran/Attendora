# Attendora

## Campus Attendance Management System

Attendora is a web-based campus attendance management system designed to simplify daily attendance marking, student attendance tracking, attendance correction requests, automated report generation, and email-based department reporting.

The system provides a centralized platform for coordinators to manage attendance while allowing students to view their attendance status and request corrections when they are incorrectly marked absent.

---

## Features

### Faculty / Coordinator

- Master coordinator login
- Secure JWT-based authentication
- Batch-wise attendance management
- Department-wise student organization
- College ID and email capture for attendance
- Mark students Present or Absent
- Mark All Present / Mark All Absent
- Attendance status persistence
- Attendance UPSERT support
- Today's class schedule validation
- Attendance correction request management
- Approve or reject correction requests
- Automated department attendance reports
- PDF report generation
- Email delivery of attendance reports

### Student

- Public student attendance lookup
- Search attendance using roll number
- View today's attendance status
- Present / Absent status display
- Attendance correction request
- Optional supporting document upload
- Correction requests require coordinator approval

---

## System Architecture

```text
                    ┌─────────────────────┐
                    │      Attendora      │
                    │   React Frontend    │
                    └──────────┬──────────┘
                               │
                               │ REST API
                               ▼
                    ┌─────────────────────┐
                    │   Node.js / Express │
                    │       Backend       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌─────────────┐  ┌─────────────┐
       │ PostgreSQL │   │ JWT / Auth  │  │   Multer    │
       │  Supabase  │   │             │  │ File Upload │
       └────────────┘   └─────────────┘  └─────────────┘
              │
              ▼
       ┌─────────────────┐
       │ Attendance Data │
       │ Students        │
       │ Schedules       │
       │ Corrections     │
       └─────────────────┘

                    ┌─────────────────────┐
                    │ PDF Report Service  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    SMTP / Email     │
                    └─────────────────────┘
```
