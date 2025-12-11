let allQuestions = [];
let questions = [];
let current = 0;
let score = 0;
let total = 10;

// ★追加：Enter制御
let answeringNow = true;

// ★追加：タイマー
let timerStart = 0;
let clearTime = 0;

// =============================
// 単語取得
// =============================
async function loadAllQuestions() {
  try {
    const res = await fetch('/api/words');
    allQuestions = await res.json();

    document.getElementById('start-btn').disabled = false;
    document.getElementById('qcount').disabled = false;
  } catch {
    document.getElementById('setup-area').innerHTML = '単語読み込みエラー';
  }
}

// =============================
// シャッフル
// =============================
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// =============================
// ゲーム開始
// =============================
document.getElementById('start-btn').addEventListener('click', () => {
  let sel = document.getElementById('qcount').value;

  total = sel === "all" ? allQuestions.length : parseInt(sel);
  questions = shuffle([...allQuestions]).slice(0, total);

  current = 0;
  score = 0;

  // ★タイマー開始
  timerStart = Date.now();

  document.getElementById('setup-area').style.display = 'none';
  document.getElementById('game-area').style.display = '';
  showQuestion();
});

// =============================
// 問題表示
// =============================
function showQuestion() {
  if (current < questions.length) {
    answeringNow = true;

    document.getElementById('question').textContent =
      `(${current+1}/${questions.length})「${questions[current].japanese}」の英単語は？`;

    document.getElementById('answer').value = '';
    document.getElementById('game-message').textContent = '';

    document.getElementById('submit-answer').style.display = '';
    document.getElementById('answer').style.display = '';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('to-ranking').style.display = 'none';
  } else {
    // ★タイマー終了
    clearTime = Math.floor((Date.now() - timerStart) / 1000);

    document.getElementById('question').textContent = 'ゲーム終了！';
    document.getElementById('score-area').textContent =
      `スコア：${score} / 時間：${clearTime} 秒`;

    document.getElementById('submit-answer').style.display = 'none';
    document.getElementById('answer').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';

    document.getElementById('to-ranking').style.display = '';
  }
}

// =============================
// 回答送信
// =============================
document.getElementById('submit-answer').addEventListener('click', () => {
  const ans = document.getElementById('answer').value.trim().toLowerCase();
  const correct = questions[current].word.toLowerCase();

  if (ans === correct) {
    score += 10;
    document.getElementById('game-message').textContent = '正解！ +10点';
  } else {
    document.getElementById('game-message').innerHTML =
      `不正解… 正解は「${questions[current].word}」<br>
       <button id="soundBtn">音声を聞く</button>`;
  }

  answeringNow = false;

  document.getElementById('submit-answer').style.display = 'none';
  document.getElementById('answer').style.display = 'none';
  document.getElementById('next-btn').style.display = '';
});

// =============================
// 音声ボタン
// =============================
document.addEventListener('click', e => {
  if (e.target.id === 'soundBtn') {
    const utter = new SpeechSynthesisUtterance(questions[current].word);
    utter.lang = "en-US";
    speechSynthesis.speak(utter);
  }
});

// =============================
// 次へボタン
// =============================
document.getElementById('next-btn').addEventListener('click', () => {
  current++;
  showQuestion();
});

// =============================
// Enterキー
// =============================
window.addEventListener('keydown', e => {
  if (e.key === "Enter") {
    if (answeringNow) {
      document.getElementById("submit-answer").click();
    } else {
      document.getElementById("next-btn").click();
    }
  }
});

// =============================
// ランキングへ
// =============================
document.getElementById('to-ranking').addEventListener('click', () => {
  localStorage.setItem('score', score);
  localStorage.setItem('time', clearTime);
  window.location.href = 'ranking.html';
});

// =============================
// 初期読み込み
// =============================
window.addEventListener('DOMContentLoaded', loadAllQuestions);
