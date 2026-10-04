const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const db = require("../config/pgdb");
const { sendDepartmentReport } = require("../controllers/emailController");

function getDayOfWeek(dateString) {
    const date = new Date(`${dateString}T00:00:00`);

    const days = [
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY"
    ];

    return days[date.getDay()];
}

const generateDepartmentReport = async (
    department,
    attendanceDate
) => {
    try {
        const dayOfWeek = getDayOfWeek(attendanceDate);

        console.log(
            `Generating ${department} report for ${attendanceDate} (${dayOfWeek})`
        );

        /*
         * 1. Get department
         */
        const departmentResult = await db.query(
            `
            SELECT id, name
            FROM departments
            WHERE name = $1
            `,
            [department]
        );

        const departments = departmentResult.rows;

        if (departments.length === 0) {
            throw new Error(
                `Department not found: ${department}`
            );
        }

        const departmentId = departments[0].id;

        /*
         * 2. Get ONLY batches that have class today
         */
        const scheduledBatchesResult = await db.query(
            `
            SELECT
                attendance_batch,
                group_name,
                batch_name,
                day_of_week
            FROM class_schedule
            WHERE day_of_week = $1
            ORDER BY attendance_batch
            `,
            [dayOfWeek]
        );

        const scheduledBatches = scheduledBatchesResult.rows;

        if (scheduledBatches.length === 0) {
            throw new Error(
                `No classes scheduled for ${dayOfWeek}`
            );
        }

        const attendanceBatches =
            scheduledBatches.map(
                row => row.attendance_batch
            );

        console.log(
            "Today's batches:",
            attendanceBatches
        );

        /*
         * 3. Get ONLY students from today's batches
         *    and the requested department
         */
        const batchConditions = attendanceBatches
            .map((_, index) => `s.batch LIKE $${index + 3} || '%'`)
            .join(" OR ");

        const studentParams = [
            attendanceDate,
            departmentId,
            ...attendanceBatches
        ];

        const studentsResult = await db.query(
            `
            SELECT
                s.id AS student_id,
                s.roll_number,
                s.student_name,
                s.batch,
                a.status,
                a.marked_at
            FROM students s
            LEFT JOIN attendance a
                ON a.student_id = s.id
                AND a.attendance_date = $1
            WHERE s.department_id = $2
            AND (${batchConditions})
            `,
            studentParams
        );

        const students = studentsResult.rows;

        // Sort students:
        // 1. Batch-wise according to today's scheduled batch order
        // 2. Roll number-wise within each batch

        const batchOrder = new Map(
            attendanceBatches.map((batch, index) => [batch, index])
        );

        const getRollSortKey = (rollNumber) => {
            const roll = String(rollNumber).trim().toUpperCase();

            // Put digits before letters.
            // 0-9 -> 0-9
            // A-Z -> 10-35
            return [...roll].map(char => {
                if (char >= "0" && char <= "9") {
                    return char.charCodeAt(0) - "0".charCodeAt(0);
                }

                if (char >= "A" && char <= "Z") {
                    return char.charCodeAt(0) - "A".charCodeAt(0) + 10;
                }

                return 99;
            });
        };

        const compareRollNumbers = (a, b) => {
            const keyA = getRollSortKey(a);
            const keyB = getRollSortKey(b);

            const length = Math.max(keyA.length, keyB.length);

            for (let i = 0; i < length; i++) {
                const valueA = keyA[i] ?? -1;
                const valueB = keyB[i] ?? -1;

                if (valueA !== valueB) {
                    return valueA - valueB;
                }
            }

            return 0;
        };

        students.sort((a, b) => {
            // First compare batches
            const batchA = batchOrder.get(a.batch) ?? 999;
            const batchB = batchOrder.get(b.batch) ?? 999;

            if (batchA !== batchB) {
                return batchA - batchB;
            }

            return compareRollNumbers(
                a.roll_number,
                b.roll_number
            );
        });

        /*
         * 4. Summary
         */
        const total = students.length;

        const present = students.filter(
            student =>
                student.status === "PRESENT"
        ).length;

        const absent = students.filter(
            student =>
                student.status === "ABSENT"
        ).length;


        /*
         * 5. Group students by attendance batch
         */
        const studentsByBatch = {};

        for (const student of students) {

            const attendanceBatch =
                attendanceBatches.find(
                    batch => student.batch.startsWith(batch)
                );

            if (!attendanceBatch) {
                continue;
            }

            if (!studentsByBatch[attendanceBatch]) {
                studentsByBatch[attendanceBatch] = [];
            }

            studentsByBatch[attendanceBatch].push(student);
        }

        /*
         * 6. Create reports directory
         */
        const reportsDir = path.join(
            __dirname,
            "..",
            "reports"
        );

        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, {
                recursive: true
            });
        }

        const fileName =
            `${department}_Attendance_Report_${attendanceDate}.pdf`;

        const filePath = path.join(
            reportsDir,
            fileName
        );

        /*
         * 7. Create PDF
         */
        const doc = new PDFDocument({
            size: "A4",
            margin: 40
        });

        const stream =
            fs.createWriteStream(filePath);

        doc.pipe(stream);

        /*
        * Header
        */
        doc
            .font("Helvetica-Bold")
            .fontSize(20)
            .text("ATTENDORA", {
                align: "center"
            });

        doc
            .fontSize(15)
            .text("ATTENDANCE REPORT", {
                align: "center"
            });

        doc.moveDown();

        doc
            .font("Helvetica")
            .fontSize(11)
            .text(`Department : ${department}`)
            .text(`Date       : ${attendanceDate}`)
            .text(`Day        : ${dayOfWeek}`);

        doc.moveDown();

        /*
        * Today's scheduled batches
        */
        doc
            .font("Helvetica-Bold")
            .fontSize(13)
            .text("TODAY'S SCHEDULED BATCHES");

        doc.moveDown(0.5);

        doc
            .font("Helvetica")
            .fontSize(10)
            .text(
                attendanceBatches.join("   ")
            );

        doc.moveDown();

        /*
        * Overall summary
        */
        doc
            .font("Helvetica-Bold")
            .fontSize(13)
            .text("ATTENDANCE SUMMARY");

        doc.moveDown(0.5);

        doc
            .font("Helvetica")
            .fontSize(10)
            .text(`Total Students : ${total}`)
            .text(`Present        : ${present}`)
            .text(`Absent         : ${absent}`);

        doc.moveDown();

        /*
        * Batch-wise report
        */
        doc
            .fontSize(14)
            .fillColor("black")
            .text("BATCH-WISE ATTENDANCE", 40);

        doc.moveDown();

        for (const schedule of scheduledBatches) {

            const batch = schedule.attendance_batch;

            let batchStudents =
                studentsByBatch[batch] || [];

            /*
            * Don't print a batch if there are
            * no students from this department.
            */
            if (batchStudents.length === 0) {
                continue;
            }

            /*
            * IMPORTANT:
            * Make sure every batch starts from
            * the left side of the page.
            */
            doc.x = 40;


            /*
            * Every batch should start from the left.
            *
            * If there isn't enough space for the batch
            * heading + table header + at least one row,
            * start a new page.
            */
            if (doc.y > 650) {
                doc.addPage();
                doc.x = 40;
                doc.y = 40;
            }

            /*
            * Batch heading
            */
            doc
                .fontSize(13)
                .fillColor("black")
                .text(batch, 40);

            doc.moveDown(0.2);

            /*
            * Treat NOT_MARKED as PRESENT
            */
            const batchPresent =
                batchStudents.filter(
                    student =>
                        !student.status ||
                        student.status === "PRESENT"
                ).length;

            const batchAbsent =
                batchStudents.filter(
                    student =>
                        student.status === "ABSENT"
                ).length;

            doc
                .fontSize(9)
                .fillColor("black")
                .text(
                    `Total: ${batchStudents.length} | ` +
                    `Present: ${batchPresent} | ` +
                    `Absent: ${batchAbsent}`,
                    40
                );

            doc.moveDown(0.5);

            /*
            * Table header positions
            */
            const colSno = 40;
            const colRoll = 95;
            const colName = 210;
            const colStatus = 500;

            /*
            * Table header
            */
            const headerY = doc.y;

            doc
                .fontSize(8)
                .fillColor("black")
                .text("S.No", colSno, headerY, {
                    lineBreak: false
                });

            doc
                .text("Roll Number", colRoll, headerY, {
                    lineBreak: false
                });

            doc
                .text("Student Name", colName, headerY, {
                    lineBreak: false
                });

            doc
                .text("Status", colStatus, headerY, {
                    lineBreak: false
                });

            /*
            * Move below header only once
            */
            doc.y = headerY + 15;

            /*
            * Header separator
            */
            doc
                .moveTo(40, doc.y)
                .lineTo(555, doc.y)
                .stroke();

            doc.y += 5;


            let serial = 1;

            for (const student of batchStudents) {

                /*
                * NOT_MARKED becomes PRESENT
                */
                const status =
                    student.status || "PRESENT";

                /*
                * Check if there is enough room
                * for the next row.
                *
                * No EVENTIQA header is added here.
                */
                if (doc.y > 750) {

                doc.addPage();

                doc.x = 40;
                doc.y = 40;

                const headerY = doc.y;

                doc
                    .fontSize(8)
                    .fillColor("black")
                    .text("S.No", colSno, headerY, {
                        lineBreak: false
                    });

                doc
                    .text("Roll Number", colRoll, headerY, {
                        lineBreak: false
                    });

                doc
                    .text("Student Name", colName, headerY, {
                        lineBreak: false
                    });

                doc
                    .text("Status", colStatus, headerY, {
                        lineBreak: false
                    });

                doc.y = headerY + 15;

                doc
                    .moveTo(40, doc.y)
                    .lineTo(555, doc.y)
                    .stroke();

                doc.y += 5;
            }

                const rowY = doc.y;

                /*
                * S.No
                */
                doc
                    .fontSize(8)
                    .fillColor("black")
                    .text(
                        String(serial),
                        colSno,
                        rowY
                    );

                /*
                * Roll number
                */
                doc
                    .text(
                        String(student.roll_number || ""),
                        colRoll,
                        rowY
                    );

                /*
                * Student name
                */
                doc
                    .text(
                        String(student.student_name || "")
                            .substring(0, 38),
                        colName,
                        rowY
                    );

                    /*
                    * Status
                    * PRESENT = green
                    * ABSENT  = red
                    */
                    doc
                        .fontSize(8);

                    if (status === "PRESENT") {

                        doc
                            .fillColor("#008000")
                            .text(
                                "PRESENT",
                                colStatus,
                                rowY,
                                {
                                    width: 70,
                                    lineBreak: false
                                }
                            );

                    } else if (status === "ABSENT") {

                        doc
                            .fillColor("#FF0000")
                            .text(
                                "ABSENT",
                                colStatus,
                                rowY,
                                {
                                    width: 70,
                                    lineBreak: false
                                }
                            );

                    } else {

                        doc
                            .fillColor("black")
                            .text(
                                status,
                                colStatus,
                                rowY,
                                {
                                    width: 70,
                                    lineBreak: false
                                }
                            );
                    }


                /*
                * Reset color for next row
                */
                doc.fillColor("black");

                /*
                * Move down to next row
                */
                doc.y = rowY + 15;

                serial++;
            }

            /*
            * Space before next batch
            */
            doc.y += 10;

            /*
            * IMPORTANT:
            * Reset X position so next batch can NEVER
            * start beside the previous batch.
            */
            doc.x = 40;
        }

        doc.end();
        /*
         * Wait for PDF to finish
         */
        return new Promise(
            (resolve, reject) => {

                stream.on("finish", async () => {

                    try {
                        const emailResult = await sendDepartmentReport({
                            department,
                            attendanceDate,
                            filePath
                        });

                        console.log(
                            `Attendance report sent to ${emailResult.email}`
                        );

                        resolve({
                            success: true,
                            department,
                            attendanceDate,
                            dayOfWeek,
                            scheduledBatches: attendanceBatches,
                            fileName,
                            filePath,

                            emailSent: true,
                            emailSentTo: emailResult.email,

                            summary: {
                                total,
                                present,
                                absent
                            }
                        });

                    } catch (emailError) {
                        console.error(
                            "PDF generated but email sending failed:",
                            emailError
                        );

                        resolve({
                            success: true,
                            department,
                            attendanceDate,
                            dayOfWeek,
                            scheduledBatches: attendanceBatches,
                            fileName,
                            filePath,

                            emailSent: false,
                            emailError: emailError.message,

                            summary: {
                                total,
                                present,
                                absent
                            }
                        });
                    }
                });

                stream.on(
                    "error",
                    reject
                );
            }
        );

    } catch (error) {

        console.error(
            "Report generation error:",
            error
        );

        throw error;
    }
};

module.exports = {
    generateDepartmentReport
};