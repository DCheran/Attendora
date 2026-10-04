const db = require("../config/pgdb");

const getStudentsByDepartment = async (req, res) => {
    try {
        const { department } = req.params;

        const result = await db.query(
            `
            SELECT
                s.id,
                s.roll_number,
                s.student_name,
                d.name AS department,
                s.batch
            FROM students s
            JOIN departments d
                ON s.department_id = d.id
            WHERE d.name = $1
            ORDER BY s.roll_number
            `,
            [department]
        );

        const students = result.rows;

        res.status(200).json({
            success: true,
            count: students.length,
            students
        });

    } catch (error) {
        console.error("Error fetching students:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch students"
        });
    }
};

const markAttendance = async (req, res) => {
    try {
        const {
            batch,
            attendanceDate,
            facultyCollegeId,
            facultyEmail,
            attendance
        } = req.body;

        if (
            !batch ||
            !attendanceDate ||
            !facultyEmail ||
            !Array.isArray(attendance)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "batch, attendanceDate, facultyCollegeId, facultyEmail and attendance are required"
            });
        }

        if (attendance.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Attendance list cannot be empty"
            });
        }

        // Master account can choose any batch from the dropdown.
        const scheduleResult = await db.query(
            `
            SELECT
                attendance_batch,
                group_name,
                batch_name,
                day_of_week
            FROM class_schedule
            WHERE attendance_batch = $1
              AND UPPER(day_of_week) =
                  UPPER(TO_CHAR($2::date, 'FMDay'))
            `,
            [batch, attendanceDate]
        );

        const schedule = scheduleResult.rows;

        if (schedule.length === 0) {
            return res.status(400).json({
                success: false,
                message: `${batch} is not scheduled on ${attendanceDate}`
            });
        }

        let saved = 0;
        let skipped = 0;

        for (const record of attendance) {
            const { studentId, status } = record;

            if (
                !studentId ||
                !["PRESENT", "ABSENT"].includes(status)
            ) {
                skipped++;
                continue;
            }

            const studentResult = await db.query(
                `
                SELECT id
                FROM students
                WHERE id = $1
                  AND attendance_batch = $2
                `,
                [studentId, batch]
            );

            const students = studentResult.rows;

            if (students.length === 0) {
                skipped++;
                continue;
            }

            await db.query(
                `
                INSERT INTO attendance
                (
                    event_id,
                    student_id,
                    attendance_batch,
                    faculty_college_id,
                    faculty_email,
                    attendance_date,
                    status
                )
                VALUES (NULL, $1, $2, $3, $4, $5, $6)

                ON CONFLICT
                (student_id, attendance_batch, attendance_date)
                DO UPDATE SET
                    status = EXCLUDED.status,
                    faculty_college_id = EXCLUDED.faculty_college_id,
                    faculty_email = EXCLUDED.faculty_email,
                    marked_at = CURRENT_TIMESTAMP
                `,
                [
                    studentId,
                    batch,
                    facultyCollegeId,
                    facultyEmail,
                    attendanceDate,
                    status
                ]
            );

            saved++;
        }

        return res.status(200).json({
            success: true,
            message: "Attendance saved successfully",
            batch,
            attendanceDate,
            facultyCollegeId,
            facultyEmail,
            saved,
            skipped
        });

    } catch (error) {
        console.error("Error marking attendance:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to save attendance"
        });
    }
};

const getTodayAttendance = async (req, res) => {
    try {
        const { department } = req.params;
        const { eventId, attendanceDate } = req.query;

        if (!eventId || !attendanceDate) {
            return res.status(400).json({
                success: false,
                message: "eventId and attendanceDate are required"
            });
        }

        const result = await db.query(
            `
            SELECT
                a.student_id,
                s.roll_number,
                s.student_name,
                a.status,
                a.marked_at
            FROM attendance a
            JOIN students s
                ON a.student_id = s.id
            JOIN departments d
                ON s.department_id = d.id
            WHERE d.name = $1
              AND a.event_id = $2
              AND a.attendance_date = $3
            ORDER BY s.roll_number
            `,
            [department, eventId, attendanceDate]
        );

        const records = result.rows;

        res.status(200).json({
            success: true,
            count: records.length,
            attendance: records
        });

    } catch (error) {
        console.error("Error fetching attendance:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch attendance"
        });
    }
};

