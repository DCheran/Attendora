const transporter = require("../config/mailer");
const db = require("../config/pgdb");

const sendDepartmentReport = async ({
    department,
    attendanceDate,
    filePath
}) => {

    const result = await db.query(
        `
        SELECT
            dc.name,
            dc.email
        FROM department_coordinators dc
        JOIN departments d
            ON dc.department_id = d.id
        WHERE d.name = $1
        `,
        [department]
    );

    const rows = result.rows;

    if (rows.length === 0) {
        throw new Error(
            `No coordinator found for department ${department}`
        );
    }

    const coordinator = rows[0];

    if (!coordinator.email) {
        throw new Error(
            `No email configured for ${department} coordinator`
        );
    }

    await transporter.sendMail({
        from: `"Attendora Attendance" <${process.env.MAIL_USER}>`,
        to: coordinator.email,
        subject: `${department} Attendance Report - ${attendanceDate}`,
        text:
`Dear ${coordinator.name},

Please find attached the attendance report for ${department} for ${attendanceDate}.

Regards,
Attendora Attendance System`,
        attachments: [
            {
                filename: `${department}_Attendance_Report_${attendanceDate}.pdf`,
                path: filePath
            }
        ]
    });

    return {
        department,
        email: coordinator.email
    };
};

module.exports = {
    sendDepartmentReport
};