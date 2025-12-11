// ===============================
// server.js（JSON保存方式 完全版）
// ===============================

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');

const app = express();
const PORT = process.env.PORT || 3000;

// JSON データ保存先
const DATA_FILE = path.join(__dirname, "ranking.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


// ===========================
// 1. 単語一覧取得（CSV）
// ===========================
app.get("/api/words", async (req, res) => {
  try {
    let csvText = await fs.readFile(path.join(__dirname, "words.csv"), "utf-8");

    // BOM除去
    if (csvText.charCodeAt(0) === 0xFEFF) {
      csvText = csvText.slice(1);
    }

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });

    res.json(records);
  } catch (err) {
    console.error("CSV読み込みエラー:", err);
    res.status(500).json({ error: "単語リストの読み込みに失敗しました" });
  }
});



// ===========================
// 2. ランキング保存
// ===========================
app.post("/api/submit", async (req, res) => {
  const { name, score, time } = req.body;

  if (!name || typeof score !== "number") {
    return res.status(400).json({ error: "データ形式が正しくありません" });
  }

  let ranking = [];

  // 既存ランキング読み込み
  try {
    const file = await fs.readFile(DATA_FILE, "utf-8");
    ranking = JSON.parse(file);
  } catch {
    ranking = []; // ファイルがなければ空
  }

  // 新しいデータを追加
  ranking.push({
    name,
    score,
    time: Number(time) || null,   // time が無い場合も安全
    date: new Date().toISOString()
  });

  // 保存
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(ranking, null, 2));
  } catch (err) {
    console.error("JSON保存エラー:", err);
    return res.status(500).json({ error: "ランキング保存に失敗しました" });
  }

  res.json({ result: "ok" });
});



// ===========================
// 3. ランキング取得（上位10件）
// ===========================
app.get("/api/ranking", async (req, res) => {

  let ranking = [];

  try {
    const file = await fs.readFile(DATA_FILE, "utf-8");
    ranking = JSON.parse(file);
  } catch {
    ranking = [];
  }

  // 得点で降順ソート
  ranking.sort((a, b) => b.score - a.score);

  // 上位10件返す
  res.json(ranking.slice(0, 10));
});



// ===========================
// 4. サーバー起動
// ===========================
app.listen(PORT, () => {
  console.log(`server start on port ${PORT}`);
});
