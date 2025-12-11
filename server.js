// ===============================
// server.js（JSON保存 + 管理者削除付き 完全版）
// ===============================

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "ranking.json");
const ADMIN_PASS = process.env.ADMIN_PASS || "admin"; // ← Render に設定する

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


// ------------------------------
// 1. 単語取得（CSV）
// ------------------------------
app.get("/api/words", async (req, res) => {
  try {
    let csvText = await fs.readFile(path.join(__dirname, "words.csv"), "utf-8");

    if (csvText.charCodeAt(0) === 0xFEFF) {
      csvText = csvText.slice(1);
    }

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });

    res.json(records);
  } catch (err) {
    console.error("CSV error:", err);
    res.status(500).json({ error: "単語リスト読み込みエラー" });
  }
});


// ------------------------------
// 2. ランキング保存
// ------------------------------
app.post("/api/submit", async (req, res) => {
  const { name, score, time } = req.body;

  if (!name || typeof score !== "number") {
    return res.status(400).json({ error: "形式が不正です" });
  }

  let ranking = [];

  try {
    const file = await fs.readFile(DATA_FILE, "utf-8");
    ranking = JSON.parse(file);
  } catch {
    ranking = [];
  }

  ranking.push({
    name,
    score,
    time: Number(time) || null,
    date: new Date().toISOString(),
  });

  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(ranking, null, 2));
  } catch (err) {
    console.error("保存エラー:", err);
    return res.status(500).json({ error: "保存に失敗しました" });
  }

  res.json({ result: "ok" });
});


// ------------------------------
// 3. ランキング取得（上位10）
// ------------------------------
app.get("/api/ranking", async (req, res) => {
  let ranking = [];

  try {
    const file = await fs.readFile(DATA_FILE, "utf-8");
    ranking = JSON.parse(file);
  } catch {
    ranking = [];
  }

  ranking.sort((a, b) => b.score - a.score);

  res.json(ranking.slice(0, 10));
});


// ------------------------------
// 4. 管理者：ランキング削除
// ------------------------------
app.post("/api/admin/delete", async (req, res) => {
  const { pass } = req.body;

  if (pass !== ADMIN_PASS) {
    return res.status(403).json({ error: "パスワードが違います" });
  }

  try {
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
  } catch (err) {
    return res.status(500).json({ error: "削除に失敗しました" });
  }

  res.json({ result: "deleted" });
});


// ------------------------------
// 5. サーバー起動
// ------------------------------
app.listen(PORT, () => {
  console.log("server running on " + PORT);
});
