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
// Random multiplier between 1000 and 2000
function randMultiplier() {
  return Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
}
// :white_check_mark: POST /countries/refresh
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
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let processed = 0;
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
      const [exists] = await conn.query(
        `SELECT id FROM countries WHERE LOWER(name) = LOWER(?) LIMIT 1`,
        [name]
      );
      console.log(`Checking ${name}: exists = ${exists.length > 0}`);
      const now = new Date();
      if (exists.length > 0) {
        await conn.query(
          `UPDATE countries
           SET capital=?, region=?, population=?, currency_code=?,
               exchange_rate=?, estimated_gdp=?, flag_url=?, last_refreshed_at=?
           WHERE id=?`,
          [
            capital,
            region,
            population,
            currency_code,
            exchange_rate,
            estimated_gdp,
            flag_url,
            now,
            exists[0].id,
          ]
        );
      } else {
        await conn.query(
          `INSERT INTO countries (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            name,
            capital,
            region,
            population,
            currency_code,
            exchange_rate,
            estimated_gdp,
            flag_url,
            now,
          ]
        );
      }
      processed++;
    }
    await conn.commit();
    const [[count]] = await pool.query(`SELECT COUNT(*) AS total FROM countries`);
    const [[last]] = await pool.query(
      `SELECT MAX(last_refreshed_at) AS last_refreshed_at FROM countries`
    );
    const [[top5]] = await pool.query(
      `SELECT name, estimated_gdp FROM countries
       WHERE estimated_gdp IS NOT NULL AND estimated_gdp > 0
       ORDER BY estimated_gdp DESC LIMIT 5`
    );
    try {
      await generateSummaryImage({
        countries: top5,  // Assuming the function expects 'countries' as the array
        totalCountries: count.total,
        timestamp: last.last_refreshed_at,
        outPath: SUMMARY_PATH,
      });
    } catch (imgErr) {
      console.warn("Image generation failed:", imgErr.message);
    }
    return res.json({
      message: "Refresh successful",
      total_countries: count.total,
      last_refreshed_at: last.last_refreshed_at,
      processed,
    });
  } catch (err) {
    await conn.rollback();
    console.error("DB error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    conn.release();
  }
}
// :white_check_mark: GET /countries
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
// :white_check_mark: GET /countries/:name
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
// :white_check_mark: DELETE /countries/:name
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
// :white_check_mark: GET /status
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
// :white_check_mark: GET /countries/image
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
