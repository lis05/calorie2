import { t, getLanguage } from '../i18n.js';
import { getAllFoods, addFood, updateFood, deleteFood } from '../db.js';
import { getFoodDisplayName } from '../defaultFoods.js';

export async function renderFoodDb(container) {
  let foods = await getAllFoods();
  const currentLang = getLanguage();

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <h2 style="font-size:1.2rem; font-weight:700;">${t('food_database')}</h2>
      <button id="btn-open-add-food" class="btn-primary" style="width:auto; padding:8px 14px; font-size:0.9rem;">
        ＋ ${t('add')}
      </button>
    </div>

    <input type="text" id="food-db-search" class="form-input" placeholder="${t('search_food')}" style="margin-bottom:14px;" />

    <div id="food-db-list"></div>

    <!-- Modal for adding / editing food in library -->
    <div id="food-edit-modal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 id="modal-title-text">${t('add_food')}</h3>
          <button id="food-edit-close-btn" class="icon-btn">✕</button>
        </div>

        <form id="food-item-form">
          <input type="hidden" id="food-id" />
          ${currentLang === 'en' ? `
            <div class="form-group" style="margin-bottom:8px;">
              <label class="form-label">${t('full_name')} *</label>
              <input type="text" id="food-full-name-input" class="form-input" placeholder="e.g. Boiled chicken egg (1 pc ~50g)" required />
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:12px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">${t('short_name')}</label>
                <input type="text" id="food-short-name-input" class="form-input" placeholder="e.g. Boiled egg" />
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">${t('ukr_name')}</label>
                <input type="text" id="food-ukr-name-input" class="form-input" placeholder="напр. Варене яйце" />
              </div>
            </div>
          ` : `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:12px;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">${t('short_name')} *</label>
                <input type="text" id="food-short-name-input" class="form-input" placeholder="напр. Банан" required />
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">${t('long_name')} *</label>
                <input type="text" id="food-long-name-input" class="form-input" placeholder="напр. Банан свіжий" required />
              </div>
            </div>
          `}

          <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">
            ${t('per_100g')}:
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:14px;">
            <div class="form-group">
              <label class="form-label">${t('target_calories')} *</label>
              <input type="number" id="food-cal-input" class="form-input" step="0.1" required />
            </div>
            <div class="form-group">
              <label class="form-label">${t('protein')}</label>
              <input type="number" id="food-pro-input" class="form-input" step="0.1" value="0" />
            </div>
            <div class="form-group">
              <label class="form-label">${t('carbs')}</label>
              <input type="number" id="food-carb-input" class="form-input" step="0.1" value="0" />
            </div>
            <div class="form-group">
              <label class="form-label">${t('fats')}</label>
              <input type="number" id="food-fat-input" class="form-input" step="0.1" value="0" />
            </div>
            <div class="form-group">
              <label class="form-label">${t('saturated_fats')}</label>
              <input type="number" id="food-sat-fat-input" class="form-input" step="0.1" value="0" />
            </div>
            <div class="form-group">
              <label class="form-label">${t('fiber')}</label>
              <input type="number" id="food-fib-input" class="form-input" step="0.1" value="0" />
            </div>
            <div class="form-group">
              <label class="form-label">${t('salt')}</label>
              <input type="number" id="food-salt-input" class="form-input" step="0.0001" value="0" />
            </div>
            <div class="form-group">
              <label class="form-label">${t('sugar')}</label>
              <input type="number" id="food-sug-input" class="form-input" step="0.1" value="0" />
            </div>
          </div>

          <button type="submit" class="btn-primary" id="btn-save-food">${t('save')}</button>
        </form>
      </div>
    </div>
  `;

  const listContainer = container.querySelector('#food-db-list');
  const searchInput = container.querySelector('#food-db-search');
  const modal = container.querySelector('#food-edit-modal');
  const modalTitle = container.querySelector('#modal-title-text');
  const openModalBtn = container.querySelector('#btn-open-add-food');
  const closeModalBtn = container.querySelector('#food-edit-close-btn');
  const form = container.querySelector('#food-item-form');

  const foodIdInput = container.querySelector('#food-id');
  const foodFullNameInput = container.querySelector('#food-full-name-input');
  const foodShortNameInput = container.querySelector('#food-short-name-input');
  const foodUkrNameInput = container.querySelector('#food-ukr-name-input');
  const foodLongNameInput = container.querySelector('#food-long-name-input');
  const foodCalInput = container.querySelector('#food-cal-input');
  const foodProInput = container.querySelector('#food-pro-input');
  const foodCarbInput = container.querySelector('#food-carb-input');
  const foodFatInput = container.querySelector('#food-fat-input');
  const foodSatFatInput = container.querySelector('#food-sat-fat-input');
  const foodFibInput = container.querySelector('#food-fib-input');
  const foodSaltInput = container.querySelector('#food-salt-input');
  const foodSugInput = container.querySelector('#food-sug-input');

  function openModal(food = null) {
    document.querySelectorAll('#app > #food-edit-modal').forEach(el => {
      if (el !== modal) el.remove();
    });
    if (modal && modal.parentElement !== document.getElementById('app')) {
      document.getElementById('app').appendChild(modal);
    }
    if (food) {
      modalTitle.textContent = `${t('edit')}: ${getFoodDisplayName(food, currentLang)}`;
      foodIdInput.value = food.id;
      if (currentLang === 'en') {
        if (foodFullNameInput) foodFullNameInput.value = food.name_en || food.long_name || food.name || '';
        if (foodShortNameInput) foodShortNameInput.value = food.short_name_en || food.short_name || '';
        if (foodUkrNameInput) foodUkrNameInput.value = food.name_uk || food.short_name_uk || '';
      } else {
        if (foodShortNameInput) foodShortNameInput.value = food.short_name_uk || food.short_name || food.name_uk || food.name || '';
        if (foodLongNameInput) foodLongNameInput.value = food.long_name || food.name_uk || food.name || '';
      }
      foodCalInput.value = food.calories || 0;
      foodProInput.value = food.protein || 0;
      foodCarbInput.value = food.carbs || 0;
      foodFatInput.value = food.fats || 0;
      foodSatFatInput.value = food.saturated_fats !== undefined ? food.saturated_fats : (food.sat_fat || 0);
      foodFibInput.value = food.fiber || 0;
      foodSaltInput.value = food.salt !== undefined ? food.salt : 0;
      foodSugInput.value = food.sugar || 0;
    } else {
      modalTitle.textContent = t('add_food');
      form.reset();
      foodIdInput.value = '';
      if (foodFullNameInput) foodFullNameInput.value = '';
      if (foodShortNameInput) foodShortNameInput.value = '';
      if (foodUkrNameInput) foodUkrNameInput.value = '';
      if (foodLongNameInput) foodLongNameInput.value = '';
      foodCalInput.value = '';
      foodProInput.value = '0';
      foodCarbInput.value = '0';
      foodFatInput.value = '0';
      foodSatFatInput.value = '0';
      foodFibInput.value = '0';
      foodSaltInput.value = '0';
      foodSugInput.value = '0';
    }
    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
  }

  function renderRows(items) {
    if (items.length === 0) {
      listContainer.innerHTML = `<div class="empty-state"><div>${t('no_foods_found')}</div></div>`;
      return;
    }

    listContainer.innerHTML = items.map(f => {
      const displayName = getFoodDisplayName(f, currentLang);
      const fullName = currentLang === 'en' ? (f.name_en || f.long_name || f.name) : (f.long_name || f.name_uk || f.name);
      const showSubName = fullName && fullName !== displayName;
      return `
        <div class="food-card clickable" data-edit-id="${f.id}">
          <div class="food-card-header">
            <div style="flex:1;">
              <h4 class="food-card-title">${displayName}</h4>
              <div class="food-card-sub">
                <span>${showSubName ? `<span style="color:var(--text-muted);">${fullName} · </span>` : ''}${t('per_100g')} · <b style="color:var(--accent-secondary)">${t('edit')}</b></span>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="food-card-cal">
                ${Math.round(f.calories)}
                <div class="food-card-cal-sub">${t('kcal')}</div>
              </div>
              <button class="btn-delete-item" data-del-food="${f.id}" title="${t('delete')}">✕</button>
            </div>
          </div>

          <!-- 2xN Stats Table -->
          <div class="stats-table-2xn">
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot pro"></span>${t('protein')}</span>
              <span class="stat-cell-val pro">${f.protein || 0}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot carb"></span>${t('carbs')}</span>
              <span class="stat-cell-val carb">${f.carbs || 0}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot fat"></span>${t('fats')}</span>
              <span class="stat-cell-val fat">${f.fats || 0}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot sat-fat"></span>${t('saturated_fats_short')}</span>
              <span class="stat-cell-val sat-fat">${f.saturated_fats !== undefined ? f.saturated_fats : (f.sat_fat || 0)}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot fib"></span>${t('fiber')}</span>
              <span class="stat-cell-val fib">${f.fiber || 0}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot salt"></span>${t('salt')}</span>
              <span class="stat-cell-val salt">${f.salt !== undefined ? f.salt : 0}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot sug"></span>${t('sugar')}</span>
              <span class="stat-cell-val sug">${f.sugar || 0}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Click card to edit food
    listContainer.querySelectorAll('[data-edit-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-del-food]')) return;
        const id = Number(card.getAttribute('data-edit-id'));
        const f = foods.find(x => x.id === id);
        if (f) openModal(f);
      });
    });

    listContainer.querySelectorAll('[data-del-food]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = Number(btn.getAttribute('data-del-food'));
        if (confirm(t('confirm_delete_food'))) {
          await deleteFood(id);
          foods = await getAllFoods();
          renderRows(foods);
        }
      });
    });
  }

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderRows(foods);
      return;
    }
    renderRows(foods.filter(f => {
      const n = (f.name || '').toLowerCase();
      const nuk = (f.name_uk || '').toLowerCase();
      const nen = (f.name_en || '').toLowerCase();
      const s = (f.short_name || '').toLowerCase();
      const suk = (f.short_name_uk || '').toLowerCase();
      const sen = (f.short_name_en || '').toLowerCase();
      const l = (f.long_name || '').toLowerCase();
      return n.includes(q) || nuk.includes(q) || nen.includes(q) || s.includes(q) || suk.includes(q) || sen.includes(q) || l.includes(q);
    }));
  });

  openModalBtn.addEventListener('click', () => openModal(null));
  closeModalBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = foodIdInput.value ? Number(foodIdInput.value) : null;
    const existing = id ? (foods.find(x => x.id === id) || {}) : {};

    let nameUk = '';
    let nameEn = '';
    let shortName = '';
    let longName = '';
    let shortNameUk = '';
    let shortNameEn = '';

    if (currentLang === 'en') {
      const fullName = (foodFullNameInput?.value || '').trim();
      shortName = (foodShortNameInput?.value || '').trim() || fullName;
      const ukrName = (foodUkrNameInput?.value || '').trim();

      nameEn = fullName;
      shortNameEn = shortName;
      nameUk = ukrName || (existing.name_uk || fullName);
      longName = fullName;
      shortNameUk = ukrName ? shortName : (existing.short_name_uk || shortName);
    } else {
      shortName = (foodShortNameInput?.value || '').trim();
      longName = (foodLongNameInput?.value || '').trim() || shortName;

      nameUk = longName;
      shortNameUk = shortName;
      nameEn = existing.name_en || '';
      shortNameEn = existing.short_name_en || '';
    }

    const primaryName = currentLang === 'en' ? (shortName || nameEn) : (shortName || nameUk);
    const cal = Math.max(0, parseFloat(foodCalInput.value) || 0);
    const pro = Math.max(0, parseFloat(foodProInput.value) || 0);
    const carb = Math.max(0, parseFloat(foodCarbInput.value) || 0);
    const fat = Math.max(0, parseFloat(foodFatInput.value) || 0);
    const satFat = Math.max(0, parseFloat(foodSatFatInput.value) || 0);
    const fib = Math.max(0, parseFloat(foodFibInput.value) || 0);
    const salt = Math.max(0, parseFloat(foodSaltInput.value) || 0);
    const sug = Math.max(0, parseFloat(foodSugInput.value) || 0);

    const foodData = {
      ...existing,
      name: primaryName,
      name_uk: nameUk,
      name_en: nameEn,
      short_name: shortName,
      short_name_uk: shortNameUk,
      short_name_en: shortNameEn,
      long_name: longName,
      calories: cal,
      protein: pro,
      carbs: carb,
      fats: fat,
      saturated_fats: satFat,
      fiber: fib,
      salt,
      sugar: sug
    };

    if (id) {
      foodData.id = id;
      await updateFood(foodData);
    } else {
      await addFood(foodData);
    }

    closeModal();
    foods = await getAllFoods();
    renderRows(foods);
  });

  renderRows(foods);
}
