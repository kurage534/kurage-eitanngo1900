// =====================================================
// server.js（完全版：DB・ベスト記録・日別ランキング）
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
// ranking テーブル作成
// ===============================
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ranking (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      time INTEGER NOT NULL,
      play_date DATE NOT NULL,
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

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    // 同じ名前＋日付の記録を取得
    const prev = await pool.query(
      `SELECT score, time FROM ranking
       WHERE name=$1 AND play_date=$2`,
      [name, today]
    );

    if (prev.rows.length > 0) {
      const p = prev.rows[0];

      // 既存の方が良い場合 → 更新しない
      if (
        p.score > score ||
        (p.score === score && p.time <= time)
      ) {
        return res.json({ result: "not_better" });
      }

      // より良い → 更新
      await pool.query(
        `UPDATE ranking
         SET score=$1, time=$2, created_at=NOW()
         WHERE name=$3 AND play_date=$4`,
        [score, time, name, today]
      );

      return res.json({ result: "updated" });
    }

    // 新規登録
    await pool.query(
      `INSERT INTO ranking (name, score, time, play_date)
       VALUES ($1,$2,$3,$4)`,
      [name, score, time, today]
    );

    res.json({ result: "ok" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "登録失敗" });
  }
});

// ===============================
// 今日のランキング（ベストのみ）
// ===============================
app.get("/api/ranking", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const result = await pool.query(
      `SELECT name, score, time
       FROM ranking
       WHERE play_date=$1
       ORDER BY score DESC, time ASC
       LIMIT 10`,
      [today]
    );

    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "取得失敗" });
  }
});

// ===============================
// 管理者：全削除
// ===============================
app.post("/api/admin/delete", async (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "admin";
  if (req.body.pass !== ADMIN_PASS) {
    return res.status(403).json({ error: "パスワード違い" });
  }

  await pool.query("DELETE FROM ranking");
  res.json({ result: "deleted" });
});

// ===============================
app.listen(PORT, () => {
  console.log("🚀 server running on " + PORT);
});
