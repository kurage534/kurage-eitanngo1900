// =====================================================
// server.js（完全DB対応版）
// PostgreSQL 保存 / ランキング取得 / 管理者削除 / CSV読み込み
// =====================================================

const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const { Pool } = require("pg");
const { parse } = require("csv-parse/sync");

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------------
// PostgreSQL 接続設定
// -------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


// -------------------------------
// DBテーブル作成（存在しない場合だけ）
// -------------------------------
async function createTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ranking (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      time INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("Ranking table ready.");
}
createTable();


// -------------------------------
// 1. 単語リスト読み込み（CSV）
// -------------------------------
app.get("/api/words", async (req, res) => {
  try {
    let csv = await fs.readFile(path.join(__dirname, "words.csv"), "utf-8");

    // BOM削除（Excelで保存したCSV対策）
    if (csv.charCodeAt(0) === 0xFEFF) {
      csv = csv.slice(1);
    }

    const words = parse(csv, {
      columns: true,
      skip_empty_lines: true,
    });

    res.json(words);
  } catch (err) {
    console.error("CSV読み込みエラー:", err);
    res.status(500).json({ error: "単語の読み込みに失敗しました" });
  }
});


// -------------------------------
// 2. ランキング登録（重複登録を防止）
// -------------------------------
app.post("/api/submit", async (req, res) => {
  const { name, score, time } = req.body;

  if (!name || typeof score !== "number") {
    return res.status(400).json({ error: "データ形式が不正です" });
  }

  const t = isNaN(time) ? null : time;

  try {
    // 重複チェック（名前 + スコア + 時間）
    const dup = await pool.query(
      `SELECT 1 FROM ranking WHERE name = $1 AND score = $2 AND time = $3`,
      [name, score, t]
    );

    if (dup.rows.length > 0) {
      return res.json({ result: "duplicate" });
    }

    // 登録
    await pool.query(
      `INSERT INTO ranking (name, score, time)
       VALUES ($1, $2, $3)`,
      [name, score, t]
    );

    res.json({ result: "ok" });
  } catch (err) {
    console.error("DB登録エラー:", err);
    res.status(500).json({ error: "ランキング登録に失敗しました" });
  }
});


// -------------------------------
// 3. ランキング取得（上位10）
// -------------------------------
app.get("/api/ranking", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT name, score, time, created_at
         FROM ranking
         ORDER BY score DESC, id ASC
         LIMIT 10`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("ランキング取得エラー:", err);
    res.status(500).json({ error: "ランキング取得に失敗しました" });
  }
});


// -------------------------------
// 4. 管理者：ランキング全削除
// -------------------------------
app.post("/api/admin/delete", async (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "admin";
  const { pass } = req.body;

  if (pass !== ADMIN_PASS) {
    return res.status(403).json({ error: "パスワードが違います" });
  }

  try {
    await pool.query("DELETE FROM ranking");
    res.json({ result: "deleted" });
  } catch (err) {
    console.error("削除失敗:", err);
    res.status(500).json({ error: "削除に失敗しました" });
  }
});


// -------------------------------
// 5. サーバー起動
// -------------------------------
app.listen(PORT, () => {
  console.log("Server running on " + PORT);
});
