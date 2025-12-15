const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const { Pool } = require("pg");
const { parse } = require("csv-parse/sync");

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// PostgreSQL 接続
// ===============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// DB 初期化
// ===============================
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
  word TEXT NOT NULL UNIQUE,
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

// ===============================
// 単語取得
// ===============================
app.get("/api/words", async (req, res) => {
  try {
    let csv = await fs.readFile("words.csv", "utf-8");
    if (csv.charCodeAt(0) === 0xFEFF) csv = csv.slice(1);
    const data = parse(csv, { columns: true, skip_empty_lines: true });
    res.json(data);
  } catch {
    res.status(500).json({ error: "words error" });
  }
});

// ===============================
// ランキング登録
// ===============================
app.post("/api/submit", async (req, res) => {
  const { name, score, time, mode } = req.body;
  if (!name || typeof score !== "number") {
    return res.status(400).json({ error: "bad data" });
  }

  try {
    await pool.query(
      "INSERT INTO ranking(name, score, time, mode) VALUES($1,$2,$3,$4)",
      [name, score, time, mode || "write"]
    );
    res.json({ result: "ok" });
  } catch {
    res.status(500).json({ error: "submit error" });
  }
});

// ===============================
// ランキング取得（モード別）
// ===============================
app.get("/api/ranking", async (req, res) => {
  try {
    const mode = req.query.mode || "write";
    const r = await pool.query(
      "SELECT name, score, time FROM ranking WHERE mode=$1 ORDER BY score DESC, time ASC",
      [mode]
    );
    res.json(r.rows);
  } catch {
    res.status(500).json({ error: "ranking error" });
  }
});

// ===============================
// ミス記録
// ===============================
app.post("/api/miss", async (req, res) => {
  const { word } = req.body;
  if (!word) return res.sendStatus(400);

  await pool.query(`
INSERT INTO miss_log(word, miss_count)
VALUES($1,1)
ON CONFLICT(word)
DO UPDATE SET miss_count = miss_log.miss_count + 1
`, [word]);

  res.json({ result: "ok" });
});

// ===============================
// 管理者ログイン
// ===============================
app.post("/api/admin/login", (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "Kurage0805";
  if (req.body.pass === ADMIN_PASS) {
    return res.json({ result: "ok" });
  }
  res.status(403).json({ result: "ng" });
});

// ===============================
// 管理者：ミス分析
// ===============================
app.get("/api/admin/miss", async (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "Kurage0805";
  if (req.query.pass !== ADMIN_PASS) return res.sendStatus(403);

  const r = await pool.query(
    "SELECT word, miss_count FROM miss_log ORDER BY miss_count DESC"
  );
  res.json(r.rows);
});

// ===============================
app.listen(PORT, () => {
  console.log("🚀 server running on", PORT);
});
