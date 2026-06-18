const themeBtn = document.getElementById('themeBtn');
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.className = savedTheme === 'dark' ? 'dark' : '';
themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  themeBtn.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
