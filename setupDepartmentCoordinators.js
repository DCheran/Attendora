const bcrypt = require("bcrypt");
const db = require("./config/db");

const coordinators = [
    {
        collegeId: "CSE_COORD_01",
        name: "Nihar",
        email: "uppalanihar@gmail.com",
        whatsappNumber:"918897971424",
        department: "CSE",
        password: "CSE@123"
    },
    {
        collegeId: "CSD_COORD_01",
        name: "M. Bhavana",
        email: "dcheran3@gmail.com",
        whatsappNumber:"919849157312",
        department: "CSD",
        password: "CSD@123"
    },
    {
        collegeId: "ECE_COORD_01",
        name: "Sahithi",
        email: "sahithiathuluri520@gmail.com",
        whatsappNumber:"917780109297",
        department: "ECE",
        password: "ECE@123"
    },
    {
        collegeId: "EEE_COORD_01",
        name: "Shanthi",
        email: "komma1409@gmail.com",
        whatsappNumber:"919490806167",
        department: "EEE",
        password: "EEE@123"
    },
    {
        collegeId: "CSM_COORD_01",
        name: "Charan",
        email: "cherand931@gmail.com",
        whatsappNumber:"918106834446",
        department: "CSM",
        password: "CSM@123"
    },
    {
        collegeId: "IT_COORD_01",
        name: "Maaz",
        email: "dsukanyasukanya546@gmail.com",
        whatsappNumber:"917993572972",
        department: "IT",
        password: "IT@123"
    },
    {
        collegeId: "MECH_COORD_01",
        name: "Cheran",
        email: "dcheran43@gmail.com",
        whatsappNumber:"917993572972",
        department: "Mech",
        password: "MECH@123"
    }
];

async function setup() {
    try {
        for (const coordinator of coordinators) {

            const [departments] = await db.execute(
                `SELECT id FROM departments WHERE name = ?`,
                [coordinator.department]
            );

            if (departments.length === 0) {
                console.log(
                    `Department not found: ${coordinator.department}`
                );
                continue;
            }

            const departmentId = departments[0].id;

            const passwordHash = await bcrypt.hash(
                coordinator.password,
                10
            );

            await db.execute(
                `
                INSERT INTO department_coordinators
                (
                    college_id,
                    name,
                    email,
                    department_id,
                    password_hash,
                    whatsapp_number
                )
                VALUES (?, ?, ?, ?, ?, ?)

                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    email = VALUES(email),
                    department_id = VALUES(department_id),
                    password_hash = VALUES(password_hash),
                    whatsapp_number = VALUES(whatsapp_number)
                `,
                [
                    coordinator.collegeId,
                    coordinator.name,
                    coordinator.email,
                    departmentId,
                    passwordHash,
                    coordinator.whatsappNumber
                ]
            );

            console.log(
                `Configured coordinator for ${coordinator.department}`
            );
        }

        console.log(
            "All department coordinators configured."
        );

    } catch (error) {
        console.error(
            "Error configuring coordinators:",
            error
        );
    } finally {
        process.exit();
    }
}

setup();