require("dotenv").config();

const mysql = require("mysql2/promise");
const { Client } = require("pg");

const mysqlConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

const pgConfig = {
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT || 5432),
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    }
};

const tables = [
    "departments",
    "students",
    "class_schedule",
    "batch_credentials",
    "master_credentials",
    "department_coordinators",
    "attendance",
    "attendance_corrections"
];

async function migrate() {
    let mysqlConnection;
    let pgClient;

    try {
        console.log("========================================");
        console.log("Attendora MySQL → PostgreSQL Migration");
        console.log("========================================");

        // -----------------------------------------
        // Connect to MySQL
        // -----------------------------------------
        console.log("\nConnecting to MySQL...");

        mysqlConnection = await mysql.createConnection(mysqlConfig);

        console.log("✅ MySQL connected");

        // -----------------------------------------
        // Connect to PostgreSQL
        // -----------------------------------------
        console.log("Connecting to PostgreSQL...");

        pgClient = new Client(pgConfig);

        await pgClient.connect();

        console.log("✅ PostgreSQL connected");

        // -----------------------------------------
        // Begin PostgreSQL transaction
        // -----------------------------------------
        await pgClient.query("BEGIN");

        console.log("\nStarting migration...\n");

        const migrationCounts = {};

        // -----------------------------------------
        // Disable triggers temporarily
        // -----------------------------------------
        // We insert tables in dependency order,
        // so foreign keys should normally work.
        // We do NOT disable constraints globally.
        // -----------------------------------------

        for (const table of tables) {
            console.log(`Migrating ${table}...`);

            const [rows] = await mysqlConnection.query(
                `SELECT * FROM \`${table}\``
            );

            if (rows.length === 0) {
                console.log(`   ℹ️ ${table}: 0 rows`);
                migrationCounts[table] = 0;
                continue;
            }

            const columns = Object.keys(rows[0]);

            const columnList = columns
                .map((column) => `"${column}"`)
                .join(", ");

            const placeholders = columns
                .map((_, index) => `$${index + 1}`)
                .join(", ");

            const insertQuery = `
                INSERT INTO "${table}" (${columnList})
                VALUES (${placeholders})
            `;

            for (const row of rows) {
                const values = columns.map((column) => row[column]);

                await pgClient.query(insertQuery, values);
            }

            migrationCounts[table] = rows.length;

            console.log(`   ✅ ${table}: ${rows.length} rows`);
        }

        // -----------------------------------------
        // Reset PostgreSQL identity sequences
        // -----------------------------------------
        console.log("\nUpdating identity sequences...");

        const identityTables = [
            "departments",
            "students",
            "class_schedule",
            "batch_credentials",
            "master_credentials",
            "department_coordinators",
            "attendance",
            "attendance_corrections"
        ];

        for (const table of identityTables) {
            const result = await pgClient.query(`
                SELECT COALESCE(MAX(id), 0) + 1 AS next_id
                FROM "${table}"
            `);

            const nextId = Number(result.rows[0].next_id);

            await pgClient.query(`
                ALTER TABLE "${table}"
                ALTER COLUMN id
                RESTART WITH ${nextId}
            `);
        }

        console.log("✅ Identity sequences updated");

        // -----------------------------------------
        // Commit transaction
        // -----------------------------------------
        await pgClient.query("COMMIT");

        console.log("\n========================================");
        console.log("Migration completed successfully!");
        console.log("========================================");

        console.log("\nMigrated rows:");

        for (const [table, count] of Object.entries(migrationCounts)) {
            console.log(`   ${table}: ${count}`);
        }

        console.log("\n⚠️ MySQL database was NOT modified.");
        console.log("It remains available as your backup.");

    } catch (error) {
        console.error("\n❌ Migration failed:");
        console.error(error.message);

        if (pgClient) {
            try {
                await pgClient.query("ROLLBACK");
                console.log("\n↩️ PostgreSQL transaction rolled back.");
            } catch (rollbackError) {
                console.error(
                    "Rollback error:",
                    rollbackError.message
                );
            }
        }

        console.log("\n⚠️ MySQL database was NOT modified.");

        process.exitCode = 1;

    } finally {
        if (mysqlConnection) {
            await mysqlConnection.end();
        }

        if (pgClient) {
            await pgClient.end();
        }
    }
}

migrate();