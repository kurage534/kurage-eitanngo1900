// =====================================
// game.js（完全版：開始バグ修正済）
// =====================================

let allQuestions = [];
let questions = [];
let current = 0;
let score = 0;
let total = 10;

let answeringNow = true;

// ⏱ タイマー
let timerId = null;
let startTime = 0;
let elapsedTime = 0;

// 🧠 思考時間
let questionStartTime = 0;
let thinkingTimes = [];


// -------------------------
// 単語読み込み
// -------------------------
async function loadAllQuestions() {
  const res = await fetch("/api/words");
  allQuestions = await res.json();
}
loadAllQuestions();


// -------------------------
// シャッフル
// -------------------------
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


// -------------------------
// mm:ss 表示
// -------------------------
function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}


// -------------------------
// タイマー開始
// -------------------------
function startTimer() {
  startTime = Date.now();
  questionStartTime = Date.now();

  timerId = setInterval(() => {
    const sec = elapsedTime + Math.floor((Date.now() - startTime) / 1000);
    document.getElementById("timer").textContent = formatTime(sec);
  }, 200);
}


// -------------------------
// タイマー停止
// -------------------------
function stopTimer() {
  if (!timerId) return;

  clearInterval(timerId);
  timerId = null;

  const now = Date.now();
  elapsedTime += Math.floor((now - startTime) / 1000);

  const thinkSec = Math.floor((now - questionStartTime) / 1000);
  thinkingTimes.push(thinkSec);
}


// -------------------------
// ゲーム開始
// -------------------------
document.getElementById("start-btn").addEventListener("click", () => {
  if (allQuestions.length === 0) {
    alert("問題を読み込み中です。少し待ってください。");
    return;
  }

  const sel = document.getElementById("qcount").value;
  total = sel === "all" ? allQuestions.length : Number(sel);

  questions = shuffle([...allQuestions]).slice(0, total);

  current = 0;
  score = 0;
  elapsedTime = 0;
  thinkingTimes = [];

  document.getElementById("timer").textContent = "00:00";
  document.getElementById("setup-area").style.display = "none";
  document.getElementById("game-area").style.display = "";

  showQuestion();
});


// -------------------------
// 問題表示
// -------------------------
function showQuestion() {
  if (current < questions.length) {
    answeringNow = true;

    document.getElementById("answer").disabled = false;
    document.getElementById("answer").value = "";

    document.getElementById("question").textContent =
      `(${current + 1}/${questions.length}) ${questions[current].japanese}`;

    document.getElementById("submit-answer").style.display = "";
    document.getElementById("next-btn").style.display = "none";
    document.getElementById("game-message").innerHTML = "";

    startTimer(); // ← ここだけで開始

  } else {
    stopTimer();

    document.getElementById("question").textContent = "終了！";
    document.getElementById("score-area").textContent =
      `スコア：${score}点 ／ 時間：${formatTime(elapsedTime)}`;

    document.getElementById("submit-answer").style.display = "none";
    document.getElementById("answer").style.display = "none";
    document.getElementById("next-btn").style.display = "none";
    document.getElementById("to-ranking").style.display = "";

    localStorage.setItem("CAN_REGISTER", "YES");
    localStorage.setItem("score", score);
    localStorage.setItem("time", elapsedTime);
  }
}


// -------------------------
// 回答送信
// -------------------------
document.getElementById("submit-answer").addEventListener("click", () => {
  if (!answeringNow) return;

  stopTimer();
  answeringNow = false;

  document.getElementById("answer").disabled = true;

  const ans = document.getElementById("answer").value.trim().toLowerCase();
  const correct = questions[current].word.toLowerCase();

  if (ans === correct) {
    score += 10;
    document.getElementById("game-message").textContent = "正解！ +10点";
  } else {
    document.getElementById("game-message").innerHTML =
      `不正解… 正解は <b>${questions[current].word}</b><br>
       <button id="soundBtn">音声を聞く</button>`;
  }

  document.getElementById("submit-answer").style.display = "none";
  document.getElementById("next-btn").style.display = "";
});


// -------------------------
// 音声再生
// -------------------------
document.addEventListener("click", (e) => {
  if (e.target.id === "soundBtn") {
    const u = new SpeechSynthesisUtterance(questions[current].word);
    u.lang = "en-US";
    speechSynthesis.speak(u);
  }
});


// -------------------------
// 次の問題
// -------------------------
document.getElementById("next-btn").addEventListener("click", () => {
  current++;
  showQuestion();
});


// -------------------------
// Enterキー対応
// -------------------------
window.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    answeringNow
      ? document.getElementById("submit-answer").click()
      : document.getElementById("next-btn").click();
  }
});


// -------------------------
// ランキングへ
// -------------------------
document.getElementById("to-ranking").addEventListener("click", () => {
  window.location.href = "ranking.html";
});
