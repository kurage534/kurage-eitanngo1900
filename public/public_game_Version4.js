const questions = [
  { word: "apple", japanese: "りんご" },
  { word: "dog", japanese: "いぬ" },
  { word: "car", japanese: "くるま" },
  { word: "book", japanese: "ほん" },
  { word: "sun", japanese: "たいよう" }
];

let current = 0;
let score = 0;

function showQuestion() {
  if (current < questions.length) {
    document.getElementById('question').textContent =
      `「${questions[current].japanese}」の英単語は？`;
    document.getElementById('answer').value = '';
    document.getElementById('game-message').textContent = '';
  } else {
    document.getElementById('question').textContent = 'ゲーム終了！';
    document.getElementById('score-area').textContent = `あなたのスコア：${score}`;
    document.getElementById('submit-answer').style.display = 'none';
    document.getElementById('answer').style.display = 'none';
    document.getElementById('to-ranking').style.display = 'inline-block';
  }
}

document.getElementById('submit-answer').addEventListener('click', () => {
  const ans = document.getElementById('answer').value.trim().toLowerCase();
  if (ans === questions[current].word) {
    score += 10;
    document.getElementById('game-message').textContent = '正解！+10点';
  } else {
    document.getElementById('game-message').textContent =
      `不正解... 正しい答えは "${questions[current].word}"`;
  }
  current++;
  setTimeout(showQuestion, 800);
});

document.getElementById('to-ranking').addEventListener('click', () => {
  localStorage.setItem('score', score);
  window.location.href = 'ranking.html';
});

showQuestion();