const getDepartments = async (req, res) => {
    try {
        const result = await db.query(
            `
            SELECT
                id,
                name
            FROM departments
            ORDER BY name
            `
        );

        const departments = result.rows;

        res.status(200).json({
            success: true,
            departments
        });

    } catch (error) {
        console.error("Error fetching departments:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch departments"
        });
    }
};

const getTodayStudentsByBatch = async (req, res) => {
    try {
        const { batch } = req.params;

        if (!batch) {
            return res.status(400).json({
                success: false,
                message: "Batch is required"
            });
        }

        const scheduleResult = await db.query(
            `
            SELECT
                attendance_batch,
                group_name,
                batch_name,
                day_of_week
            FROM class_schedule
            WHERE attendance_batch = $1
              AND UPPER(day_of_week) =
                  UPPER(TO_CHAR(CURRENT_DATE, 'FMDay'))
            `,
            [batch]
        );

        const schedule = scheduleResult.rows;

        if (schedule.length === 0) {
            return res.status(200).json({
                success: true,
                batch,
                date: new Date().toISOString().split("T")[0],
                classToday: false,
                message: `${batch} is not scheduled for today`,
                totalStudents: 0,
                departments: {}
            });
        }

        const studentsResult = await db.query(
            `
            SELECT
                s.id AS "studentId",
                s.roll_number AS "rollNumber",
                s.student_name AS "studentName",
                d.name AS department,

                COALESCE(
                    (
                        SELECT a.status
                        FROM attendance a
                        WHERE a.student_id = s.id
                          AND a.attendance_batch = $1
                          AND a.attendance_date = CURRENT_DATE
                        ORDER BY a.marked_at DESC
                        LIMIT 1
                    ),
                    'PRESENT'
                ) AS status

            FROM students s
            JOIN departments d
                ON s.department_id = d.id
            WHERE s.attendance_batch = $2
            `,
            [batch, batch]
        );

        const students = studentsResult.rows;

        const departments = {};
        const departmentOrder = [];

        for (const student of students) {
            if (!departments[student.department]) {
                departments[student.department] = [];
                departmentOrder.push(student.department);
            }

            departments[student.department].push(student);
        }

        const compareRollNumbers = (a, b) => {
            const rollA = String(a || "")
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "");

            const rollB = String(b || "")
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "");

            const firstA = rollA.charAt(0);
            const firstB = rollB.charAt(0);

            const numA = /^[0-9]$/.test(firstA);
            const numB = /^[0-9]$/.test(firstB);

            if (numA && !numB) return -1;
            if (!numA && numB) return 1;

            return rollA.localeCompare(rollB, undefined, {
                numeric: true,
                sensitivity: "base"
            });
        };

        for (const department of departmentOrder) {
            departments[department].sort((a, b) =>
                compareRollNumbers(
                    a.rollNumber,
                    b.rollNumber
                )
            );
        }

        return res.status(200).json({
            success: true,
            batch,
            date: new Date().toISOString().split("T")[0],
            classToday: true,
            schedule: schedule[0],
            totalStudents: students.length,
            departments
        });

    } catch (error) {
        console.error(
            "Error fetching today's batch students:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch today's students"
        });
    }
};

