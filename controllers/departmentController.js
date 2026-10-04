const db = require("../config/pgdb");

const getDepartmentToday = async (req, res) => {
    try {
        const department = req.coordinator.department;

        console.log("Department:", department);

        if (!department) {
            return res.status(400).json({
                success: false,
                message: "Department not found in login token"
            });
        }

        const result = await db.query(
            `
            SELECT
                s.id AS "studentId",
                s.roll_number AS "rollNumber",
                s.student_name AS "studentName",
                d.name AS department,
                s.batch,
                SPLIT_PART(s.batch, 'C', 1) AS "attendanceBatch",
                COALESCE(a.status, 'NOT_MARKED') AS status,
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

        const rows = result.rows;

        const summary = {
            total: rows.length,
            present: 0,
            absent: 0,
            notMarked: 0
        };

        const batches = {};

        for (const student of rows) {

            if (student.status === "PRESENT") {
                summary.present++;
            } else if (student.status === "ABSENT") {
                summary.absent++;
            } else {
                summary.notMarked++;
            }

            const batch = student.attendanceBatch;

            if (!batches[batch]) {
                batches[batch] = {
                    total: 0,
                    present: 0,
                    absent: 0,
                    notMarked: 0,
                    students: []
                };
            }

            batches[batch].total++;

            if (student.status === "PRESENT") {
                batches[batch].present++;
            } else if (student.status === "ABSENT") {
                batches[batch].absent++;
            } else {
                batches[batch].notMarked++;
            }

            batches[batch].students.push({
                studentId: student.studentId,
                rollNumber: student.rollNumber,
                studentName: student.studentName,
                batch: student.batch,
                attendanceBatch: student.attendanceBatch,
                status: student.status,
                markedAt: student.markedAt
            });
        }

        res.json({
            success: true,
            department,
            date: new Date().toISOString().split("T")[0],
            summary,
            batches
        });

    } catch (error) {
        console.error(
            "Department dashboard error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load department attendance"
        });
    }
};

module.exports = {
    getDepartmentToday
};