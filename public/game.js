let words = [];
let current = 0;
let score = 0;
let startTime = 0;
let timerInterval = null;

// クイズ初期化
async function init() {
  const res = await fetch("/api/words");
  words = await res.json();

  current = 0;
  score = 0;

  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);

  showQuestion();
}

// タイマー更新
function updateTimer() {
  const sec = Math.floor((Date.now() - startTime) / 1000);
  document.getElementById("timer").textContent = `時間：${sec} 秒`;
}

// 問題表示
function showQuestion() {
  if (current >= words.length) {
    finishQuiz();
    return;
  }

  const w = words[current];
  document.getElementById("question").textContent = w.jp;
  document.getElementById("answer").value = "";
  document.getElementById("answer").focus();
}

// 回答判定
function checkAnswer() {
  const input = document.getElementById("answer").value.trim();
  if (!input) return;

  const correct = words[current].en;

  if (input.toLowerCase() === correct.toLowerCase()) {
    score++;
  }

  current++;
  showQuestion();
}

// ENTERキー対応
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    checkAnswer();
  }
});

// 終了処理
function finishQuiz() {
  clearInterval(timerInterval);

  const time = Math.floor((Date.now() - startTime) / 1000);

  // ランキング用データ保存
  localStorage.setItem("score", score);
  localStorage.setItem("time", time);

  window.location.href = "ranking.html";
}
