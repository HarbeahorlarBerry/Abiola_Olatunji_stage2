import pool from "../../MYSQL_DB/countries_db.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import { generateSummaryImage } from "../../Utils/imageGenerator.js";
const COUNTRIES_API = process.env.EXTERNAL_COUNTRIES_API;
const RATES_API = process.env.EXTERNAL_EXCHANGE_API;
const TIMEOUT = Number(process.env.REFRESH_TIMEOUT_MS || 15000);
const CACHE_DIR = process.env.CACHE_DIR || "./cache";
const SUMMARY_PATH = path.join(CACHE_DIR, "summary.png");
const BATCH_SIZE = 50; // Insert 50 countries at a time
function randMultiplier() {
  return Math.floor(Math.random() * 1001) + 1000;
}
export async function refreshCountries(req, res) {
  let countriesData, ratesData;
  try {
    const [countriesResp, ratesResp] = await Promise.all([
      axios.get(COUNTRIES_API, { timeout: TIMEOUT }),
      axios.get(RATES_API, { timeout: TIMEOUT }),
    ]);
    countriesData = countriesResp.data;
    ratesData = ratesResp.data;
  } catch (err) {
    console.error("External fetch error:", err.message);
    return res.status(503).json({
      error: "External data source unavailable",
      details: err.message,
    });
  }
  const rates = ratesData?.rates || {};
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  try {
    // Process all countries into batch data first (no DB calls)
    const batchValues = [];
    const now = new Date();
    for (const c of countriesData) {
      const name = c.name || c.name?.common || null;
      if (!name) continue;
      const capital = Array.isArray(c.capital) ? c.capital[0] : c.capital || null;
      const region = c.region || null;
      const population = Number(c.population || 0);
      const flag_url = c.flags?.png || c.flag || null;
      let currency_code = null;
      if (Array.isArray(c.currencies)) {
        currency_code = c.currencies[0]?.code || null;
      } else if (c.currencies && typeof c.currencies === "object") {
        const firstKey = Object.keys(c.currencies)[0];
        currency_code = c.currencies[firstKey]?.code || firstKey || null;
      }
      let exchange_rate = null;
      let estimated_gdp = null;
      if (currency_code) {
        const codeUpper = currency_code.toUpperCase();
        const foundRate = rates[codeUpper];
        if (typeof foundRate === "number") {
          exchange_rate = foundRate;
          const m = randMultiplier();
          estimated_gdp = exchange_rate === 0 ? 0 : (population * m) / exchange_rate;
        }
      }
      batchValues.push([
        name,
        capital,
        region,
        population,
        currency_code,
        exchange_rate,
        estimated_gdp,
        flag_url,
        now,
        now, // created_at
        now, // updated_at
      ]);
    }
    // Batch insert in chunks
    const processed = batchValues.length;
    for (let i = 0; i < batchValues.length; i += BATCH_SIZE) {
      const chunk = batchValues.slice(i, i + BATCH_SIZE);
      const placeholders = chunk.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(",");
      const flatValues = chunk.flat();
      await pool.query(
        `INSERT INTO countries (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at, created_at, updated_at)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE
           capital=VALUES(capital), region=VALUES(region), population=VALUES(population), currency_code=VALUES(currency_code),
           exchange_rate=VALUES(exchange_rate), estimated_gdp=VALUES(estimated_gdp), flag_url=VALUES(flag_url), last_refreshed_at=VALUES(last_refreshed_at),
           updated_at=VALUES(updated_at)`,
        flatValues
      );
    }
    // Single query for all stats (parallelised)
    const [countRes, lastRes, top5Res] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM countries`),
      pool.query(`SELECT MAX(last_refreshed_at) AS last_refreshed_at FROM countries`),
      pool.query(
        `SELECT name, estimated_gdp FROM countries
         WHERE estimated_gdp IS NOT NULL AND estimated_gdp > 0
         ORDER BY estimated_gdp DESC LIMIT 5`
      ),
    ]);
    const count = countRes[0][0];
    const last = lastRes[0][0];
    const top5 = top5Res[0];
    // Image generation off the critical path (fire and forget if needed)
    generateSummaryImage({
      countries: top5,
      totalCountries: count.total,
      timestamp: last.last_refreshed_at,
      outPath: SUMMARY_PATH,
    }).catch((err) => console.warn("Image generation failed:", err.message));
    return res.json({
      message: "Refresh successful",
      total_countries: count.total,
      last_refreshed_at: last.last_refreshed_at,
      processed,
    });
  } catch (err) {
    console.error("DB error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
export async function getCountries(req, res) {
  try {
    const { region, currency, sort, page = 1, limit = 500 } = req.query;
    const where = [];
    const params = [];
    if (region) {
      where.push("LOWER(region)=LOWER(?)");
      params.push(region);
    }
    if (currency) {
      where.push("LOWER(currency_code)=LOWER(?)");
      params.push(currency);
    }
    const whereSQL = where.length ? "WHERE " + where.join(" AND ") : "";
    let orderSQL = "";
    if (sort === "gdp_desc") orderSQL = "ORDER BY estimated_gdp DESC";
    else if (sort === "gdp_asc") orderSQL = "ORDER BY estimated_gdp ASC";
    const offset = (Number(page) - 1) * Number(limit);
    const sql = `SELECT * FROM countries ${whereSQL} ${orderSQL} LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("GetCountries error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}
export async function getCountryByName(req, res) {
  try {
    const name = req.params.name;
    const [rows] = await pool.query(
      `SELECT * FROM countries WHERE LOWER(name)=LOWER(?) LIMIT 1`,
      [name]
    );
    if (!rows.length) return res.status(404).json({ error: "Country not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GetCountryByName error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}
export async function deleteCountryByName(req, res) {
  try {
    const name = req.params.name;
    const [result] = await pool.query(
      `DELETE FROM countries WHERE LOWER(name)=LOWER(?)`,
      [name]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Country not found" });
    res.json({ message: "Country deleted" });
  } catch (err) {
    console.error("DeleteCountry error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}
export async function getStatus(req, res) {
  try {
    const [[count]] = await pool.query(`SELECT COUNT(*) AS total FROM countries`);
    const [[last]] = await pool.query(
      `SELECT MAX(last_refreshed_at) AS last_refreshed_at FROM countries`
    );
    res.json({
      total_countries: count.total,
      last_refreshed_at: last.last_refreshed_at,
    });
  } catch (err) {
    console.error("Status error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}
export async function serveSummaryImage(req, res) {
  try {
    if (!fs.existsSync(SUMMARY_PATH))
      return res.status(404).json({ error: "Summary image not found" });
    res.setHeader("Content-Type", "image/png");
    fs.createReadStream(SUMMARY_PATH).pipe(res);
  } catch (err) {
    console.error("Image error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}















