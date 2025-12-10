let allQuestions = [];
let questions = [];
let current = 0;
let score = 0;
let total = 10;

async function loadAllQuestions() {
  try {
    const res = await fetch('/api/words');
    allQuestions = await res.json();
    if (!Array.isArray(allQuestions) || allQuestions.length === 0 || !('word' in allQuestions[0])) {
      document.getElementById('setup-area').innerHTML = '単語リストエラー。CSVやサーバー設定を確認してください。';
      return;
    }
    // UI有効化
    document.getElementById('start-btn').disabled = false;
    document.getElementById('qcount').disabled = false;
  } catch (e) {
    document.getElementById('setup-area').innerHTML = '単語リストの読み込みに失敗しました';
  }
}

// シャッフル関数
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
  if (sel === "all") {
    total = allQuestions.length;
  } else {
    total = Math.min(parseInt(sel, 10), allQuestions.length);
  }
  // シャッフルして必要数だけ切り出し
  questions = shuffle([...allQuestions]).slice(0, total);
  current = 0;
  score = 0;
  document.getElementById('setup-area').style.display = 'none';
  document.getElementById('game-area').style.display = '';
  showQuestion();
});

function showQuestion() {
  if (current < questions.length) {
    document.getElementById('question').textContent =
      `(${current+1}/${questions.length})「${questions[current].japanese}」の英単語は？`;
    document.getElementById('answer').value = '';
    document.getElementById('game-message').textContent = '';
    document.getElementById('submit-answer').style.display = '';
    document.getElementById('answer').style.display = '';
    document.getElementById('to-ranking').style.display = 'none';
  } else {
    document.getElementById('question').textContent = 'ゲーム終了！';
    document.getElementById('score-area').textContent = `あなたのスコア：${score} / ${questions.length * 10}`;
    document.getElementById('submit-answer').style.display = 'none';
    document.getElementById('answer').style.display = 'none';
    document.getElementById('to-ranking').style.display = 'inline-block';
  }
}

document.getElementById('submit-answer').addEventListener('click', () => {
  const ans = document.getElementById('answer').value.trim().toLowerCase();
  const correct = (questions[current].word || "").trim().toLowerCase();
  if (!questions[current].word) {
    document.getElementById('game-message').textContent =
      '単語データに不備があります。CSVの列名・空白などを確認してください。';
  } else if (ans === correct) {
    score += 10;
    document.getElementById('game-message').textContent = '正解！+10点';
  } else {
    document.getElementById('game-message').textContent =
      `不正解... 正しい答えは "${questions[current].word}"`;
  }
  current++;
  setTimeout(showQuestion, 2000);
});

// ランキング遷移
document.getElementById('to-ranking').addEventListener('click', () => {
  localStorage.setItem('score', score);
  window.location.href = 'ranking.html';
});

// 最初に全問題ロード

window.addEventListener('DOMContentLoaded', loadAllQuestions);
