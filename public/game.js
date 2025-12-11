let allQuestions = [];
let questions = [];
let current = 0;
let score = 0;
let total = 10;
let timerStart = 0;
let clearTime = 0;


// Enterキーの動作切替フラグ
let answeringNow = true;

// =============================
// 単語CSVを読み込む
// =============================
async function loadAllQuestions() {
  try {
    const res = await fetch('/api/words');
    allQuestions = await res.json();

    document.getElementById('start-btn').disabled = false;
    document.getElementById('qcount').disabled = false;
  } catch {
    document.getElementById('setup-area').innerHTML =
      '単語リストの読み込み失敗';
  }
}

// =============================
// 配列シャッフル
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

  if (sel === "all") {
    total = allQuestions.length;
  } else {
    total = Math.min(parseInt(sel, 10), allQuestions.length);
  }

  questions = shuffle([...allQuestions]).slice(0, total);
  current = 0;
  score = 0;

  document.getElementById('setup-area').style.display = 'none';
  document.getElementById('game-area').style.display = '';
  showQuestion();
});

// =============================
// 問題表示
// =============================
function showQuestion() {
  if (current < questions.length) {

    document.getElementById('question').textContent =
      `(${current+1}/${questions.length})「${questions[current].japanese}」の英単語は？`;

    document.getElementById('answer').value = '';
    document.getElementById('game-message').textContent = '';

    // 入力と送信ボタンを表示
    document.getElementById('submit-answer').style.display = '';
    document.getElementById('answer').style.display = '';

    // 次へボタンは隠す
    document.getElementById('next-btn').style.display = 'none';

    answeringNow = true;

  } else {
    // ゲーム終了
    document.getElementById('question').textContent = 'ゲーム終了！';
    document.getElementById('score-area').textContent =
      `あなたのスコア：${score} / ${questions.length * 10}`;

    document.getElementById('submit-answer').style.display = 'none';
    document.getElementById('answer').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';

    document.getElementById('to-ranking').style.display = 'inline-block';
  }
}

// =============================
// 回答送信
// =============================
document.getElementById('submit-answer').addEventListener('click', () => {

  const ans = document.getElementById('answer').value.trim().toLowerCase();
  const correct = (questions[current].word || "").trim().toLowerCase();

  if (ans === correct) {
    score += 10;
    document.getElementById('game-message').textContent = '正解！+10点';
  } else {
    document.getElementById('game-message').textContent =
      `不正解... 正しい答えは "${questions[current].word}"`;
  }

  answeringNow = false;

  // 回答UIを隠す
  document.getElementById('submit-answer').style.display = 'none';
  document.getElementById('answer').style.display = 'none';

  // 次へボタン表示
  document.getElementById('next-btn').style.display = '';
});

// =============================
// 次へボタン
// =============================
document.getElementById('next-btn').addEventListener('click', () => {
  current++;
  showQuestion();
});

// =============================
// Enterキーで操作
// =============================
window.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (answeringNow) {
      document.getElementById('submit-answer').click();
    } else {
      document.getElementById('next-btn').click();
    }
  }
});

// =============================
// ランキングへ移動
// =============================
document.getElementById('to-ranking').addEventListener('click', () => {
  localStorage.setItem('score', score);
  window.location.href = 'ranking.html';
});

// =============================
// 最初の単語読み込み
// =============================
window.addEventListener('DOMContentLoaded', loadAllQuestions);

