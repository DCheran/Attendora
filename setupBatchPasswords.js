const bcrypt = require("bcrypt");
const db = require("./config/pgdb");

const batches = [
  "G1B1",
  "G1B2",
  "G1B3",
  "G1B4",
  "G2B1",
  "G2B2",
  "G2B3",
  "G2B4",
  "G3B1",
  "G3B2"
];

async function setup() {
  try {
    for (const batch of batches) {
      const password = `${batch}@123`;

      const passwordHash = await bcrypt.hash(password, 10);

      await db.query(
        `INSERT INTO batch_credentials (batch, password_hash)
         VALUES ($1, $2)
         ON CONFLICT (batch)
         DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [batch, passwordHash]
      );

      console.log(`Password configured for ${batch}`);
    }

    console.log("All batch passwords configured.");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

setup();