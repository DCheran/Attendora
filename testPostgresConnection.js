require("dotenv").config();

const mysql = require("mysql2/promise");
const { Client } = require("pg");

async function testConnections() {
    let mysqlConnection;
    let pgClient;

    try {
        // -----------------------------
        // Test MySQL
        // -----------------------------
        mysqlConnection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [mysqlResult] = await mysqlConnection.query(
            "SELECT 1 AS connected"
        );

        console.log("✅ MySQL connection successful:", mysqlResult);

        // -----------------------------
        // Test PostgreSQL / Supabase
        // -----------------------------
        pgClient = new Client({
            host: process.env.PG_HOST,
            port: Number(process.env.PG_PORT || 5432),
            database: process.env.PG_DATABASE,
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
            ssl: {
                rejectUnauthorized: false
            }
        });

        await pgClient.connect();

        const pgResult = await pgClient.query(
            "SELECT 1 AS connected"
        );

        console.log("✅ PostgreSQL connection successful:", pgResult.rows);

    } catch (error) {
        console.error("❌ Connection test failed:");
        console.error(error.message);
    } finally {
        if (mysqlConnection) {
            await mysqlConnection.end();
        }

        if (pgClient) {
            await pgClient.end();
        }
    }
}

testConnections();