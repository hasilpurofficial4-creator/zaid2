// Theme toggle module - Dark/Light mode with localStorage persistence

const STORAGE_KEY = 'zaid_theme';

function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'light';
  } catch {
    return 'light';
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  // Update theme-color meta tag for mobile browsers
  const meta = document.getElementById('theme-color-meta') ||
               document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.content = theme === 'dark' ? '#1e293b' : '#2563eb';
  }

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

// Update date/time display
function updateDateTime() {
  const el = document.getElementById('header-datetime');
  if (!el) return;

  const now = new Date();
  const datePart = el.querySelector('.date-part');
  const timePart = el.querySelector('.time-part');

  if (datePart) {
    datePart.textContent = now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  if (timePart) {
    timePart.textContent = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// Initialize theme on load
export function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);

  // Bind toggle button
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', toggleTheme);
  }

  // Start date/time updater
  updateDateTime();
  setInterval(updateDateTime, 30000); // Update every 30s
}
