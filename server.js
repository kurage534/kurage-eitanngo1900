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
    // ランキング
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

    // ミスログ
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
    if (csv.charCodeAt(0) === 0xfeff) csv = csv.slice(1);

    const data = parse(csv, {
      columns: true,
      skip_empty_lines: true
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "words error" });
  }
});

// ===============================
// ランキング登録（重複防止）
// ===============================
app.post("/api/submit", async (req, res) => {
  const { name, score, time } = req.body;

  if (!name || typeof score !== "number") {
    return res.status(400).json({ error: "bad data" });
  }

  try {
    await pool.query(
      `INSERT INTO ranking(name, score, time)
       VALUES($1,$2,$3)
       ON CONFLICT (name, score, time) DO NOTHING`,
      [name, score, time]
    );

    res.json({ result: "ok" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "submit error" });
  }
});

// ===============================
// ランキング取得（上位10位）
// ===============================
app.get("/api/ranking", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT name, score, time
      FROM ranking
      ORDER BY score DESC, time ASC
      LIMIT 10
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: "ranking error" });
  }
});

// ===============================
// 自分の順位取得（制限なし）
// ===============================
app.get("/api/my-rank", async (req, res) => {
  const { name, score, time } = req.query;
  if (!name || score === undefined) {
    return res.status(400).json({ error: "bad request" });
  }

  try {
    const r = await pool.query(`
      SELECT name, score, time
      FROM ranking
      ORDER BY score DESC, time ASC
    `);

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
  } catch (e) {
    res.status(500).json({ error: "my-rank error" });
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
    DO UPDATE SET
      miss_count = miss_log.miss_count + 1,
      updated_at = CURRENT_TIMESTAMP
  `, [word]);

  res.json({ result: "ok" });
});

// ===============================
// 管理者：ランキング全削除
// ===============================
app.post("/api/admin/delete", async (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "Kurage0805";
  if (req.body.pass !== ADMIN_PASS) return res.sendStatus(403);

  await pool.query("DELETE FROM ranking");
  res.json({ result: "deleted" });
});

// ===============================
// 管理者：特定の名前を削除
// ===============================
app.post("/api/admin/delete-by-name", async (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "Kurage0805";
  const { name, pass } = req.body;

  if (pass !== ADMIN_PASS) return res.sendStatus(403);

  const r = await pool.query(
    "DELETE FROM ranking WHERE name=$1",
    [name]
  );

  res.json({ deleted: r.rowCount });
});

// ===============================
// 管理者：ランキング CSV
// ===============================
app.get("/api/admin/export/ranking", async (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "Kurage0805";
  if (req.query.pass !== ADMIN_PASS) return res.sendStatus(403);

  const r = await pool.query(`
    SELECT name, score, time, created_at
    FROM ranking
    ORDER BY score DESC, time ASC
  `);

  let csv = "name,score,time,created_at\n";
  r.rows.forEach(row => {
    csv += `"${row.name}",${row.score},${row.time ?? ""},${row.created_at}\n`;
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=ranking.csv");
  res.send(csv);
});

// ===============================
// 管理者：ミス CSV
// ===============================
app.get("/api/admin/export/miss", async (req, res) => {
  const ADMIN_PASS = process.env.ADMIN_PASS || "Kurage0805";
  if (req.query.pass !== ADMIN_PASS) return res.sendStatus(403);

  const r = await pool.query(`
    SELECT word, miss_count
    FROM miss_log
    ORDER BY miss_count DESC
  `);

  let csv = "word,miss_count\n";
  r.rows.forEach(row => {
    csv += `"${row.word}",${row.miss_count}\n`;
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=miss_analysis.csv");
  res.send(csv);
});

// ===============================
app.listen(PORT, () => {
  console.log("🚀 server running on", PORT);
});
