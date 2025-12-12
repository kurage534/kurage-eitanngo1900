// ====================================================
// server.js（PostgreSQL + JSON→DB移行 完全版）
// ====================================================

const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const { Pool } = require("pg");
const { parse } = require("csv-parse/sync");

const app = express();
const PORT = process.env.PORT || 3000;

// DB接続
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// JSON保存ファイル（旧データ）
const DATA_FILE = path.join(__dirname, "ranking.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


// ---------------------------
// 1. DBテーブル作成
// ---------------------------
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ranking (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      time INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
initDB();


// ---------------------------
// 2. JSON → DB 移行（1回だけ）
// ---------------------------
async function migrateJSONtoDB() {
  try {
    const file = await fs.readFile(DATA_FILE, "utf8");
    const json = JSON.parse(file);

    if (!Array.isArray(json) || json.length === 0) {
      console.log("JSONデータが空のため、移行スキップ");
      return;
    }

    console.log(`JSONから${json.length}件をDBに移行します…`);

    for (const r of json) {
      await pool.query(
        `INSERT INTO ranking(name, score, time, created_at)
         VALUES ($1, $2, $3, $4)`,
        [
          r.name,
          r.score,
          r.time ?? null,
          r.date ? new Date(r.date) : new Date(),
        ]
      );
    }

    console.log("移行完了！");

    // 移行後、JSONをバックアップリネームして再度書かれないようにする
    await fs.rename(DATA_FILE, DATA_FILE + ".migrated");

  } catch (err) {
    // JSONが無い場合はOK
    console.log("JSONデータ移行なし:", err.message);
  }
}
migrateJSONtoDB();


// ---------------------------
// 3. 単語取得
// ---------------------------
app.get("/api/words", async (req, res) => {
  try {
    let csvText = await fs.readFile(path.join(__dirname, "words.csv"), "utf-8");

    if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1);

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true
    });

    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "単語読み込みエラー" });
  }
});


// ---------------------------
// 4. ランキング保存（重複防止）
// ---------------------------
app.post("/api/submit", async (req, res) => {
  const { name, score, time } = req.body;

  if (!name || typeof score !== "number") {
    return res.status(400).json({ error: "形式が不正です" });
  }

  // 重複チェック（名前・スコア・タイムが全て同じ）
  const dup = await pool.query(
    `SELECT * FROM ranking WHERE name=$1 AND score=$2 AND time=$3`,
    [name, score, time ?? null]
  );

  if (dup.rows.length > 0) {
    return res.json({ result: "duplicate" });
  }

  await pool.query(
    `INSERT INTO ranking (name, score, time)
     VALUES ($1, $2, $3)`,
    [name, score, time ?? null]
  );

  res.json({ result: "ok" });
});


// ---------------------------
// 5. ランキング取得（上位10）
// ---------------------------
app.get("/api/ranking", async (req, res) => {
  const result = await pool.query(
    `SELECT name, score, time, created_at
       FROM ranking
       ORDER BY score DESC, id ASC
       LIMIT 10`
  );

  res.json(result.rows);
});


// ---------------------------
// 6. 管理者：ランキング削除
// ---------------------------
app.post("/api/admin/delete", async (req, res) => {
  const { pass } = req.body;
  const ADMIN_PASS = process.env.ADMIN_PASS || "admin";

  if (pass !== ADMIN_PASS) {
    return res.status(403).json({ error: "パスワードが違います" });
  }

  await pool.query("DELETE FROM ranking");

  res.json({ result: "deleted" });
});


// ---------------------------
// 7. サーバー起動
// ---------------------------
app.listen(PORT, () => {
  console.log("server running on " + PORT);
});
