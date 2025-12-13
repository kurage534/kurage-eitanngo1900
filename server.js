// =====================================================
// server.js（DB完全版：ベスト記録＋日別ランキング対応）
// =====================================================

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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ranking (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      time INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
initDB();


// ===============================
// 単語取得
// ===============================
app.get("/api/words", async (req, res) => {
  try {
    let csv = await fs.readFile(path.join(__dirname, "words.csv"), "utf-8");
    if (csv.charCodeAt(0) === 0xFEFF) csv = csv.slice(1);

    const words = parse(csv, { columns: true, skip_empty_lines: true });
    res.json(words);

  } catch {
    res.status(500).json({ error: "単語読み込み失敗" });
  }
});


// ===============================
// ランキング登録（ベスト記録のみ）
// ===============================
app.post("/api/submit", async (req, res) => {
  const { name, score, time } = req.body;

  if (!name || typeof score !== "number" || typeof time !== "number") {
    return res.status(400).json({ error: "不正なデータ" });
  }

  try {
    // 既存記録取得
    const old = await pool.query(
      `SELECT score, time FROM ranking WHERE name=$1`,
      [name]
    );

    if (old.rows.length > 0) {
      const o = old.rows[0];

      // ベストでない場合は保存しない
      if (
        score < o.score ||
        (score === o.score && time >= o.time)
      ) {
        return res.json({ result: "not_best" });
      }

      // ベスト更新
      await pool.query(
        `UPDATE ranking
         SET score=$1, time=$2, created_at=CURRENT_TIMESTAMP
         WHERE name=$3`,
        [score, time, name]
      );

      return res.json({ result: "updated" });
    }

    // 新規登録
    await pool.query(
      `INSERT INTO ranking (name, score, time)
       VALUES ($1, $2, $3)`,
      [name, score, time]
    );

    res.json({ result: "ok" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "登録失敗" });
  }
});


// ===============================
// 全体ランキング（ベストのみ）
// ===============================
app.get("/api/ranking", async (req, res) => {
  const result = await pool.query(`
    SELECT name, score, time
    FROM ranking
    ORDER BY score DESC, time ASC
    LIMIT 10
  `);
  res.json(result.rows);
});


// ===============================
// 今日のランキング（②）
// ===============================
app.get("/api/ranking/today", async (req, res) => {
  const result = await pool.query(`
    SELECT name, score, time
    FROM ranking
    WHERE created_at::date = CURRENT_DATE
    ORDER BY score DESC, time ASC
    LIMIT 10
  `);
  res.json(result.rows);
});


// ===============================
app.listen(PORT, () => {
  console.log("🚀 server running on " + PORT);
});
