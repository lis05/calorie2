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
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:12px;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">${t('food_name_uk')} *</label>
              <input type="text" id="food-name-uk-input" class="form-input" placeholder="напр. Банан" required />
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">${t('food_name_en')}</label>
              <input type="text" id="food-name-en-input" class="form-input" placeholder="e.g. Banana" />
            </div>
          </div>

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
  const foodNameUkInput = container.querySelector('#food-name-uk-input');
  const foodNameEnInput = container.querySelector('#food-name-en-input');
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
      foodNameUkInput.value = food.name_uk || food.name || '';
      foodNameEnInput.value = food.name_en || (currentLang === 'en' ? food.name : '');
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
      foodNameUkInput.value = '';
      foodNameEnInput.value = '';
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
      return `
        <div class="food-card clickable" data-edit-id="${f.id}">
          <div class="food-card-header">
            <div style="flex:1;">
              <h4 class="food-card-title">${displayName}</h4>
              <div class="food-card-sub">
                <span>${t('per_100g')} · <b style="color:var(--accent-secondary)">${t('edit')}</b></span>
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
      return n.includes(q) || nuk.includes(q) || nen.includes(q);
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
    const nameUk = foodNameUkInput.value.trim();
    const nameEn = foodNameEnInput.value.trim() || nameUk;
    const cal = Math.max(0, parseFloat(foodCalInput.value) || 0);
    const pro = Math.max(0, parseFloat(foodProInput.value) || 0);
    const carb = Math.max(0, parseFloat(foodCarbInput.value) || 0);
    const fat = Math.max(0, parseFloat(foodFatInput.value) || 0);
    const satFat = Math.max(0, parseFloat(foodSatFatInput.value) || 0);
    const fib = Math.max(0, parseFloat(foodFibInput.value) || 0);
    const salt = Math.max(0, parseFloat(foodSaltInput.value) || 0);
    const sug = Math.max(0, parseFloat(foodSugInput.value) || 0);

    if (id) {
      // update existing
      const existing = foods.find(x => x.id === id) || {};
      const updated = {
        ...existing,
        id,
        name: nameUk,
        name_uk: nameUk,
        name_en: nameEn,
        calories: cal,
        protein: pro,
        carbs: carb,
        fats: fat,
        saturated_fats: satFat,
        fiber: fib,
        salt,
        sugar: sug
      };
      await updateFood(updated);
    } else {
      // create new
      const newFood = {
        name: nameUk,
        name_uk: nameUk,
        name_en: nameEn,
        calories: cal,
        protein: pro,
        carbs: carb,
        fats: fat,
        saturated_fats: satFat,
        fiber: fib,
        salt,
        sugar: sug
      };
      await addFood(newFood);
    }

    closeModal();
    foods = await getAllFoods();
    renderRows(foods);
  });

  renderRows(foods);
}
