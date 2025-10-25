import pool from "./MYSQL_DB/countries_db.js";

(async () => {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS total FROM countries");
    console.log("✅ Database connected! Total countries:", rows[0].total);
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
})();