const getBatchStatusToday = async (req, res) => {
    try {
        const result = await db.query(
            `
            SELECT
                attendance_batch,
                MAX(group_name) AS group_name,
                MAX(batch_name) AS batch_name,

                STRING_AGG(
                    day_of_week,
                    ', '
                    ORDER BY day_of_week
                ) AS scheduled_days,

                MAX(
                    CASE
                        WHEN UPPER(day_of_week) =
                             UPPER(TO_CHAR(CURRENT_DATE, 'FMDay'))
                        THEN 1
                        ELSE 0
                    END
                ) AS class_today

            FROM class_schedule

            GROUP BY attendance_batch

            ORDER BY attendance_batch
            `
        );

        const rows = result.rows;

        const today = new Date()
            .toLocaleDateString("en-US", {
                weekday: "long",
                timeZone: "Asia/Kolkata"
            })
            .toUpperCase();

        const batches = rows.map(row => ({
            batch: row.attendance_batch,
            groupName: row.group_name,
            batchName: row.batch_name,
            scheduledDays: row.scheduled_days,
            classToday: Number(row.class_today) === 1
        }));

        return res.json({
            success: true,
            date: new Date().toLocaleDateString(
                "en-CA",
                {
                    timeZone: "Asia/Kolkata"
                }
            ),
            day: today,
            batches
        });

    } catch (error) {
        console.error("Batch status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load batch schedule"
        });
    }
};

const getStudentTodayAttendance = async (req, res) => {
    try {
        const rollNumber = String(
            req.params.rollNumber || ""
        ).trim().toUpperCase();

        if (!rollNumber) {
            return res.status(400).json({
                success: false,
                message: "Roll number is required"
            });
        }

        const studentResult = await db.query(
            `
            SELECT
                s.id AS "studentId",
                s.roll_number AS "rollNumber",
                s.student_name AS "studentName",
                d.name AS department,
                s.attendance_batch AS batch
            FROM students s
            JOIN departments d
                ON s.department_id = d.id
            WHERE UPPER(s.roll_number) = $1
            LIMIT 1
            `,
            [rollNumber]
        );

        const students = studentResult.rows;

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        const student = students[0];

        const scheduleResult = await db.query(
            `
            SELECT
                attendance_batch,
                group_name,
                batch_name,
                day_of_week
            FROM class_schedule
            WHERE attendance_batch = $1
              AND UPPER(day_of_week) =
                  UPPER(TO_CHAR(CURRENT_DATE, 'FMDay'))
            `,
            [student.batch]
        );

        const schedule = scheduleResult.rows;

        if (schedule.length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "There is no class scheduled for this student today",
                classToday: false
            });
        }

        const attendanceResult = await db.query(
            `
            SELECT
                status,
                marked_at
            FROM attendance
            WHERE student_id = $1
              AND attendance_batch = $2
              AND attendance_date = CURRENT_DATE
            ORDER BY marked_at DESC
            LIMIT 1
            `,
            [
                student.studentId,
                student.batch
            ]
        );

        const attendanceRows = attendanceResult.rows;

        const status =
            attendanceRows.length > 0
                ? attendanceRows[0].status
                : "PRESENT";

        return res.json({
            success: true,

            student: {
                name: student.studentName,
                rollNumber: student.rollNumber,
                department: student.department,
                batch: student.batch
            },

            date: new Date()
                .toISOString()
                .split("T")[0],

            status,

            classToday: true,

            markedAt:
                attendanceRows[0]?.marked_at || null
        });

    } catch (error) {
        console.error(
            "Student attendance lookup error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to check attendance"
        });
    }
};

