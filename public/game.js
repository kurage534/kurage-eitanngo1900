let allQuestions = [];
let questions = [];
let current = 0;
let score = 0;
let total = 10;
let answeringNow = true;

// タイマー
let timerStart = 0;
let clearTime = 0;

// 単語読み込み
async function loadAllQuestions() {
  const res = await fetch('/api/words');
  allQuestions = await res.json();

  document.getElementById('start-btn').disabled = false;
}

// シャッフル
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ゲーム開始
document.getElementById('start-btn').onclick = () => {
  const sel = document.getElementById('qcount').value;
  total = sel === "all" ? allQuestions.length : parseInt(sel);

  questions = shuffle([...allQuestions]).slice(0, total);
  current = 0;
  score = 0;

  timerStart = Date.now(); // タイマー開始

  document.getElementById('setup-area').style.display = "none";
  document.getElementById('game-area').style.display = "";
  showQuestion();
};

// 問題表示
function showQuestion() {
  if (current < questions.length) {
    answeringNow = true;

    document.getElementById('question').textContent =
      `(${current+1}/${questions.length}) ${questions[current].japanese}`;

    document.getElementById('answer').value = "";
    document.getElementById('submit-answer').style.display = "";
    document.getElementById('next-btn').style.display = "none";
    document.getElementById('game-message').textContent = "";

  } else {
    clearTime = Math.floor((Date.now() - timerStart) / 1000);

    document.getElementById('question').textContent = "ゲーム終了！";
    document.getElementById('score-area').textContent =
      `スコア：${score}点 / 時間：${clearTime} 秒`;

    document.getElementById('submit-answer').style.display = "none";
    document.getElementById('answer').style.display = "none";
    document.getElementById('next-btn').style.display = "none";
    document.getElementById('to-ranking').style.display = "";
  }
}

// 解答
document.getElementById('submit-answer').onclick = () => {
  const ans = document.getElementById('answer').value.trim().toLowerCase();
  const correct = questions[current].word.toLowerCase();

  if (ans === correct) {
    score += 10;
    document.getElementById('game-message').textContent = "正解！ +10点";
  } else {
    document.getElementById('game-message').innerHTML =
      `不正解… 正解：${questions[current].word}<br>
       <button id="soundBtn">音声を聞く</button>`;
  }

  answeringNow = false;

  document.getElementById('submit-answer').style.display = "none";
  document.getElementById('next-btn').style.display = "";
};

// 音声ボタン
document.addEventListener('click', e => {
  if (e.target.id === 'soundBtn') {
    const utter = new SpeechSynthesisUtterance(questions[current].word);
    utter.lang = "en-US";
    speechSynthesis.speak(utter);
  }
});

// 次へ
document.getElementById('next-btn').onclick = () => {
  current++;
  showQuestion();
};

// Enterキー切り替え
window.addEventListener('keydown', e => {
  if (e.key === "Enter") {
    if (answeringNow) {
      document.getElementById('submit-answer').click();
    } else {
      document.getElementById('next-btn').click();
    }
  }
});

// ランキングへ
document.getElementById('to-ranking').onclick = () => {
  localStorage.setItem('score', score);
  localStorage.setItem('time', clearTime);
  location.href = "ranking.html";
};

// ランキング常時表示
async function loadRanking() {
  const r = await fetch('/api/ranking');
  const data = await r.json();

  document.getElementById('ranking-list').innerHTML =
    data.map(x => `${x.name}：${x.score}点（${x.time ?? "??"}秒）`).join("<br>");
}

setInterval(loadRanking, 5000);
window.addEventListener('DOMContentLoaded', loadRanking);
window.addEventListener('DOMContentLoaded', loadAllQuestions);
