let allQuestions = [];
let questions = [];
let current = 0;
let score = 0;
let total = 10;

// ★追加：回答中か・次へ待ちか判定
let answeringNow = true;

// ★追加：タイマー用
let timerStart = 0;
let clearTime = 0;

async function loadAllQuestions() {
  try {
    const res = await fetch('/api/words');
    allQuestions = await res.json();
    if (!Array.isArray(allQuestions) || allQuestions.length === 0 || !('word' in allQuestions[0])) {
      document.getElementById('setup-area').innerHTML = '単語リストエラー。CSVを確認してください。';
      return;
    }
    document.getElementById('start-btn').disabled = false;
    document.getElementById('qcount').disabled = false;
  } catch (e) {
    document.getElementById('setup-area').innerHTML = '単語リストの読み込みに失敗';
  }
}

// シャッフル
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ゲーム開始
document.getElementById('start-btn').addEventListener('click', () => {
  let sel = document.getElementById('qcount').value;
  total = sel === "all" ? allQuestions.length : Math.min(parseInt(sel), allQuestions.length);

  questions = shuffle([...allQuestions]).slice(0, total);
  current = 0;
  score = 0;

  // ★タイマー開始
  timerStart = Date.now();

  document.getElementById('setup-area').style.display = 'none';
  document.getElementById('game-area').style.display = '';
  showQuestion();
});

// 問題表示
function showQuestion() {
  if (current < questions.length) {
    answeringNow = true;

    document.getElementById('question').textContent =
      `(${current + 1}/${questions.length})「${questions[current].japanese}」の英単語は？`;

    document.getElementById('answer').value = '';
    document.getElementById('game-message').textContent = '';

    // 回答入力・送信ボタンを表示
    document.getElementById('submit-answer').style.display = '';
    document.getElementById('answer').style.display = '';

    // 次へボタンは隠す
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('to-ranking').style.display = 'none';

  } else {
    // ★ゲーム終了
    clearTime = Math.floor((Date.now() - timerStart) / 1000);

    document.getElementById('question').textContent = 'ゲーム終了！';
    document.getElementById('score-area').textContent =
      `スコア：${score}点 / 所要時間：${clearTime} 秒`;

    document.getElementById('submit-answ
