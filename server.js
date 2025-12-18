const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const { Pool } = require("pg");
const { parse } = require("csv-parse/sync");

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// 設定
// ===============================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// ===============================
// PostgreSQL
// ===============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// DB 初期化（FREE対応）
// ===============================
async function initDB() {
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

  // 既存DB向け（安全）
  await pool.query(`
    ALTER TABLE ranking
    ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'write'
  `);

  console.log("✅ DB ready");
}
initDB().catch(console.error);

// ===============================
// 単語取得
// ===============================
app.get("/api/words", async (req, res) => {
  try {
    let csv = await fs.readFile("words.csv", "utf-8");
    if (csv.charCodeAt(0) === 0xfeff) csv = csv.slice(1);

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

  await pool.query(
    `INSERT INTO ranking(name, score, time, mode)
     VALUES($1,$2,$3,$4)`,
    [name, score, time, mode || "write"]
  );

  res.json({ result: "ok" });
});

// ===============================
// ランキング取得（モード別）
// ===============================
app.get("/api/ranking", async (req, res) => {
  const mode = req.query.mode || "write";

  const r = await pool.query(
    `SELECT name, score, time
     FROM ranking
     WHERE mode=$1
     ORDER BY score DESC, time ASC
     LIMIT 10`,
    [mode]
  );

  res.json(r.rows);
});

// ===============================
// 自分の順位
// ===============================
app.get("/api/my-rank", async (req, res) => {
  const { name, score, time, mode } = req.query;
  if (!name || score === undefined) {
    return res.status(400).json({ error: "bad request" });
  }

  const r = await pool.query(
    `SELECT name, score, time
     FROM ranking
     WHERE mode=$1
     ORDER BY score DESC, time ASC`,
    [mode || "write"]
  );

  let rank = "未登録";
  r.rows.forEach((row, i) => {
    if (
      row.name === name &&
      row.score === Number(score) &&
      (time == null || row.time === Number(time))
    ) {
      if (rank === "未登録") rank = i + 1;
    }
  });

  res.json({ rank });
});

// ===============================
// 管理者：一覧取得
// ===============================
app.post("/api/admin/list", async (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "password wrong" });
  }

  const r = await pool.query(
    `SELECT id, name, score, time, mode, created_at
     FROM ranking
     ORDER BY created_at DESC`
  );

  res.json(r.rows);
});

// ===============================
// 管理者：削除（名前＋スコア）
// ===============================
app.post("/api/admin/delete", async (req, res) => {
  const { password, name, score } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "password wrong" });
  }

  const r = await pool.query(
    `DELETE FROM ranking
     WHERE name=$1 AND score=$2`,
    [name, score]
  );

  res.json({ deleted: r.rowCount });
});

// ===============================
// 管理者：CSVエクスポート（モード別）
// ===============================
app.post("/api/admin/export", async (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "password wrong" });
  }

  const mode = req.body.mode || "write";

  const r = await pool.query(
    `SELECT name, score, time, mode, created_at
     FROM ranking
     WHERE mode=$1
     ORDER BY score DESC, time ASC`,
    [mode]
  );

  let csv = "name,score,time,mode,created_at\n";
  r.rows.forEach(row => {
    csv += `${row.name},${row.score},${row.time ?? ""},${row.mode},${row.created_at}\n`;
  });

  res.header("Content-Type", "text/csv");
  res.attachment(`ranking_${mode}.csv`);
  res.send(csv);
});

// ===============================
// 管理者：全リセット
// ===============================
app.post("/api/admin/reset", async (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "password wrong" });
  }

  await pool.query("DELETE FROM ranking");
  res.json({ result: "reset ok" });
});

// ===============================
app.listen(PORT, () => {
  console.log("🚀 server running on", PORT);
});
