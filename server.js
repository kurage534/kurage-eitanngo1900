const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const { Pool } = require("pg");
const { parse } = require("csv-parse/sync");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   PostgreSQL 接続
=============================== */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   DB 初期化
=============================== */
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ranking (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        score INTEGER NOT NULL,
        time INTEGER,
        mode TEXT DEFAULT 'write',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS miss_log (
        id SERIAL PRIMARY KEY,
        word TEXT UNIQUE NOT NULL,
        miss_count INTEGER DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  } catch (err) {
    res.status(500).json({ error: "words error" });
  }
});

/* ===============================
   ランキング登録
=============================== */
app.post("/api/submit", async (req, res) => {
  const { name, score, time, mode } = req.body;

  if (!name || typeof score !== "number") {
    return res.status(400).json({ error: "bad data" });
  }

  const quizMode = mode === "choice" ? "choice" : "write";

  try {
    const dup = await pool.query(
      `SELECT 1 FROM ranking
       WHERE name=$1 AND score=$2 AND time=$3 AND mode=$4`,
      [name, score, time, quizMode]
    );

    if (dup.rows.length) {
      return res.json({ result: "duplicate" });
    }

    await pool.query(
      `INSERT INTO ranking(name, score, time, mode)
       VALUES($1,$2,$3,$4)`,
      [name, score, time, quizMode]
    );

    res.json({ result: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "submit error" });
  }
});

/* ===============================
   ランキング取得（モード別）
=============================== */
app.get("/api/ranking", async (req, res) => {
  const mode = req.query.mode === "choice" ? "choice" : "write";

  try {
    const r = await pool.query(
      `SELECT name, score, time
       FROM ranking
       WHERE mode=$1
       ORDER BY score DESC, time ASC
       LIMIT 10`,
      [mode]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: "ranking error" });
  }
});

/* ===============================
   ミス記録
=============================== */
app.post("/api/miss", async (req, res) => {
  const { word } = req.body;
  if (!word) return res.sendStatus(400);

  try {
    await pool.query(
      `INSERT INTO miss_log(word, miss_count)
       VALUES($1,1)
       ON CONFLICT(word)
       DO UPDATE SET
         miss_count = miss_log.miss_count + 1,
         updated_at = CURRENT_TIMESTAMP`,
      [word]
    );
    res.json({ result: "ok" });
  } catch (err) {
    res.status(500).json({ error: "miss error" });
  }
});

/* ===============================
   管理者ログイン
=============================== */
app.post("/api/admin/login", (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "Kurage0805";

  if (req.body.pass === ADMIN_PASS) {
    return res.json({ result: "ok" });
  }
  res.status(403).json({ result: "ng" });
});

/* ===============================
   管理者：ミス分析
=============================== */
app.get("/api/admin/miss", async (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "Kurage0805";
  if (req.query.pass !== ADMIN_PASS) {
    return res.sendStatus(403);
  }

  const r = await pool.query(
    `SELECT word, miss_count
     FROM miss_log
     ORDER BY miss_count DESC`
  );
  res.json(r.rows);
});

/* ===============================
   管理者：ランキング削除
=============================== */
app.post("/api/admin/delete", async (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "Kurage0805";
  if (req.body.pass !== ADMIN_PASS) {
    return res.sendStatus(403);
  }

  await pool.query("DELETE FROM ranking");
  res.json({ result: "deleted" });
});

/* ===============================
   管理者：ランキングCSV
=============================== */
app.get("/api/admin/export/ranking", async (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "Kurage0805";
  if (req.query.pass !== ADMIN_PASS) {
    return res.sendStatus(403);
  }

  const result = await pool.query(
    `SELECT name, score, time, mode, created_at
     FROM ranking
     ORDER BY score DESC, time ASC`
  );

  let csv = "name,score,time,mode,created_at\n";
  for (const r of result.rows) {
    csv += `"${r.name}",${r.score},${r.time ?? ""},${r.mode},${r.created_at}\n`;
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=ranking.csv");
  res.send(csv);
});

/* ===============================
   管理者：ミス分析CSV
=============================== */
app.get("/api/admin/export/miss", async (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "Kurage0805";
  if (req.query.pass !== ADMIN_PASS) {
    return res.sendStatus(403);
  }

  const result = await pool.query(
    `SELECT word, miss_count
     FROM miss_log
     ORDER BY miss_count DESC`
  );

  let csv = "word,miss_count\n";
  for (const r of result.rows) {
    csv += `"${r.word}",${r.miss_count}\n`;
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=miss_analysis.csv");
  res.send(csv);
});

/* =============================== */
app.listen(PORT, () => {
  console.log("🚀 server running on", PORT);
});
