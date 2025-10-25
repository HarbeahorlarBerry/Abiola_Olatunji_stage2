import pool from "../../MYSQL_DB/countries_db.js";
import axios from "axios";
import { generateSummaryImage } from "../../Utils/imageGenerator.js";
import fs from "fs";
import path from "path";

const COUNTRIES_API = process.env.EXTERNAL_COUNTRIES_API;
const RATES_API = process.env.EXTERNAL_EXCHANGE_API;
const TIMEOUT = Number(process.env.REFRESH_TIMEOUT_MS || 15000);
const CACHE_DIR = process.env.CACHE_DIR || "./cache";
const SUMMARY_PATH = path.join(CACHE_DIR, "summary.png");

function randMultiplier() {
  // random integer between 1000 and 2000 inclusive
  return Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
}

// ============================================
// POST /refresh - Refresh Countries
// ============================================
export async function refreshCountries(req, res) {
  try {
    // Step 1: Fetch external APIs concurrently
    let countriesData, ratesData;
    try {
      const [countriesResp, ratesResp] = await Promise.all([
        axios.get(COUNTRIES_API, { timeout: TIMEOUT }),
        axios.get(RATES_API, { timeout: TIMEOUT }),
      ]);
      countriesData = countriesResp.data;
      ratesData = ratesResp.data;
    } catch (err) {
      console.error("External fetch error:", err.message || err);
      const failing = err.config?.url || "external API";
      return res.status(503).json({
        error: "External data source unavailable",
        details: `Could not fetch data from ${failing}`,
      });
    }

    const rates = ratesData?.rates || {};

    // ensure cache dir exists
    try {
      if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    } catch (fsErr) {
      console.warn("Cache directory creation failed:", fsErr.message);
    }

    // Step 2: Perform DB upserts inside a transaction
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      let processed = 0;

      for (const c of countriesData) {
        const name = c.name || null;
        if (!name) continue;

        const capital = c.capital || null;
        const region = c.region || null;
        const population = Number(c.population || 0);
        const flag_url = c.flag || null;

        let currency_code = null;
        if (Array.isArray(c.currencies) && c.currencies.length > 0) {
          currency_code = c.currencies[0].code || null;
        }

        let exchange_rate = null;
        let estimated_gdp = null;

        if (!currency_code) {
          exchange_rate = null;
          estimated_gdp = 0;
        } else {
          const codeUpper = currency_code.toUpperCase();
          const found = rates[codeUpper] ?? rates[currency_code] ?? null;

          if (typeof found === "number") {
            exchange_rate = found;
            const m = randMultiplier();
            estimated_gdp = exchange_rate === 0 ? null : (population * m) / exchange_rate;
          } else {
            exchange_rate = null;
            estimated_gdp = null;
          }
        }

        const [rows] = await conn.execute(
          `SELECT id FROM countries WHERE LOWER(name) = LOWER(?) LIMIT 1`,
          [name]
        );

        const now = new Date();
        if (rows.length > 0) {
          await conn.execute(
            `UPDATE countries 
             SET capital=?, region=?, population=?, currency_code=?, exchange_rate=?, 
                 estimated_gdp=?, flag_url=?, last_refreshed_at=? 
             WHERE id=?`,
            [capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, now, rows[0].id]
          );
        } else {
          await conn.execute(
            `INSERT INTO countries 
             (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, now]
          );
        }

        processed++;
      }

      await conn.commit();

      const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM countries`);
      const [[{ last_refreshed_at }]] = await pool.query(
        `SELECT MAX(last_refreshed_at) AS last_refreshed_at FROM countries`
      );

      const [topRows] = await pool.query(
        `SELECT name, estimated_gdp FROM countries 
         WHERE estimated_gdp IS NOT NULL AND estimated_gdp > 0 
         ORDER BY estimated_gdp DESC LIMIT 5`
      );

      try {
        await generateSummaryImage({
          totalCountries: total,
          top5: topRows,
          timestamp: last_refreshed_at || new Date().toISOString(),
          outPath: SUMMARY_PATH,
        });
      } catch (imgErr) {
        console.error("Image generation failed:", imgErr.message);
      }

      return res.status(200).json({
        message: "Refresh successful",
        total_countries: total,
        last_refreshed_at: last_refreshed_at ? new Date(last_refreshed_at).toISOString() : null,
        processed,
      });
    } catch (err) {
      await conn.rollback();
      console.error("DB transaction failed:", err.message);
      return res.status(500).json({ error: "Database transaction failed" });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Unexpected refresh error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// GET /countries
// ============================================
export async function getCountries(req, res) {
  try {
    const { region, currency, sort, page = 1, limit = 500 } = req.query;
    const whereClauses = [];
    const params = [];

    if (region) {
      whereClauses.push(`LOWER(region) = LOWER(?)`);
      params.push(region);
    }
    if (currency) {
      whereClauses.push(`LOWER(currency_code) = LOWER(?)`);
      params.push(currency);
    }

    let whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    let orderSQL = "";

    if (sort === "gdp_desc") orderSQL = `ORDER BY estimated_gdp DESC`;
    else if (sort === "gdp_asc") orderSQL = `ORDER BY estimated_gdp ASC`;

    const offset = (Number(page) - 1) * Number(limit);
    const sql = `
      SELECT id, name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at
      FROM countries ${whereSQL} ${orderSQL} LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error("getCountries error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// GET /countries/:name
// ============================================
export async function getCountryByName(req, res) {
  try {
    const name = req.params.name;
    if (!name) return res.status(400).json({ error: "Country name required" });

    const [rows] = await pool.query(
      `SELECT id, name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at 
       FROM countries WHERE LOWER(name) = LOWER(?) LIMIT 1`,
      [name]
    );

    if (!rows.length) return res.status(404).json({ error: "Country not found" });
    return res.json(rows[0]);
  } catch (err) {
    console.error("getCountryByName error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// DELETE /countries/:name
// ============================================
export async function deleteCountryByName(req, res) {
  try {
    const name = req.params.name;
    if (!name) return res.status(400).json({ error: "Country name required" });

    const [result] = await pool.query(`DELETE FROM countries WHERE LOWER(name)=LOWER(?)`, [name]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Country not found" });

    return res.status(200).json({ message: "Country deleted" });
  } catch (err) {
    console.error("deleteCountryByName error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// GET /status
// ============================================
export async function getStatus(req, res) {
  try {
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM countries`);
    const [[{ last_refreshed_at }]] = await pool.query(
      `SELECT MAX(last_refreshed_at) AS last_refreshed_at FROM countries`
    );

    return res.json({
      total_countries: total,
      last_refreshed_at: last_refreshed_at ? new Date(last_refreshed_at).toISOString() : null,
    });
  } catch (err) {
    console.error("getStatus error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ============================================
// GET /countries/image
// ============================================
export async function serveSummaryImage(req, res) {
  try {
    if (!fs.existsSync(SUMMARY_PATH)) {
      return res.status(404).json({ error: "Summary image not found" });
    }

    res.setHeader("Content-Type", "image/png");
    fs.createReadStream(SUMMARY_PATH).pipe(res);
  } catch (err) {
    console.error("serveSummaryImage error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}

