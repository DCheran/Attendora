const XLSX = require("xlsx");
const mysql = require("mysql2/promise");

const filePath = "./students.xlsx";

async function importStudents() {
    let connection;

    try {
        // Read Excel file
        const workbook = XLSX.readFile(filePath);

        // Use B.Tech sheet
        const sheet = workbook.Sheets["B.Tech"];

        if (!sheet) {
            throw new Error("B.Tech sheet not found in Excel file");
        }

        const students = XLSX.utils.sheet_to_json(sheet);

        console.log("Excel columns:");
        console.log(Object.keys(students[0]));

        console.log("First student:");
        console.log(students[0]);

        console.log(`Found ${students.length} students in Excel.`);

        // MySQL connection
        connection = await mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "Admin@123",
            database: "eventiqa_attendance"
        });

        console.log("Connected to MySQL.");

        let imported = 0;
        let skipped = 0;

        for (const student of students) {

            const rollNumber = String(student["Roll Number"] || "").trim();
            const studentName = String(student["Student Name "] || "").trim();
            const branch = String(student["Branch"] || "").trim();
            const batch = String(student["Batch"] || "").trim();

            // Skip incomplete rows
            if (!rollNumber || !studentName || !branch) {
                skipped++;
                continue;
            }

            // Find department
            const [departmentRows] = await connection.execute(
                "SELECT id FROM departments WHERE name = ?",
                [branch]
            );

            let departmentId;

            if (departmentRows.length > 0) {
                departmentId = departmentRows[0].id;
            } else {
                // Create department automatically
                const [result] = await connection.execute(
                    "INSERT INTO departments (name) VALUES (?)",
                    [branch]
                );

                departmentId = result.insertId;

                console.log(`Created department: ${branch}`);
            }

            // Insert student
            try {
                await connection.execute(
                    `INSERT INTO students
                    (roll_number, student_name, department_id, batch)
                    VALUES (?, ?, ?, ?)`,
                    [
                        rollNumber,
                        studentName,
                        departmentId,
                        batch
                    ]
                );

                imported++;

            } catch (error) {

                // Duplicate roll number
                if (error.code === "ER_DUP_ENTRY") {
                    skipped++;
                    console.log(
                        `Skipped duplicate: ${rollNumber} - ${studentName}`
                    );
                } else {
                    throw error;
                }
            }
        }

        console.log("--------------------------------");
        console.log("Import completed!");
        console.log(`Imported : ${imported}`);
        console.log(`Skipped  : ${skipped}`);
        console.log("--------------------------------");

    } catch (error) {
        console.error("Import failed:");
        console.error(error.message);

    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

importStudents();