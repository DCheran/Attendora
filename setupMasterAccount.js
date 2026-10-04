const bcrypt = require("bcrypt");
const db = require("./config/db");

// Change these values before running this script in your environment.
const MASTER = {
    username: process.env.MASTER_USERNAME || "PAT",
    password: process.env.MASTER_PASSWORD || "Pat@123",
    name: process.env.MASTER_NAME || "Attendora Master",
    email: process.env.MASTER_EMAIL || null
};

async function setup() {
    try {
        if (MASTER.password === "PAT@123") {
            throw new Error("Set MASTER_PASSWORD in .env before running setupMasterAccount.js");
        }

        const passwordHash = await bcrypt.hash(MASTER.password, 10);

        await db.execute(
            `INSERT INTO master_credentials (username, password_hash, name, email, is_active)
             VALUES (?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE
                 password_hash = VALUES(password_hash),
                 name = VALUES(name),
                 email = VALUES(email),
                 is_active = 1`,
            [MASTER.username, passwordHash, MASTER.name, MASTER.email]
        );

        console.log(`Master account configured: ${MASTER.username}`);
    } catch (error) {
        console.error("Master account setup failed:", error.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

setup();
