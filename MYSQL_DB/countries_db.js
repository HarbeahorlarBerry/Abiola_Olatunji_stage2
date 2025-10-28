import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    // Railway requires SSL for external connections — this line ensures compatibility
    rejectUnauthorized: false
  }
});

export default pool;


