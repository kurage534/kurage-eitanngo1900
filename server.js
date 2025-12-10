// server.js ーーー DB版ランキング保存 完全版

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { Pool } = require('pg');
const { parse } = require('csv-parse/sync');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== DB接続 ==========
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ========== ランキングテーブル自動生成 ==========
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ranking(
      id SERIAL PRIMARY KEY,
      name TEXT,
      score INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
ensureTable();

// ========== 単語取得 ==========
app.get('/api/words', async (req, res) => {
  try {
    let csvFile = await fs.readFile(path.join(__dirname,'words.csv'),'utf-8');
    if (csvFile.charCodeAt(0) === 0xFEFF) csvFile = csvFile.slice(1);
    const records = parse(csvFile, { columns:true, skip_empty_lines:true });
    res.json(records);
  } catch {
    res.status(500).json({ error:'単語リスト読み込みエラー' });
  }
});

// ========== ランキング送信 API ==========
app.post('/api/submit', async (req, res) => {
  const { name, score } = req.body;
  try {
    await pool.query(
      `INSERT INTO ranking(name, score) VALUES($1,$2)`,
      [name, score]
    );
    res.json({ result:'ok' });
  } catch {
    res.status(500).json({error:'DB保存エラー'});
  }
});

// ========== ランキング取得 ==========
app.get('/api/ranking', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ranking ORDER BY score DESC, id ASC LIMIT 50`
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({error:'DB取得エラー'});
  }
});

// ========== 管理用リセット（任意） ==========
app.post('/api/reset', async (req, res) => {
  const pass = req.body.password || '';
  if (pass !== 'Kurage0805') return res.status(403).json({error:'NG'});
  await pool.query('DELETE FROM ranking');
  res.json({ result:'reset ok' });
});

app.listen(PORT, () => {
  console.log('server on ' + PORT);
});
