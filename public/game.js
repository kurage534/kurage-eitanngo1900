// ================================
// game.js（記述式＋四択対応 完全版）
// ================================

let allQuestions = [];
let questions = [];
let current = 0;
let score = 0;
let elapsed = 0;
let timerId = null;
let startTime = 0;
let answering = false;
let mode = "text"; // text | choice

// 単語取得
fetch("/api/words")
  .then(res => res.json())
  .then(data => allQuestions = data);

// 時間表示
function format(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function startTimer() {
  stopTimer();
  startTime = Date.now();
  timerId = setInterval(() => {
    const t = elapsed + Math.floor((Date.now() - startTime) / 1000);
    timer.textContent = format(t);
  }, 200);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function commitTime() {
  elapsed += Math.floor((Date.now() - startTime) / 1000);
}

// ゲーム開始
startBtn.onclick = () => {
  mode = document.getElementById("mode").value;

  questions = [...allQuestions]
    .sort(() => Math.random() - 0.5)
    .slice(0, Number(qcount.value));

  current = 0;
  score = 0;
  elapsed = 0;

  setupArea.style.display = "none";
  gameArea.style.display = "";
  toRanking.style.display = "none";
  restartBtn.style.display = "none";

  showQuestion();
};

// 問題表示
function showQuestion() {
  if (current >= questions.length) {
    stopTimer();
    question.textContent = "終了！";
    scoreArea.textContent = `スコア：${score}点 / 時間：${format(elapsed)}`;

    localStorage.setItem("score", score);
    localStorage.setItem("time", elapsed);
    localStorage.setItem("CAN_REGISTER", "YES");

    submitAnswer.style.display = "none";
    answer.style.display = "none";
    choices.innerHTML = "";
    toRanking.style.display = "";
    restartBtn.style.display = "";
    return;
  }

  answering = true;
  question.textContent =
    `(${current + 1}/${questions.length}) ${questions[current].japanese}`;
  gameMessage.textContent = "";

  answer.value = "";
  answer.disabled = false;
  answer.style.display = mode === "text" ? "" : "none";
  submitAnswer.style.display = mode === "text" ? "" : "none";

  choices.innerHTML = "";
  if (mode === "choice") createChoices();

  startTimer();
}

// 四択生成
function createChoices() {
  const correct = questions[current].word;
  const others = allQuestions
    .filter(q => q.word !== correct)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(q => q.word);

  const arr = [...others, correct].sort(() => Math.random() - 0.5);

  arr.forEach(word => {
    const btn = document.createElement("button");
    btn.textContent = word;
    btn.className = "choice-btn";
    btn.onclick = () => judge(word);
    choices.appendChild(btn);
  });
}

// 判定
function judge(ans) {
  if (!answering) return;
  answering = false;
  commitTime();
  stopTimer();

  const correct = questions[current].word;

  if (ans === correct) {
    score += 10;
    gameMessage.textContent = "正解！ +10点";
  } else {
    gameMessage.innerHTML = `不正解… 正解：<b>${correct}</b>`;
  }

  submitAnswer.style.display = "none";
  nextBtn.style.display = "";
}

// 記述式送信
submitAnswer.onclick = () => {
  judge(answer.value.trim().toLowerCase());
};

// 次へ
nextBtn.onclick = () => {
  nextBtn.style.display = "none";
  current++;
  showQuestion();
};

// 再プレイ
restartBtn.onclick = () => {
  stopTimer();
  gameArea.style.display = "none";
  setupArea.style.display = "";
  timer.textContent = "00:00";
};
