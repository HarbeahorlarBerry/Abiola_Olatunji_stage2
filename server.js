import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import countriesRouter from "./Routes/countriesRouter.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 6000;

app.use(express.json());
app.use(morgan("tiny"));

// routes
app.use("/countries", countriesRouter);

// status route (global)
app.get("/status", async (req, res) => {
  try {
    // delegate to router controller by requiring the controller
    const { getStatus } = await import("./Controllers/CountriesApis/countriesController.js");
    await getStatus(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// root
app.get("/", (req, res) => {
  res.json({ message: "Country Currency & Exchange API. See /countries" });
});

// Global 404
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack || err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
