let allQuestions = [];
let questions = [];
let current = 0;
let score = 0;
let total = 10;

// 単語読み込み
async function loadAllQuestions() {
  const res = await fetch('/api/words');
  allQuestions = await res.json();
}

loadAllQuestions();

// シャッフル
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

document.getElementById('start-btn').addEventListener('click', () => {
  const sel = document.getElementById('qcount').value;

  total = (sel === "all") ? allQuestions.length : Number(sel);
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
      `(${current+1}/${questions.length}) ${questions[current].japanese}`;

    document.getElementById('answer').value = '';
    document.getElementById('submit-answer').style.display = '';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('game-message').textContent = '';
  } else {
    document.getElementById('question').textContent = '終了！';
    document.getElementById('score-area').textContent = `スコア：${score}`;

    document.getElementById('submit-answer').style.display = 'none';
    document.getElementById('answer').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';

    document.getElementById('to-ranking').style.display = '';
  }
}

document.getElementById('submit-answer').addEventListener('click', () => {
  const ans = document.getElementById('answer').value.trim().toLowerCase();
  const correct = questions[current].word.toLowerCase();

  if (ans === correct) {
    score += 10;
    document.getElementById('game-message').textContent = '正解！';
  } else {
    document.getElementById('game-message').textContent =
      `不正解… 正解は ${questions[current].word}`;
  }

  document.getElementById('submit-answer').style.display = 'none';
  document.getElementById('next-btn').style.display = '';
});

document.getElementById('next-btn').addEventListener('click', () => {
  current++;
  showQuestion();
});

// ランキングへ
document.getElementById('to-ranking').addEventListener('click', () => {
  localStorage.setItem('score', score);
  window.location.href = 'ranking.html';
});
