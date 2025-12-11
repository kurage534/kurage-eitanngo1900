let allQuestions = [];
let questions = [];
let current = 0;
let score = 0;
let total = 10;

let answeringNow = true; // Enterキー判定用

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

// ゲーム開始
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

// 問題表示
function showQuestion() {
  if (current < questions.length) {
    answeringNow = true;

    document.getElementById('question').textContent =
      `(${current+1}/${questions.length}) ${questions[current].japanese}`;

    document.getElementById('answer').value = '';
    document.getElementById('submit-answer').style.display = '';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('game-message').innerHTML = '';
  } else {
    document.getElementById('question').textContent = '終了！';
    document.getElementById('score-area').textContent = `スコア：${score}`;

    document.getElementById('submit-answer').style.display = 'none';
    document.getElementById('answer').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('to-ranking').style.display = '';
  }
}

// 回答ボタン
document.getElementById('submit-answer').addEventListener('click', () => {
  const ans = document.getElementById('answer').value.trim().toLowerCase();
  const correct = questions[current].word.toLowerCase();

  if (ans === correct) {
    score += 10;
    document.getElementById('game-message').textContent = '正解！ +10点';
  } else {
    // ★ 不正解時に音声ボタンを追加 ★
    document.getElementById('game-message').innerHTML =
      `不正解… 正解は「${questions[current].word}」<br>
       <button id="soundBtn">音声を聞く</button>`;
  }

  answeringNow = false; // Enterキーを「次へ」用に切替

  document.getElementById('submit-answer').style.display = 'none';
  document.getElementById('next-btn').style.display = '';
});

// ★ 音声ボタン処理
document.addEventListener('click', (e) => {
  if (e.target.id === 'soundBtn') {
    const utter = new SpeechSynthesisUtterance(questions[current].word);
    utter.lang = "en-US";
    speechSynthesis.speak(utter);
  }
});

// 次へ
document.getElementById('next-btn').addEventListener('click', () => {
  current++;
  showQuestion();
});

// ★ ENTERキー最適化
window.addEventListener('keydown', (e) => {
  if (e.key === "Enter") {
    // 入力中 → 「送信」
    if (answeringNow) {
      document.getElementById('submit-answer').click();
    }
    // 判定後 → 「次へ」
    else {
      document.getElementById('next-btn').click();
    }
  }
});

// ランキングへ
document.getElementById('to-ranking').addEventListener('click', () => {
  localStorage.setItem('score', score);
  window.location.href = 'ranking.html';
});
