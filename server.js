import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import countriesRouter from "./Routes/countriesRouter.js";
import { sequelize } from "./Models/index.js"; // ✅ Ensure DB connection on start

dotenv.config();

const app = express();
const PORT = process.env.PORT || 6000;

// __dirname setup for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(morgan("dev"));

// Ensure cache folder exists (for image generation)
const cacheDir = path.join(__dirname, "cache");
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir);
}

// ✅ Routes
app.use("/countries", countriesRouter);

// ✅ Status route (points correctly to controller)
app.get("/status", async (req, res) => {
  try {
    const { getStatus } = await import("./Controllers/CountriesApis/countriesController.js");
    await getStatus(req, res);
  } catch (error) {
    console.error("❌ Status route error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ Root route
app.get("/", (req, res) => {
  res.json({ message: "Country Currency & Exchange API. See /countries" });
});

// ✅ 404 handler
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack || err);
  res.status(500).json({ error: "Internal server error" });
});

// ✅ Start server with Sequelize DB sync
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully.");

    await sequelize.sync(); // Sync models if not existing
    console.log("✅ Models synchronized.");

    app.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

startServer();
