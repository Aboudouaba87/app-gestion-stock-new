// test-db.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // if your DB requires SSL (e.g., Heroku), uncomment:
  // ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    const res = await pool.query("SELECT id, name FROM warehouses LIMIT 5");
    console.log("DB OK, sample rows:", res.rows);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("DB connection error:", err);
    await pool.end().catch(() => {});
    process.exit(1);
  }
})();
