import { initI18n, t, getLanguage } from './i18n.js';
import { openDB } from './db.js';
import { renderDashboard } from './views/dashboard.js';
import { renderAnalytics } from './views/analytics.js';
import { renderLogMeal } from './views/logMeal.js';
import { renderFoodDb } from './views/foodDb.js';
import { renderSettings } from './views/settings.js';

let currentDate = new Date();
let currentTab = 'dashboard';

async function init() {
  initI18n();

  // Apply theme
  const savedTheme = localStorage.getItem('calorie2_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Initialize DB
  await openDB();

  // Register service worker if available
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW error:', err));
  }

  setupUI();
  updateNavLabels();
  renderCurrentView();
}

function setupUI() {
  // Setup bottom navigation buttons
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Date controls
  const prevDayBtn = document.getElementById('prev-day-btn');
  const nextDayBtn = document.getElementById('next-day-btn');

  if (prevDayBtn) {
    prevDayBtn.addEventListener('click', () => {
      currentDate.setDate(currentDate.getDate() - 1);
      updateDateDisplay();
      renderCurrentView();
    });
  }

  if (nextDayBtn) {
    nextDayBtn.addEventListener('click', () => {
      currentDate.setDate(currentDate.getDate() + 1);
      updateDateDisplay();
      renderCurrentView();
    });
  }

  const dateDisplay = document.getElementById('current-date-display');
  if (dateDisplay) {
    dateDisplay.style.cursor = 'pointer';
    dateDisplay.title = 'Click to jump to Today';
    dateDisplay.addEventListener('click', () => {
      currentDate = new Date();
      updateDateDisplay();
      renderCurrentView();
    });
  }

  updateDateDisplay();
}

function updateDateDisplay() {
  const dateDisplay = document.getElementById('current-date-display');
  if (!dateDisplay) return;

  const today = new Date();
  const isToday = currentDate.toDateString() === today.toDateString();

  if (isToday) {
    dateDisplay.textContent = t('today');
  } else {
    const options = { month: 'short', day: 'numeric' };
    dateDisplay.textContent = currentDate.toLocaleDateString(getLanguage() === 'uk' ? 'uk-UA' : 'en-US', options);
  }
}

export function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.getAttribute('data-tab') === tab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Show/hide date selector in header when not in dashboard or log meal
  const dateSelector = document.getElementById('header-date-selector');
  if (dateSelector) {
    dateSelector.style.display = (tab === 'dashboard' || tab === 'logMeal') ? 'flex' : 'none';
  }

  renderCurrentView();
}

function renderCurrentView() {
  const container = document.getElementById('view-content');
  if (!container) return;

  if (currentTab === 'dashboard') {
    renderDashboard(container, currentDate, () => updateDateDisplay(), () => switchTab('logMeal'));
  } else if (currentTab === 'analytics') {
    renderAnalytics(container);
  } else if (currentTab === 'logMeal') {
    renderLogMeal(container, currentDate, () => switchTab('dashboard'));
  } else if (currentTab === 'foodDb') {
    renderFoodDb(container);
  } else if (currentTab === 'settings') {
    renderSettings(container, () => {
      updateNavLabels();
      updateDateDisplay();
      renderCurrentView();
    });
  }
}

function updateNavLabels() {
  const dashLabel = document.getElementById('nav-label-dashboard');
  const analyticsLabel = document.getElementById('nav-label-analytics');
  const logLabel = document.getElementById('nav-label-log');
  const dbLabel = document.getElementById('nav-label-fooddb');
  const setLabel = document.getElementById('nav-label-settings');

  if (dashLabel) dashLabel.textContent = t('dashboard_nav');
  if (analyticsLabel) analyticsLabel.textContent = t('analytics_nav');
  if (logLabel) logLabel.textContent = t('log_nav');
  if (dbLabel) dbLabel.textContent = t('fooddb_nav');
  if (setLabel) setLabel.textContent = t('settings_nav');
}

window.addEventListener('DOMContentLoaded', init);
