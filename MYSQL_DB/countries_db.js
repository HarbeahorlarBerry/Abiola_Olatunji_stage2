import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    // Railway requires SSL for external connections — this line ensures compatibility
    rejectUnauthorized: false
  }
});

export default pool;


