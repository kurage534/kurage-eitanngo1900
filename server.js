// ===============================================
// server.js ーーー DB版ランキング保存 ＋ 管理者機能 完全版
// ===============================================

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { Pool } = require('pg');
const { parse } = require('csv-parse/sync');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===============================================
// 🔵 DB 接続設定
// ===============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===============================================
// 🔵 ランキングテーブル自動生成
//     time（クリア時間）にも対応
// ===============================================
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ranking(
      id SERIAL PRIMARY KEY,
      name TEXT,
      score INTEGER,
      time INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
ensureTable();

// ===============================================
// 🔵 単語取得 API（BOM除去対応）
// ===============================================
app.get('/api/words', async (req, res) => {
  try {
    let csvFile = await fs.readFile(path.join(__dirname, 'words.csv'), 'utf-8');

    // 先頭BOM削除
    if (csvFile.charCodeAt(0) === 0xFEFF) {
      csvFile = csvFile.slice(1);
    }

    const records = parse(csvFile, {
      columns: true,
      skip_empty_lines: true
    });

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: '単語リスト読み込みエラー' });
  }
});

// ===============================================
// 🔵 ランキング送信 API（time 対応）
// ===============================================
app.post('/api/submit', async (req, res) => {
  const { name, score, time } = req.body;

  try {
    await pool.query(
      `INSERT INTO ranking(name, score, time) VALUES($1,$2,$3)`,
      [name, score, time || null]
    );
    res.json({ result: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB保存エラー' });
  }
});

// ===============================================
// 🔵 ランキング取得 API
// ===============================================
app.get('/api/ranking', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM ranking
      ORDER BY score DESC, time ASC, id ASC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'DB取得エラー' });
  }
});

// ===============================================
// 🔴 管理者専用：ランキング削除 API
//      パスワード必須 → 管理者しか使えない
// ===============================================
app.post('/api/admin/delete', async (req, res) => {

  const ADMIN_PASS = process.env.ADMIN_PASS || "Kurage0805";  //好きなパスワード
  const sentPass = req.headers["x-admin-pass"];

  if (sentPass !== ADMIN_PASS) {
    return res.status(403).json({ error: "管理者パスワードが違います" });
  }

  try {
    await pool.query(`DELETE FROM ranking`);
    res.json({ result: "deleted" });
  } catch (err) {
    res.status(500).json({ error: "削除エラー" });
  }
});

// ===============================================
// 🔵 サーバー開始
// ===============================================
app.listen(PORT, () => {
  console.log('server on ' + PORT);
});
