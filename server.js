// =====================================================
// server.js（PostgreSQL 完全対応・1回登録保証版）
// =====================================================

const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const { Pool } = require("pg");
const { parse } = require("csv-parse/sync");

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// PostgreSQL 接続設定
// ===============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }   // Render 用
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


// ===============================
// 1. ranking テーブル自動作成
// ===============================
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ranking (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        score INTEGER NOT NULL,
        time INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- ★ 同一プレイの二重登録防止
        UNIQUE (name, score, time)
      )
    `);

    console.log("✅ ranking テーブル OK");

  } catch (err) {
    console.error("❌ テーブル作成エラー:", err);
  }
}
initDB();


// ===============================
// 2. 単語取得（CSV）
// ===============================
app.get("/api/words", async (req, res) => {
  try {
    let csv = await fs.readFile(path.join(__dirname, "words.csv"), "utf-8");

    if (csv.charCodeAt(0) === 0xFEFF) {
      csv = csv.slice(1);
    }

    const words = parse(csv, {
      columns: true,
      skip_empty_lines: true
    });

    res.json(words);

  } catch (err) {
    console.error("CSV読み込みエラー:", err);
    res.status(500).json({ error: "単語の読み込みに失敗しました" });
  }
});


// ===============================
// 3. ランキング登録（完全1回制限）
// ===============================
app.post("/api/submit", async (req, res) => {
  const { name, score, time } = req.body;

  if (!name || typeof score !== "number") {
    return res.status(400).json({ error: "データ形式が不正です" });
  }

  const t = isNaN(time) ? null : Number(time);

  try {
    await pool.query(
      `INSERT INTO ranking (name, score, time)
       VALUES ($1, $2, $3)`,
      [name, score, t]
    );

    res.json({ result: "ok" });

  } catch (err) {
    // ★ UNIQUE 制約違反 = 二重登録
    if (err.code === "23505") {
      return res.json({ result: "duplicate" });
    }

    console.error("登録エラー:", err);
    res.status(500).json({ error: "ランキング登録に失敗しました" });
  }
});


// ===============================
// 4. ランキング取得（タイム優先）
// ===============================
app.get("/api/ranking", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT name, score, time, created_at
       FROM ranking
       ORDER BY
         score DESC,
         time ASC NULLS LAST,
         id ASC
       LIMIT 10`
    );

    res.json(result.rows);

  } catch (err) {
    console.error("取得エラー:", err);
    res.status(500).json({ error: "ランキング取得に失敗しました" });
  }
});



// ===============================
// 5. 管理者：ランキング全削除
// ===============================
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
    console.error("削除エラー:", err);
    res.status(500).json({ error: "削除に失敗しました" });
  }
});


// ===============================
// 管理者ログイン
// ===============================
app.post("/api/admin/login", (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "admin";
  const { pass } = req.body;

  if (pass === ADMIN_PASS) {
    return res.json({ result: "ok" });
  }

  return res.status(403).json({ result: "ng", error: "パスワードが違います" });
});


// ===============================
// 6. サーバー起動
// ===============================
app.listen(PORT, () => {
  console.log("🚀 server running on port " + PORT);
});

