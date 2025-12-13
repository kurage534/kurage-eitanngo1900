// =====================================================
// server.js（最終完全版）
// =====================================================

const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const { Pool } = require("pg");
const { parse } = require("csv-parse/sync");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || "admin";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// DB初期化
// ===============================
async function initDB() {
  try {
    await pool.query(`
CREATE TABLE IF NOT EXISTS ranking (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  time INTEGER,
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

    console.log("✅ DB tables ready");

  } catch (err) {
    console.error("❌ DB init error:", err);
  }
}

initDB();

// ===============================
// 単語取得
// ===============================
app.get("/api/words", async (req, res) => {
  let csv = await fs.readFile(path.join(__dirname, "words.csv"), "utf-8");
  if (csv.charCodeAt(0) === 0xFEFF) csv = csv.slice(1);
  res.json(parse(csv, { columns: true, skip_empty_lines: true }));
});

// ===============================
// ランキング登録（ベストのみ）
// ===============================
app.post("/api/submit", async (req, res) => {
  const { name, score, time } = req.body;

  const old = await pool.query(
    "SELECT score, time FROM ranking WHERE name=$1",
    [name]
  );

  if (old.rows.length > 0) {
    const o = old.rows[0];
    if (score < o.score || (score === o.score && time >= o.time)) {
      return res.json({ result: "not_best" });
    }
    await pool.query(
      `UPDATE ranking SET score=$1, time=$2, created_at=NOW() WHERE name=$3`,
      [score, time, name]
    );
    return res.json({ result: "updated" });
  }

  await pool.query(
    "INSERT INTO ranking(name, score, time) VALUES($1,$2,$3)",
    [name, score, time]
  );
  res.json({ result: "ok" });
});

// ===============================
// ランキング取得
// ===============================
app.get("/api/ranking", async (req, res) => {
  const r = await pool.query(`
    SELECT name, score, time
    FROM ranking
    ORDER BY score DESC, time ASC
    LIMIT 10
  `);
  res.json(r.rows);
});

// ===============================
// 自分の順位
// ===============================
app.post("/api/my-rank", async (req, res) => {
  const { score, time } = req.body;
  const r = await pool.query(
    `
    SELECT COUNT(*) + 1 AS rank
    FROM ranking
    WHERE score > $1 OR (score = $1 AND time < $2)
    `,
    [score, time]
  );
  res.json({ rank: r.rows[0].rank });
});

// ===============================
// ミス登録
// ===============================
app.post("/api/miss", async (req, res) => {
  const { word } = req.body;
  const r = await pool.query("SELECT * FROM mistakes WHERE word=$1", [word]);
  if (r.rows.length) {
    await pool.query(
      "UPDATE mistakes SET wrong_count = wrong_count + 1 WHERE word=$1",
      [word]
    );
  } else {
    await pool.query("INSERT INTO mistakes(word) VALUES($1)", [word]);
  }
  res.json({ result: "ok" });
});

// ===============================
// 管理者：ミス分析
// ===============================
app.post("/api/admin/mistakes", async (req, res) => {
  if (req.body.pass !== ADMIN_PASS) return res.sendStatus(403);
  const r = await pool.query(
    "SELECT word, wrong_count FROM mistakes ORDER BY wrong_count DESC"
  );
  res.json(r.rows);
});

// ===============================
// 管理者：ランキング削除
// ===============================
app.post("/api/admin/delete", async (req, res) => {
  if (req.body.pass !== ADMIN_PASS) return res.sendStatus(403);
  await pool.query("DELETE FROM ranking");
  res.json({ result: "deleted" });
});

app.listen(PORT, () => console.log("server running"));

// ===============================
// ミス記録（単語別）
// ===============================
app.post("/api/miss", async (req, res) => {
  const { word } = req.body;
  if (!word) return res.sendStatus(400);

  try {
    // すでにあるか確認
    const r = await pool.query(
      "SELECT id FROM miss_log WHERE word=$1",
      [word]
    );

    if (r.rows.length > 0) {
      // あれば +1
      await pool.query(
        `UPDATE miss_log
         SET miss_count = miss_count + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE word=$1`,
        [word]
      );
    } else {
      // なければ新規
      await pool.query(
        `INSERT INTO miss_log(word, miss_count)
         VALUES ($1, 1)`,
        [word]
      );
    }

    res.json({ result: "ok" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "miss log error" });
  }
});

// ===============================
// 管理者：ミス分析取得
// ===============================
app.get("/api/admin/miss", async (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "admin";
  const pass = req.query.pass;

  if (pass !== ADMIN_PASS) {
    return res.status(403).json({ error: "forbidden" });
  }

  const result = await pool.query(
    `SELECT word, miss_count
     FROM miss_log
     ORDER BY miss_count DESC`
  );

  res.json(result.rows);
});






