const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'ranking.json');

// 単語取得
app.get('/api/words', async (req, res) => {
  try {
    let csvFile = await fs.readFile(path.join(__dirname, 'words.csv'), 'utf-8');
    if (csvFile.charCodeAt(0) === 0xFEFF) csvFile = csvFile.slice(1);

    const records = parse(csvFile, {
      columns: true,
      skip_empty_lines: true
    });

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "単語リスト取得エラー" });
  }
});

// ランキング送信
app.post('/api/submit', async (req, res) => {
  const { name, score } = req.body;
  let data = [];

  try {
    const f = await fs.readFile(DATA_FILE, 'utf-8');
    data = JSON.parse(f);
  } catch {}

  data.push({ name, score, date: new Date().toISOString() });

  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  res.json({ result: 'ok' });
});

// ランキング取得
app.get('/api/ranking', async (req, res) => {
  try {
    let data = [];
    try {
      const f = await fs.readFile(DATA_FILE, 'utf-8');
      data = JSON.parse(f);
    } catch {}

    data.sort((a, b) => b.score - a.score);
    res.json(data.slice(0, 10));

  } catch {
    res.status(500).json({ error: "ランキング取得エラー" });
  }
});

app.listen(PORT, () => {
  console.log("server on " + PORT);
});
