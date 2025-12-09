const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'ranking.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ランキング取得API
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

// スコア送信API
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

// ランキングリセットAPI
app.post('/api/reset', async (req, res) => {
  await fs.writeFile(DATA_FILE, '[]');
  res.json({ result: 'reset ok' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});