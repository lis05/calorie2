import { t, setLanguage, getLanguage } from '../i18n.js';
import { getTargetsForDate, saveDailyTargets, exportAllData, importAllData, clearAllData, toLocalDateString } from '../db.js';
import { APP_VERSION } from '../version.js';

export async function renderSettings(container, onLanguageChanged) {
  const todayStr = toLocalDateString(new Date());
  const targets = await getTargetsForDate(todayStr);
  const targetCal = targets.calories || 2000;
  const targetPro = targets.protein || 90;
  const targetCarb = targets.carbs || 220;
  const targetFat = targets.fats || 65;
  const targetSatFat = targets.saturated_fats !== undefined ? targets.saturated_fats : (targets.sat_fat !== undefined ? targets.sat_fat : 20);
  const targetFib = targets.fiber || 30;
  const targetSalt = targets.salt !== undefined ? targets.salt : 5;
  const targetSugar = targets.sugar || 40;
  const currentLang = getLanguage();
  const currentTheme = localStorage.getItem('calorie2_theme') || 'dark';

  container.innerHTML = `
    <h2 style="font-size:1.2rem; font-weight:700; margin-bottom:14px;">${t('settings')}</h2>

    <div class="card">
      <h3 style="font-size:1rem; font-weight:700; margin-bottom:12px;">${t('daily_targets')}</h3>
      <form id="targets-form">
        <div class="form-group">
          <label class="form-label">${t('target_calories')}</label>
          <input type="number" id="set-target-cal" class="form-input" value="${targetCal}" required />
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:12px;">
          <div class="form-group">
            <label class="form-label">${t('target_protein')}</label>
            <input type="number" id="set-target-pro" class="form-input" value="${targetPro}" required />
          </div>
          <div class="form-group">
            <label class="form-label">${t('target_carbs')}</label>
            <input type="number" id="set-target-carb" class="form-input" value="${targetCarb}" required />
          </div>
          <div class="form-group">
            <label class="form-label">${t('target_fats')}</label>
            <input type="number" id="set-target-fat" class="form-input" value="${targetFat}" required />
          </div>
          <div class="form-group">
            <label class="form-label">${t('target_sat_fat')}</label>
            <input type="number" id="set-target-sat-fat" class="form-input" value="${targetSatFat}" required />
          </div>
          <div class="form-group">
            <label class="form-label">${t('target_fiber')}</label>
            <input type="number" id="set-target-fib" class="form-input" value="${targetFib}" required />
          </div>
          <div class="form-group">
            <label class="form-label">${t('target_salt')}</label>
            <input type="number" id="set-target-salt" class="form-input" step="0.0001" value="${targetSalt}" required />
          </div>
          <div class="form-group">
            <label class="form-label">${t('target_sugar')}</label>
            <input type="number" id="set-target-sug" class="form-input" value="${targetSugar}" required />
          </div>
        </div>
        <button type="submit" class="btn-primary" style="padding:10px;">${t('save')}</button>
      </form>
    </div>

    <div class="card">
      <h3 style="font-size:1rem; font-weight:700; margin-bottom:12px;">${t('language')} & ${t('theme')}</h3>
      <div class="form-group">
        <label class="form-label">${t('language')}</label>
        <select id="select-lang" class="form-input">
          <option value="uk" ${currentLang === 'uk' ? 'selected' : ''}>Українська</option>
          <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('theme')}</label>
        <select id="select-theme" class="form-input">
          <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>${t('theme_dark')}</option>
          <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>${t('theme_light')}</option>
        </select>
      </div>
    </div>

    <div class="card">
      <h3 style="font-size:1rem; font-weight:700; margin-bottom:12px;">${t('data_management')}</h3>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button id="btn-force-update" class="btn-secondary" style="border-color:var(--accent-secondary); color:var(--accent-secondary); font-weight:600;">
          🔄 ${t('check_updates')}
        </button>
        <button id="btn-export" class="btn-secondary">📥 ${t('export_data')}</button>
        <button id="btn-import-trigger" class="btn-secondary">📤 ${t('import_data')}</button>
        <input type="file" id="file-import-input" accept=".json" style="display:none;" />
        <button id="btn-clear-data" class="btn-secondary" style="color:var(--accent-danger); border-color:rgba(239, 68, 68, 0.3);">
          🗑️ ${t('clear_all_data')}
        </button>
      </div>
    </div>

    <div style="text-align:center; padding: 4px 0 20px; font-size: 0.8rem; color: var(--text-faint);">
      ${t('version')}: <span style="font-family: monospace; font-weight:700; color: var(--text-muted);">${APP_VERSION}</span>
    </div>
  `;

  // Targets form submit
  const targetsForm = container.querySelector('#targets-form');
  targetsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const c = Number(container.querySelector('#set-target-cal').value);
    const p = Number(container.querySelector('#set-target-pro').value);
    const cb = Number(container.querySelector('#set-target-carb').value);
    const f = Number(container.querySelector('#set-target-fat').value);
    const sf = Number(container.querySelector('#set-target-sat-fat').value);
    const fb = Number(container.querySelector('#set-target-fib').value);
    const sl = Number(container.querySelector('#set-target-salt').value);
    const sg = Number(container.querySelector('#set-target-sug').value);

    const todayStr = toLocalDateString(new Date());
    await saveDailyTargets({
      calories: c,
      protein: p,
      carbs: cb,
      fats: f,
      saturated_fats: sf,
      fiber: fb,
      salt: sl,
      sugar: sg
    }, todayStr);

    alert(t('save') + ' ✓');
  });

  // Language switch
  const langSelect = container.querySelector('#select-lang');
  langSelect.addEventListener('change', (e) => {
    setLanguage(e.target.value);
    onLanguageChanged();
  });

  // Theme switch
  const themeSelect = container.querySelector('#select-theme');
  themeSelect.addEventListener('change', (e) => {
    const theme = e.target.value;
    localStorage.setItem('calorie2_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  });

  // Force update / clear cache
  const forceUpdateBtn = container.querySelector('#btn-force-update');
  if (forceUpdateBtn) {
    forceUpdateBtn.addEventListener('click', async () => {
      forceUpdateBtn.disabled = true;
      forceUpdateBtn.textContent = '⏳ ' + t('updating');
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.unregister();
          }
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (err) {
        console.error('Update error:', err);
      }
      // Clean cache-busting reload that cleanly resets PWA viewport
      const cleanUrl = window.location.href.split('?')[0].split('#')[0];
      window.location.replace(cleanUrl + '?t=' + Date.now());
    });
  }

  // Export JSON
  container.querySelector('#btn-export').addEventListener('click', async () => {
    const data = await exportAllData();
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calorie2_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import JSON
  const importInput = container.querySelector('#file-import-input');
  container.querySelector('#btn-import-trigger').addEventListener('click', () => {
    importInput.click();
  });

  importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importAllData(parsed);
      alert(t('data_imported'));
      onLanguageChanged();
    } catch (err) {
      alert(t('import_error') + ': ' + err.message);
    }
  });

  // Clear data
  container.querySelector('#btn-clear-data').addEventListener('click', async () => {
    if (confirm(t('confirm_clear_all'))) {
      await clearAllData();
      alert('Data cleared.');
      onLanguageChanged();
    }
  });
}
