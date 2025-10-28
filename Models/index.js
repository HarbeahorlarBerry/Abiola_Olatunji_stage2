import { Sequelize } from "sequelize";
import CountryModel from "./country.js";
import dotenv from "dotenv";
dotenv.config();




const sequelize = new Sequelize(
  process.env.MYSQLDATABASE,   
  process.env.MYSQLUSER,   
  process.env.MYSQLPASSWORD,
  {
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT,
    dialect: 'mysql',
    dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
},
    logging: false
  }
);

// ✅ Initialize Sequelize connection
// const sequelize = new Sequelize(
//   process.env.MYSQL_DB,
//   process.env.MYSQL_USER,
//   process.env.MYSQL_PASSWORD,
//   {
//     host: process.env.MYSQL_HOST || "localhost",
//     dialect: "mysql",
//     dialectOptions: {
//       ssl: {
//         require: true,
//         rejectUnauthorized: true
//       }
//     },
//     logging: false,
//   }
// );


// ✅ Initialize models
const Country = CountryModel(sequelize);

// ✅ Sync models only if needed
// (you can also handle this elsewhere in server.js)
async function initDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully.");
    await sequelize.sync(); // or { alter: true } during dev
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
}

// Run connection check
initDB();

// ✅ Export initialized Sequelize instance and models
export { sequelize, Country };

