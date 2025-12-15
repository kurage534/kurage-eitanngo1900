let allQuestions = [];
let questions = [];
let current = 0;
let score = 0;
let total = 10;

let timerId = null;
let startTime = 0;
let elapsed = 0;
let answering = false;

/* 単語取得 */
fetch("/api/words")
  .then(res => res.json())
  .then(data => allQuestions = data);

/* 時間表示 */
function format(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/* タイマー */
function startTimer() {
  stopTimer();
  startTime = Date.now();
  timerId = setInterval(() => {
    const t = elapsed + Math.floor((Date.now() - startTime) / 1000);
    document.getElementById("timer").textContent = format(t);
  }, 200);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function commitTime() {
  elapsed += Math.floor((Date.now() - startTime) / 1000);
}

/* ゲーム開始 */
document.getElementById("start-btn").addEventListener("click", () => {
  const sel = document.getElementById("qcount").value;
  total = sel === "all" ? allQuestions.length : Number(sel);

  questions = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, total);

  current = 0;
  score = 0;
  elapsed = 0;
  answering = true;

  document.getElementById("setup-area").style.display = "none";
  document.getElementById("game-area").style.display = "block";

  document.getElementById("to-ranking").style.display = "none";
  document.getElementById("restart-btn").style.display = "none";
  document.getElementById("score-area").textContent = "";
  document.getElementById("timer").textContent = "00:00";

  showQuestion();
  startTimer();
});

/* 問題表示 */
function showQuestion() {
  if (current >= questions.length) {
    stopTimer();
    answering = false;

    document.getElementById("question").textContent = "終了！";
    document.getElementById("score-area").textContent =
      `スコア：${score}点 / 時間：${format(elapsed)}`;

    localStorage.setItem("score", score);
    localStorage.setItem("time", elapsed);
    localStorage.setItem("CAN_REGISTER", "YES");

    document.getElementById("answer").style.display = "none";
    document.getElementById("submit-answer").style.display = "none";
    document.getElementById("next-btn").style.display = "none";
    document.getElementById("to-ranking").style.display = "block";
    document.getElementById("restart-btn").style.display = "block";
    return;
  }

  answering = true;
  document.getElementById("answer").disabled = false;
  document.getElementById("answer").value = "";

  document.getElementById("question").textContent =
    `(${current + 1}/${questions.length}) ${questions[current].japanese}`;

  document.getElementById("game-message").textContent = "";
  document.getElementById("submit-answer").style.display = "block";
  document.getElementById("next-btn").style.display = "none";

  startTimer();
}

/* 回答 */
document.getElementById("submit-answer").addEventListener("click", async () => {
  if (!answering) return;

  answering = false;
  commitTime();
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
      `不正解… 正解：<b>${correct}</b>`;
    await fetch("/api/miss", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ word: correct })
    });
  }

  document.getElementById("submit-answer").style.display = "none";
  document.getElementById("next-btn").style.display = "block";
});

/* 次へ */
document.getElementById("next-btn").addEventListener("click", () => {
  current++;
  showQuestion();
});

/* Enterキー */
window.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    if (answering) document.getElementById("submit-answer").click();
    else document.getElementById("next-btn").click();
  }
});

/* ランキング */
document.getElementById("to-ranking").onclick = () => {
  window.location.href = "ranking.html";
};

/* 再プレイ */
document.getElementById("restart-btn").onclick = () => {
  stopTimer();
  document.getElementById("game-area").style.display = "none";
  document.getElementById("setup-area").style.display = "block";
};