const createCorrectionRequest = async (req, res) => {
    try {
        const {
            rollNumber,
            attendanceDate,
            reason
        } = req.body;

        const normalizedRoll = String(
            rollNumber || ""
        ).trim().toUpperCase();

        if (
            !normalizedRoll ||
            !attendanceDate ||
            !reason?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Roll number, attendance date and reason are required"
            });
        }

        const studentResult = await db.query(
            `
            SELECT
                id,
                roll_number,
                student_name
            FROM students
            WHERE UPPER(roll_number) = $1
            LIMIT 1
            `,
            [normalizedRoll]
        );

        const students = studentResult.rows;

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        const student = students[0];

        const attendanceResult = await db.query(
            `
            SELECT status
            FROM attendance
            WHERE student_id = $1
              AND attendance_date = $2
            ORDER BY marked_at DESC
            LIMIT 1
            `,
            [
                student.id,
                attendanceDate
            ]
        );

        const attendanceRows = attendanceResult.rows;

        if (attendanceRows.length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "No attendance record exists for that date"
            });
        }

        const currentStatus =
            attendanceRows[0].status;

        if (currentStatus !== "ABSENT") {
            return res.status(400).json({
                success: false,
                message:
                    "Correction request is allowed only for an ABSENT record"
            });
        }

        const pendingResult = await db.query(
            `
            SELECT id
            FROM attendance_corrections
            WHERE student_id = $1
              AND attendance_date = $2
              AND status = 'PENDING'
            LIMIT 1
            `,
            [
                student.id,
                attendanceDate
            ]
        );

        const pending = pendingResult.rows;

        if (pending.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "A correction request is already pending for this date"
            });
        }

        const supportingDocument = req.file
            ? req.file.filename
            : (req.body.supportingDocument || null);

        const insertResult = await db.query(
            `
            INSERT INTO attendance_corrections
            (
                student_id,
                attendance_date,
                current_status,
                reason,
                supporting_document
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            `,
            [
                student.id,
                attendanceDate,
                currentStatus,
                reason.trim(),
                supportingDocument
            ]
        );

        const requestId =
            insertResult.rows[0].id;

        return res.status(201).json({
            success: true,
            message:
                "Attendance correction request submitted",
            requestId,
            student: {
                name: student.student_name,
                rollNumber: student.roll_number
            },
            attendanceDate,
            currentStatus,
            status: "PENDING"
        });

    } catch (error) {
        console.error(
            "Correction request error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to submit correction request"
        });
    }
};

