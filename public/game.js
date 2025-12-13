// ================================
// game.js（記述式＋四択 両対応版）
// ================================

let allQuestions = [];
let questions = [];
let current = 0;
let score = 0;
let total = 10;
let mode = "text";

let timerId = null;
let startTime = 0;
let elapsed = 0;
let answering = false;

// --------------------
// 単語読み込み
// --------------------
fetch("/api/words")
  .then(res => res.json())
  .then(data => allQuestions = data);

// --------------------
// 時間表示 mm:ss
// --------------------
function format(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// --------------------
// タイマー制御
// --------------------
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

// --------------------
// ゲーム開始
// --------------------
document.getElementById("start-btn").addEventListener("click", () => {
  const sel = document.getElementById("qcount").value;
  mode = document.getElementById("mode").value;

  total = sel === "all" ? allQuestions.length : Number(sel);
  questions = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, total);

  current = 0;
  score = 0;
  elapsed = 0;
  answering = true;

  document.getElementById("setup-area").style.display = "none";
  document.getElementById("game-area").style.display = "";
  document.getElementById("timer").textContent = "00:00";

  showQuestion();
  startTimer();
});

// --------------------
// 問題表示
// --------------------
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

    document.getElementById("submit-answer").style.display = "none";
    document.getElementById("answer").style.display = "none";
    document.getElementById("choices").style.display = "none";
    document.getElementById("to-ranking").style.display = "";
    document.getElementById("restart-btn").style.display = "";
    return;
  }

  answering = true;
  document.getElementById("game-message").innerHTML = "";
  document.getElementById("next-btn").style.display = "none";

  const q = questions[current];
  document.getElementById("question").textContent =
    `(${current + 1}/${questions.length}) ${q.japanese}`;

  if (mode === "text") {
    // 記述式
    document.getElementById("answer").style.display = "";
    document.getElementById("submit-answer").style.display = "";
    document.getElementById("choices").style.display = "none";
    document.getElementById("answer").value = "";
    document.getElementById("answer").disabled = false;
  } else {
    // 四択
    document.getElementById("answer").style.display = "none";
    document.getElementById("submit-answer").style.display = "none";
    showChoices(q);
  }

  startTimer();
}

// --------------------
// 四択生成
// --------------------
function showChoices(q) {
  const choicesDiv = document.getElementById("choices");
  choicesDiv.innerHTML = "";
  choicesDiv.style.display = "";

  const wrongs = allQuestions
    .filter(x => x.word !== q.word)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(x => x.word);

  const choices = [...wrongs, q.word].sort(() => Math.random() - 0.5);

  choices.forEach(c => {
    const btn = document.createElement("button");
    btn.textContent = c;
    btn.onclick = () => judge(c);
    choicesDiv.appendChild(btn);
  });
}

// --------------------
// 判定
// --------------------
function judge(ans) {
  if (!answering) return;
  answering = false;

  commitTime();
  stopTimer();

  const correct = questions[current].word;

  if (ans.toLowerCase() === correct.toLowerCase()) {
    score += 10;
    document.getElementById("game-message").textContent = "正解！ +10点";
  } else {
    document.getElementById("game-message").innerHTML =
      `不正解… 正解：<b>${correct}</b><br>
       <button id="soundBtn">音声を聞く</button>`;
  }

  document.getElementById("next-btn").style.display = "";
}

// --------------------
// 記述式送信
// --------------------
document.getElementById("submit-answer").onclick = () => {
  const ans = document.getElementById("answer").value.trim();
  judge(ans);
};

// --------------------
// 音声
// --------------------
document.addEventListener("click", e => {
  if (e.target.id === "soundBtn") {
    const u = new SpeechSynthesisUtterance(questions[current].word);
    u.lang = "en-US";
    speechSynthesis.speak(u);
  }
});

// --------------------
// 次へ
// --------------------
document.getElementById("next-btn").onclick = () => {
  current++;
  showQuestion();
};

// --------------------
// 再プレイ
// --------------------
document.getElementById("restart-btn").onclick = () => {
  stopTimer();
  document.getElementById("game-area").style.display = "none";
  document.getElementById("setup-area").style.display = "";
};
