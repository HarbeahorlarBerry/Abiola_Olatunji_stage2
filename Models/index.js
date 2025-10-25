import { Sequelize } from "sequelize";
import CountryModel from "./country.js";
import dotenv from "dotenv";
dotenv.config();

const sequelize = new Sequelize(process.env.MYSQL_DB, process.env.MYSQL_USER, process.env.MYSQL_PASSWORD, {
  host: process.env.MYSQL_HOST,
  dialect: "mysql",
  logging: false,
});

const Country = CountryModel(sequelize);

export { sequelize, Country };
