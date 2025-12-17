const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const { Pool } = require("pg");
const { parse } = require("csv-parse/sync");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   PostgreSQL
=============================== */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   DB 初期化（超重要）
=============================== */
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ranking (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        score INTEGER NOT NULL,
        time INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, score, time)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS miss_log (
        id SERIAL PRIMARY KEY,
        word TEXT NOT NULL UNIQUE,
        miss_count INTEGER DEFAULT 1
      )
    `);

    console.log("✅ DB ready");
  } catch (err) {
    console.error("❌ DB init error", err);
    process.exit(1);
  }
}
initDB();

/* ===============================
   単語取得
=============================== */
app.get("/api/words", async (req, res) => {
  try {
    let csv = await fs.readFile("words.csv", "utf-8");
    if (csv.charCodeAt(0) === 0xfeff) csv = csv.slice(1);

    const data = parse(csv, {
      columns: true,
      skip_empty_lines: true
    });

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "words error" });
  }
});

/* ===============================
   ランキング登録（500完全対策版）
=============================== */
app.post("/api/submit", async (req, res) => {
  try {
    let { name, score, time } = req.body;

    name = typeof name === "string" ? name.trim() : "";
    score = Number(score);
    time = Number(time);

    if (!name || Number.isNaN(score)) {
      return res.status(400).json({ error: "bad data" });
    }

    if (Number.isNaN(time)) {
      time = null;
    }

    await pool.query(
      `
      INSERT INTO ranking(name, score, time)
      VALUES ($1, $2, $3)
      ON CONFLICT (name, score, time) DO NOTHING
      `,
      [name, score, time]
    );

    res.json({ result: "ok" });
  } catch (e) {
    console.error("❌ submit error", e);
    res.status(500).json({ error: "submit error" });
  }
});

/* ===============================
   ランキング取得（全件表示）
=============================== */
app.get("/api/ranking", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT name, score, time
      FROM ranking
      ORDER BY score DESC, time ASC
    `);
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "ranking error" });
  }
});

/* ===============================
   自分の順位取得
=============================== */
app.get("/api/my-rank", async (req, res) => {
  try {
    const name = req.query.name;
    const score = Number(req.query.score);
    const time = Number(req.query.time);

    if (!name || Number.isNaN(score)) {
      return res.status(400).json({ error: "bad request" });
    }

    const r = await pool.query(`
      SELECT name, score, time
      FROM ranking
      ORDER BY score DESC, time ASC
    `);

    let rank = null;
    r.rows.forEach((row, index) => {
      if (
        row.name === name &&
        row.score === score &&
        (Number.isNaN(time) || row.time === time)
      ) {
        if (rank === null) rank = index + 1;
      }
    });

    res.json({ rank: rank ?? "未登録" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "my-rank error" });
  }
});

/* ===============================
   ミス記録
=============================== */
app.post("/api/miss", async (req, res) => {
  try {
    const { word } = req.body;
    if (!word) return res.sendStatus(400);

    await pool.query(
      `
      INSERT INTO miss_log(word, miss_count)
      VALUES ($1,1)
      ON CONFLICT(word)
      DO UPDATE SET miss_count = miss_log.miss_count + 1
      `,
      [word]
    );

    res.json({ result: "ok" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "miss error" });
  }
});

/* ===============================
   サーバー起動
=============================== */
app.listen(PORT, () => {
  console.log("🚀 server running on", PORT);
});
