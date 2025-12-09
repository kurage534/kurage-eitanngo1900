async function fetchRanking() {
  const res = await fetch('/api/ranking');
  const ranking = await res.json();
  const list = document.getElementById('ranking-list');
  list.innerHTML = '';
  ranking.forEach((entry) => {
    const item = document.createElement('li');
    item.textContent = `${entry.name} : ${entry.score}`;
    list.appendChild(item);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  fetchRanking();
  const score = localStorage.getItem('score');
  if (score) {
    document.getElementById('score').value = score;
    localStorage.removeItem('score');
  }
});

document.getElementById('submit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const score = Number(document.getElementById('score').value);
  if (!name || isNaN(score)) return;
  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, score })
  });
  if (res.ok) {
    document.getElementById('result-message').textContent = '送信しました！';
    fetchRanking();
  } else {
    const err = await res.json();
    document.getElementById('result-message').textContent = err.error || '送信失敗';
  }
  document.getElementById('submit-form').reset();
});

document.getElementById('reset-btn').addEventListener('click', async () => {
  if (!confirm('本当にランキングをリセットしますか？')) return;
  const res = await fetch('/api/reset', { method: 'POST' });
  if (res.ok) {
    document.getElementById('reset-message').textContent = 'リセットしました';
    fetchRanking();
    setTimeout(() => {
      document.getElementById('reset-message').textContent = '';
    }, 2000);
  } else {
    document.getElementById('reset-message').textContent = 'リセット失敗';
  }
});