const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { parse } = require('csv-parse/sync');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'ranking.json');
const ADMIN_PASS = "Kurage0805"; // 管理パスワード

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 英単語リストAPI（BOM自動除去！）
app.get('/api/words', async (req, res) => {
  try {
    let csvFile = await fs.readFile(path.join(__dirname, 'words.csv'), 'utf-8');
    if (csvFile.charCodeAt(0) === 0xFEFF) csvFile = csvFile.slice(1);
    const records = parse(csvFile, {
      columns: true,
      skip_empty_lines: true
    });
    res.json(records);
  } catch (e) {
    res.status(500).json({ error: '単語リスト読み込みエラー' });
  }
});

// ランキングAPI
app.get('/api/ranking', async (req, res) => {
  try {
    let data = [];
    try {
      const file = await fs.readFile(DATA_FILE, 'utf-8');
      data = JSON.parse(file);
    } catch (e) {}
    data.sort((a, b) => b.score - a.score);
    res.json(data.slice(0, 10));
  } catch {
    res.status(500).json({ error: '読み込みエラー' });
  }
});

// ランキング送信API（スコアはPOSTでのみ！）
app.post('/api/submit', async (req, res) => {
  const { name, score } = req.body;
  if (!name || typeof score !== 'number') {
    return res.status(400).json({ error: 'nameとscoreを正しく指定してください' });
  }
  let data = [];
  try {
    const file = await fs.readFile(DATA_FILE, 'utf-8');
    data = JSON.parse(file);
  } catch (e) {}
  data.push({ name, score, date: new Date().toISOString() });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  res.json({ result: 'ok' });
});

// ランキングリセットAPI（パスワード認証）
app.post('/api/reset', async (req, res) => {
  const password = req.body.password || '';
  if (password !== ADMIN_PASS) {
    // 不正時は403で必ずエラー
    return res.status(403).json({ error: 'リセットパスワードが違います' });
  }
  await fs.writeFile(DATA_FILE, '[]');
  res.json({ result: 'reset ok' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});