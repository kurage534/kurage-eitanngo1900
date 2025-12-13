// ================================
// game.js 完全統合版（機能削除なし）
// ================================

let allQuestions = [];
let questions = [];
let current = 0;
let score = 0;
let total = 10;

let timerId = null;
let startTime = 0;
let elapsed = 0;
let answering = true;

// 単語読み込み
fetch("/api/words")
  .then(res => res.json())
  .then(data => allQuestions = data);

// 時間表示 mm:ss
function format(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// タイマー開始
function startTimer() {
  startTime = Date.now();
  timerId = setInterval(() => {
    const t = elapsed + Math.floor((Date.now() - startTime) / 1000);
    document.getElementById("timer").textContent = format(t);
  }, 200);
}

// タイマー停止
function stopTimer() {
  if (!timerId) return;
  clearInterval(timerId);
  timerId = null;
  elapsed += Math.floor((Date.now() - startTime) / 1000);
}

// 開始
document.getElementById("start-btn").addEventListener("click", () => {
  const sel = document.getElementById("qcount").value;
  total = sel === "all" ? allQuestions.length : Number(sel);

  questions = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, total);

  current = 0;
  score = 0;
  elapsed = 0;

  document.getElementById("setup-area").style.display = "none";
  document.getElementById("game-area").style.display = "";

  showQuestion();
  startTimer();
});

// 問題表示
function showQuestion() {
  if (current >= questions.length) {
    stopTimer();
    document.getElementById("question").textContent = "終了！";
    document.getElementById("score-area").textContent =
      `スコア：${score}点 / 時間：${format(elapsed)}`;

    localStorage.setItem("score", score);
    localStorage.setItem("time", elapsed);
    localStorage.setItem("CAN_REGISTER", "YES");

    document.getElementById("submit-answer").style.display = "none";
    document.getElementById("answer").style.display = "none";
    document.getElementById("to-ranking").style.display = "";
    return;
  }

  answering = true;
  document.getElementById("answer").disabled = false;
  document.getElementById("answer").value = "";
  document.getElementById("question").textContent =
    `(${current + 1}/${questions.length}) ${questions[current].japanese}`;

  document.getElementById("game-message").innerHTML = "";
  document.getElementById("submit-answer").style.display = "";
  document.getElementById("next-btn").style.display = "none";
}

// 回答
document.getElementById("submit-answer").addEventListener("click", async () => {
  if (!answering) return;
  answering = false;
  stopTimer();

  const input = document.getElementById("answer");
  input.disabled = true;

  const ans = input.value.trim().toLowerCase();
  const correct = questions[current].word.toLowerCase();

  if (ans === correct) {
    score += 10;
    document.getElementById("game-message").textContent = "正解！ +10点";
  } else {
    document.getElementById("game-message").innerHTML =
      `不正解… 正解：<b>${correct}</b>
       <br><button id="soundBtn">音声を聞く</button>`;

    await fetch("/api/miss", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ word: correct })
    });
  }

  document.getElementById("submit-answer").style.display = "none";
  document.getElementById("next-btn").style.display = "";
});

// 音声
document.addEventListener("click", e => {
  if (e.target.id === "soundBtn") {
    const u = new SpeechSynthesisUtterance(questions[current].word);
    u.lang = "en-US";
    speechSynthesis.speak(u);
  }
});

// 次へ
document.getElementById("next-btn").addEventListener("click", () => {
  current++;
  showQuestion();
  startTimer();
});

// Enterキー
window.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    if (answering) document.getElementById("submit-answer").click();
    else document.getElementById("next-btn").click();
  }
});

// ランキングへ
document.getElementById("to-ranking").onclick = () => {
  window.location.href = "ranking.html";
};