const getCorrectionRequests = async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT
                ac.id AS "requestId",
                ac.attendance_date AS "attendanceDate",
                ac.current_status AS "currentStatus",
                ac.reason,
                ac.supporting_document AS "supportingDocument",
                ac.status,
                ac.created_at AS "createdAt",
                ac.reviewed_at AS "reviewedAt",

                s.id AS "studentId",
                s.roll_number AS "rollNumber",
                s.student_name AS "studentName",
                s.batch,
                s.attendance_batch AS "attendanceBatch",

                d.name AS department

            FROM attendance_corrections ac

            JOIN students s
                ON ac.student_id = s.id

            JOIN departments d
                ON s.department_id = d.id
        `;

        const params = [];

        if (status) {
            query += ` WHERE ac.status = $1 `;
            params.push(String(status).toUpperCase());
        }

        query += `
            ORDER BY
                CASE
                    WHEN ac.status = 'PENDING' THEN 0
                    ELSE 1
                END,
                ac.created_at DESC
        `;

        const result = await db.query(query, params);

        const requests = result.rows;

        return res.status(200).json({
            success: true,
            count: requests.length,
            requests
        });

    } catch (error) {
        console.error(
            "Get correction requests error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch correction requests"
        });
    }
};


const approveCorrectionRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: "Request ID is required"
            });
        }

        const requestResult = await db.query(
            `
            SELECT
                ac.id,
                ac.student_id,
                ac.attendance_date,
                ac.status,
                s.attendance_batch
            FROM attendance_corrections ac
            JOIN students s
                ON ac.student_id = s.id
            WHERE ac.id = $1
            LIMIT 1
            `,
            [requestId]
        );

        const requests = requestResult.rows;

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Correction request not found"
            });
        }

        const request = requests[0];

        if (request.status !== "PENDING") {
            return res.status(400).json({
                success: false,
                message: `Request is already ${request.status}`
            });
        }

        /*
         * Change the student's attendance
         * from ABSENT to PRESENT.
         */
        const attendanceResult = await db.query(
            `
            UPDATE attendance
            SET
                status = 'PRESENT',
                marked_at = CURRENT_TIMESTAMP
            WHERE student_id = $1
              AND attendance_batch = $2
              AND attendance_date = $3
              AND status = 'ABSENT'
            `,
            [
                request.student_id,
                request.attendance_batch,
                request.attendance_date
            ]
        );

        if (attendanceResult.rowCount === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "No ABSENT attendance record found for this request"
            });
        }

        /*
         * Mark correction request as APPROVED.
         */
        await db.query(
            `
            UPDATE attendance_corrections
            SET
                status = 'APPROVED',
                reviewed_at = CURRENT_TIMESTAMP
            WHERE id = $1
            `,
            [requestId]
        );

        return res.status(200).json({
            success: true,
            message: "Correction request approved",
            requestId: Number(requestId),
            attendanceStatus: "PRESENT",
            status: "APPROVED"
        });

    } catch (error) {
        console.error(
            "Approve correction request error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to approve correction request"
        });
    }
};


const rejectCorrectionRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: "Request ID is required"
            });
        }

        const result = await db.query(
            `
            SELECT
                id,
                status
            FROM attendance_corrections
            WHERE id = $1
            LIMIT 1
            `,
            [requestId]
        );

        const requests = result.rows;

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Correction request not found"
            });
        }

        if (requests[0].status !== "PENDING") {
            return res.status(400).json({
                success: false,
                message: `Request is already ${requests[0].status}`
            });
        }

        await db.query(
            `
            UPDATE attendance_corrections
            SET
                status = 'REJECTED',
                reviewed_at = CURRENT_TIMESTAMP
            WHERE id = $1
            `,
            [requestId]
        );

        return res.status(200).json({
            success: true,
            message: "Correction request rejected",
            requestId: Number(requestId),
            attendanceStatus: "ABSENT",
            status: "REJECTED"
        });

    } catch (error) {
        console.error(
            "Reject correction request error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to reject correction request"
        });
    }
};

const getTodayAttendanceReport = async (req, res) => {
    try {
        const { batch } = req.params;

        if (!batch) {
            return res.status(400).json({
                success: false,
                message: "Batch is required"
            });
        }

        // Make sure the logged-in coordinator belongs to this batch
        if (req.coordinator.batch !== batch) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized for this batch"
            });
        }

        // Check today's schedule
        const scheduleResult = await db.query(
            `
            SELECT
                attendance_batch,
                group_name,
                batch_name,
                day_of_week
            FROM class_schedule
            WHERE attendance_batch = $1
              AND UPPER(day_of_week) =
                  UPPER(TO_CHAR(CURRENT_DATE, 'FMDay'))
            `,
            [batch]
        );

        const schedule = scheduleResult.rows;

        if (schedule.length === 0) {
            return res.status(400).json({
                success: false,
                message: `${batch} is not scheduled today`
            });
        }

        /*
         * Get every student belonging to this batch.
         * LEFT JOIN means students without attendance
         * are also returned.
         */
        const studentsResult = await db.query(
            `
            SELECT
                s.id AS "studentId",
                s.roll_number AS "rollNumber",
                s.student_name AS "studentName",
                d.name AS department,

                COALESCE(
                    a.status,
                    'NOT_MARKED'
                ) AS status,

                a.faculty_college_id AS "facultyCollegeId",
                a.faculty_email AS "facultyEmail",
                a.marked_at AS "markedAt"

            FROM students s

            JOIN departments d
                ON s.department_id = d.id

            LEFT JOIN attendance a
                ON a.student_id = s.id
                AND a.attendance_batch = $1
                AND a.attendance_date = CURRENT_DATE

            WHERE s.attendance_batch = $2

            ORDER BY d.name, s.roll_number
            `,
            [batch, batch]
        );

        const students = studentsResult.rows;

        // Group students department-wise
        const departments = {};

        for (const student of students) {
            if (!departments[student.department]) {
                departments[student.department] = {
                    total: 0,
                    present: 0,
                    absent: 0,
                    notMarked: 0,
                    students: []
                };
            }

            const department =
                departments[student.department];

            department.total++;

            if (student.status === "PRESENT") {
                department.present++;
            } else if (student.status === "ABSENT") {
                department.absent++;
            } else {
                department.notMarked++;
            }

            department.students.push(student);
        }

        // Overall summary
        const summary = {
            total: students.length,
            present: students.filter(
                s => s.status === "PRESENT"
            ).length,
            absent: students.filter(
                s => s.status === "ABSENT"
            ).length,
            notMarked: students.filter(
                s => s.status === "NOT_MARKED"
            ).length
        };

        res.status(200).json({
            success: true,
            batch,
            date: new Date()
                .toISOString()
                .split("T")[0],
            schedule: schedule[0],
            summary,
            departments
        });

    } catch (error) {
        console.error(
            "Error generating attendance report:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to generate attendance report"
        });
    }
};

const getDepartmentTodayReport = async (req, res) => {
    try {
        const { department } = req.params;

        if (!department) {
            return res.status(400).json({
                success: false,
                message: "Department is required"
            });
        }

        /*
         * A student batch contains the class section:
         *
         * G2B1C1
         * G2B1C2
         * G2B1C3
         *
         * But attendance is taken for:
         *
         * G2B1
         *
         * Therefore we match the student's batch
         * against the attendance batch prefix.
         */

        const result = await db.query(
            `
            SELECT
                s.id AS "studentId",
                s.roll_number AS "rollNumber",
                s.student_name AS "studentName",
                d.name AS department,
                s.batch,

                SPLIT_PART(
                    s.batch,
                    'C',
                    1
                ) AS "attendanceBatch",

                COALESCE(
                    a.status,
                    'NOT_MARKED'
                ) AS status,

                a.marked_at AS "markedAt"

            FROM students s

            JOIN departments d
                ON s.department_id = d.id

            JOIN class_schedule cs
                ON s.batch LIKE cs.attendance_batch || '%'

                AND UPPER(cs.day_of_week) =
                    UPPER(TO_CHAR(CURRENT_DATE, 'FMDay'))

            LEFT JOIN attendance a
                ON a.student_id = s.id
                AND a.attendance_date = CURRENT_DATE

            WHERE d.name = $1

            ORDER BY
                cs.attendance_batch,
                s.batch,
                s.roll_number
            `,
            [department]
        );

        const students = result.rows;

        /*
         * Overall department summary
         */
        const summary = {
            total: students.length,
            present: 0,
            absent: 0,
            notMarked: 0
        };

        for (const student of students) {
            if (student.status === "PRESENT") {
                summary.present++;
            } else if (student.status === "ABSENT") {
                summary.absent++;
            } else {
                summary.notMarked++;
            }
        }

        /*
         * Group students by attendance batch.
         */
        const batches = {};

        for (const student of students) {
            const attendanceBatch =
                student.attendanceBatch;

            if (!batches[attendanceBatch]) {
                batches[attendanceBatch] = {
                    summary: {
                        total: 0,
                        present: 0,
                        absent: 0,
                        notMarked: 0
                    },
                    students: []
                };
            }

            const batch =
                batches[attendanceBatch];

            batch.summary.total++;

            if (student.status === "PRESENT") {
                batch.summary.present++;
            } else if (student.status === "ABSENT") {
                batch.summary.absent++;
            } else {
                batch.summary.notMarked++;
            }

            batch.students.push({
                studentId: student.studentId,
                rollNumber: student.rollNumber,
                studentName: student.studentName,
                department: student.department,
                batch: student.batch,
                attendanceBatch: attendanceBatch,
                status: student.status,
                markedAt: student.markedAt
            });
        }

        res.status(200).json({
            success: true,
            department,
            date: new Date()
                .toISOString()
                .split("T")[0],
            summary,
            batches
        });

    } catch (error) {
        console.error(
            "Error generating department report:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to generate department attendance report"
        });
    }
};

module.exports = {
    getDepartments,
    getStudentsByDepartment,
    markAttendance,
    getTodayAttendance,
    getTodayStudentsByBatch,
    getBatchStatusToday,
    getStudentTodayAttendance,

    createCorrectionRequest,
    getCorrectionRequests,
    approveCorrectionRequest,
    rejectCorrectionRequest,

    getTodayAttendanceReport,
    getDepartmentTodayReport
};