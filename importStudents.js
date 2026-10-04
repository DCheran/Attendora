const XLSX = require("xlsx");
const db = require("./config/pgdb");

const filePath = "./students.xlsx";

async function importStudents() {
    try {
        // Read Excel file
        const workbook = XLSX.readFile(filePath);

        // Use B.Tech sheet
        const sheet = workbook.Sheets["B.Tech"];

        if (!sheet) {
            throw new Error("B.Tech sheet not found in Excel file");
        }

        const students = XLSX.utils.sheet_to_json(sheet);

        if (students.length === 0) {
            throw new Error("No student records found in the Excel sheet");
        }

        console.log("Excel columns:");
        console.log(Object.keys(students[0]));

        console.log("First student:");
        console.log(students[0]);

        console.log(`Found ${students.length} students in Excel.`);

        let imported = 0;
        let skipped = 0;

        for (const student of students) {

            const rollNumber = String(
                student["Roll Number"] || ""
            ).trim();

            const studentName = String(
                student["Student Name "] || ""
            ).trim();

            const branch = String(
                student["Branch"] || ""
            ).trim();

            const batch = String(
                student["Batch"] || ""
            ).trim();

            // Skip incomplete rows
            if (!rollNumber || !studentName || !branch) {
                skipped++;
                continue;
            }

            // Find department
            const departmentResult = await db.query(
                "SELECT id FROM departments WHERE name = $1",
                [branch]
            );

            let departmentId;

            if (departmentResult.rows.length > 0) {
                departmentId = departmentResult.rows[0].id;
            } else {
                // Create department automatically
                const insertDepartmentResult = await db.query(
                    "INSERT INTO departments (name) VALUES ($1) RETURNING id",
                    [branch]
                );

                departmentId = insertDepartmentResult.rows[0].id;

                console.log(`Created department: ${branch}`);
            }

            // Insert student
            try {
                await db.query(
                    `
                    INSERT INTO students
                    (
                        roll_number,
                        student_name,
                        department_id,
                        batch
                    )
                    VALUES ($1, $2, $3, $4)
                    `,
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
                if (error.code === "23505") {
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
        await db.end();
    }
}

importStudents();