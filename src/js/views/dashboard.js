import { t, getLanguage } from '../i18n.js';
import { getMealsByDate, deleteMeal, updateMeal, getTargetsForDate, getFoodById, getAllFoods, toLocalDateString } from '../db.js';
import { getFoodDisplayName } from '../defaultFoods.js';

export async function renderDashboard(container, currentDate, onDateChange, onNavigateToLog) {
  const currentLang = getLanguage();
  const dateStr = toLocalDateString(currentDate);
  const meals = await getMealsByDate(dateStr);
  const allFoods = await getAllFoods();
  const foodsMap = new Map(allFoods.map(f => [f.id, f]));

  const targets = await getTargetsForDate(dateStr);
  const targetCal = targets.calories || 2000;
  const targetPro = targets.protein || 90;
  const targetCarb = targets.carbs || 220;
  const targetFat = targets.fats || 65;
  const targetSatFat = targets.saturated_fats !== undefined ? targets.saturated_fats : 20;
  const targetFib = targets.fiber || 30;
  const targetSalt = targets.salt || 5;
  const targetSugar = targets.sugar || 40;

  // Calculate totals
  let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0, totalSatFat = 0, totalFib = 0, totalSalt = 0, totalSugar = 0;
  for (const m of meals) {
    totalCal += m.calories || 0;
    totalPro += m.protein || 0;
    totalCarb += m.carbs || 0;
    totalFat += m.fats || 0;
    totalSatFat += m.saturated_fats || m.sat_fat || 0;
    totalFib += m.fiber || 0;
    totalSalt += m.salt || 0;
    totalSugar += m.sugar || 0;
  }

  totalCal = Math.round(totalCal);
  totalPro = Math.round(totalPro * 10) / 10;
  totalCarb = Math.round(totalCarb * 10) / 10;
  totalFat = Math.round(totalFat * 10) / 10;
  totalSatFat = Math.round(totalSatFat * 10) / 10;
  totalFib = Math.round(totalFib * 10) / 10;
  totalSalt = Math.round(totalSalt * 10000) / 10000;
  totalSugar = Math.round(totalSugar * 10) / 10;

  const remainingCal = targetCal - totalCal;
  const isOver = remainingCal < 0;

  container.innerHTML = `
    <!-- 3x3 Stats Grid -->
    <div class="targets-grid-3x3">
      <!-- (1, 1) & (1, 2): Calories -->
      <div class="target-stat-box cal-box">
        <div class="stat-label"><span class="stat-dot cal"></span>${t('calories_label')}</div>
        <div class="cal-main-row">
          <span class="cal-main-val" style="color: ${isOver ? 'var(--accent-warning)' : 'var(--stat-cal)'}">${totalCal}</span>
          <span class="stat-target">/ ${targetCal}</span>
        </div>
        <div class="cal-sub-text">
          ${isOver ? `+${Math.abs(remainingCal)} ${t('over_goal')}` : `${remainingCal} ${t('remaining_kcal')}`}
        </div>
      </div>

      <!-- (1, 3): Protein -->
      <div class="target-stat-box">
        <div class="stat-label"><span class="stat-dot pro"></span>${t('protein')}</div>
        <div class="stat-value" style="color:var(--stat-pro)">${totalPro}</div>
        <div class="stat-target">/ ${targetPro}</div>
      </div>

      <!-- (2, 1): Fats -->
      <div class="target-stat-box">
        <div class="stat-label"><span class="stat-dot fat"></span>${t('fats')}</div>
        <div class="stat-value" style="color:var(--stat-fat)">${totalFat}</div>
        <div class="stat-target">/ ${targetFat}</div>
      </div>

      <!-- (2, 2): Carbs -->
      <div class="target-stat-box">
        <div class="stat-label"><span class="stat-dot carb"></span>${t('carbs')}</div>
        <div class="stat-value" style="color:var(--stat-carb)">${totalCarb}</div>
        <div class="stat-target">/ ${targetCarb}</div>
      </div>

      <!-- (2, 3): Fiber -->
      <div class="target-stat-box">
        <div class="stat-label"><span class="stat-dot fib"></span>${t('fiber')}</div>
        <div class="stat-value" style="color:var(--stat-fib)">${totalFib}</div>
        <div class="stat-target">/ ${targetFib}</div>
      </div>

      <!-- (3, 1): Saturated Fats -->
      <div class="target-stat-box">
        <div class="stat-label"><span class="stat-dot sat-fat"></span>${t('saturated_fats_short')}</div>
        <div class="stat-value" style="color:var(--stat-sat-fat)">${totalSatFat}</div>
        <div class="stat-target">/ ${targetSatFat}</div>
      </div>

      <!-- (3, 2): Sugar -->
      <div class="target-stat-box">
        <div class="stat-label"><span class="stat-dot sug"></span>${t('sugar')}</div>
        <div class="stat-value" style="color:var(--stat-sug)">${totalSugar}</div>
        <div class="stat-target">/ ${targetSugar}</div>
      </div>

      <!-- (3, 3): Salt -->
      <div class="target-stat-box">
        <div class="stat-label"><span class="stat-dot salt"></span>${t('salt')}</div>
        <div class="stat-value" style="color:var(--stat-salt)">${totalSalt}</div>
        <div class="stat-target">/ ${targetSalt}</div>
      </div>
    </div>

    <div class="section-header">
      <span>${t('todays_meals')}</span>
      <button id="btn-quick-log" class="icon-btn" style="color:var(--accent-primary); font-size:1.4rem;">＋</button>
    </div>

    <div id="meals-list">
      ${meals.length === 0 ? `
        <div class="empty-state">
          <div class="icon">🥗</div>
          <div>${t('no_meals_today')}</div>
          <button id="btn-empty-log" class="btn-primary" style="margin-top:16px; width:auto; display:inline-flex;">
            ＋ ${t('log_meal')}
          </button>
        </div>
      ` : meals.map(m => `
        <div class="food-card clickable" data-meal-id="${m.id}">
          <div class="food-card-header">
            <div style="flex:1;">
              <h4 class="food-card-title">${getFoodDisplayName(foodsMap.get(m.food_id) || m.food_name, currentLang)}</h4>
              <div class="food-card-sub">
                <span class="meal-badge">${t(m.meal_type || 'snack')}</span>
                <span>${m.amount_g} ${t('grams')}</span>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="food-card-cal">
                ${Math.round(m.calories)}
                <div class="food-card-cal-sub">${t('kcal')}</div>
              </div>
              <button class="btn-delete-item" data-delete-id="${m.id}" title="${t('delete')}">✕</button>
            </div>
          </div>

          <!-- 2xN Stats Table -->
          <div class="stats-table-2xn">
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot pro"></span>${t('protein')}</span>
              <span class="stat-cell-val pro">${m.protein || 0}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot carb"></span>${t('carbs')}</span>
              <span class="stat-cell-val carb">${m.carbs || 0}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot fat"></span>${t('fats')}</span>
              <span class="stat-cell-val fat">${m.fats || 0}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot sat-fat"></span>${t('saturated_fats_short')}</span>
              <span class="stat-cell-val sat-fat">${m.saturated_fats !== undefined ? m.saturated_fats : (m.sat_fat || 0)}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot fib"></span>${t('fiber')}</span>
              <span class="stat-cell-val fib">${m.fiber || 0}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot salt"></span>${t('salt')}</span>
              <span class="stat-cell-val salt">${m.salt !== undefined ? m.salt : 0}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot sug"></span>${t('sugar')}</span>
              <span class="stat-cell-val sug">${m.sugar || 0}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Edit Meal Modal -->
    <div id="edit-meal-modal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 id="edit-modal-title">${t('edit_meal')}</h3>
          <button id="edit-modal-close" class="icon-btn">✕</button>
        </div>

        <div style="text-align:center; margin: 10px 0 16px;">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">${t('amount_g')}</div>
          <input type="number" id="edit-grams-input" class="form-input" min="1" step="1"
            style="font-size:2rem; text-align:center; font-weight:800; width:160px; margin:0 auto; padding:8px;" />
        </div>

        <!-- Live nutrition calculation preview in 2xN grid -->
        <div class="card" style="background:var(--surface-color); padding:14px; margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:700;">${t('calories_label')}:</span>
            <span id="edit-preview-cal" style="font-size:1.35rem; font-weight:800; color:var(--stat-cal);">0 ${t('kcal')}</span>
          </div>
          <div class="stats-table-2xn">
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot pro"></span>${t('protein')}</span>
              <span id="edit-preview-pro" class="stat-cell-val pro">0</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot carb"></span>${t('carbs')}</span>
              <span id="edit-preview-carb" class="stat-cell-val carb">0</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot fat"></span>${t('fats')}</span>
              <span id="edit-preview-fat" class="stat-cell-val fat">0</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot sat-fat"></span>${t('saturated_fats_short')}</span>
              <span id="edit-preview-sat-fat" class="stat-cell-val sat-fat">0</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot fib"></span>${t('fiber')}</span>
              <span id="edit-preview-fib" class="stat-cell-val fib">0</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot salt"></span>${t('salt')}</span>
              <span id="edit-preview-salt" class="stat-cell-val salt">0</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot sug"></span>${t('sugar')}</span>
              <span id="edit-preview-sug" class="stat-cell-val sug">0</span>
            </div>
          </div>
        </div>

        <button id="btn-save-edit-meal" class="btn-primary">
          ${t('save_changes')}
        </button>
      </div>
    </div>
  `;

  // Listeners
  const editModal = container.querySelector('#edit-meal-modal');
  const editTitle = container.querySelector('#edit-modal-title');
  const editGramsInput = container.querySelector('#edit-grams-input');
  const editCloseBtn = container.querySelector('#edit-modal-close');
  const saveEditBtn = container.querySelector('#btn-save-edit-meal');

  const epCal = container.querySelector('#edit-preview-cal');
  const epPro = container.querySelector('#edit-preview-pro');
  const epCarb = container.querySelector('#edit-preview-carb');
  const epFat = container.querySelector('#edit-preview-fat');
  const epSatFat = container.querySelector('#edit-preview-sat-fat');
  const epFib = container.querySelector('#edit-preview-fib');
  const epSalt = container.querySelector('#edit-preview-salt');
  const epSug = container.querySelector('#edit-preview-sug');

  let activeEditingMeal = null;
  let activeBaseFood = null;

  function updateEditPreview() {
    if (!activeEditingMeal) return;
    const g = parseFloat(editGramsInput.value) || 0;
    let per100 = activeBaseFood;
    if (!per100) {
      const origG = activeEditingMeal.amount_g || 100;
      per100 = {
        calories: (activeEditingMeal.calories / origG) * 100,
        protein: (activeEditingMeal.protein / origG) * 100,
        carbs: (activeEditingMeal.carbs / origG) * 100,
        fats: (activeEditingMeal.fats / origG) * 100,
        saturated_fats: ((activeEditingMeal.saturated_fats !== undefined ? activeEditingMeal.saturated_fats : (activeEditingMeal.sat_fat || 0)) / origG) * 100,
        fiber: (activeEditingMeal.fiber / origG) * 100,
        salt: (activeEditingMeal.salt / origG) * 100,
        sugar: (activeEditingMeal.sugar / origG) * 100
      };
    }

    const factor = g / 100;
    epCal.textContent = `${Math.round((per100.calories || 0) * factor)} ${t('kcal')}`;
    epPro.textContent = `${Math.round((per100.protein || 0) * factor * 10) / 10}`;
    epCarb.textContent = `${Math.round((per100.carbs || 0) * factor * 10) / 10}`;
    epFat.textContent = `${Math.round((per100.fats || 0) * factor * 10) / 10}`;
    epSatFat.textContent = `${Math.round((per100.saturated_fats !== undefined ? per100.saturated_fats : (per100.sat_fat || 0)) * factor * 10) / 10}`;
    epFib.textContent = `${Math.round((per100.fiber || 0) * factor * 10) / 10}`;
    epSalt.textContent = `${Math.round((per100.salt || 0) * factor * 10000) / 10000}`;
    epSug.textContent = `${Math.round((per100.sugar || 0) * factor * 10) / 10}`;
  }

  async function openEditModal(meal) {
    if (editModal && editModal.parentElement !== document.getElementById('app')) {
      document.getElementById('app').appendChild(editModal);
    }
    activeEditingMeal = meal;
    if (meal.food_id) {
      activeBaseFood = await getFoodById(meal.food_id);
    } else {
      activeBaseFood = null;
    }
    const displayName = getFoodDisplayName(activeBaseFood || meal.food_name, currentLang);
    editTitle.textContent = `${t('edit')}: ${displayName}`;
    editGramsInput.value = meal.amount_g;
    updateEditPreview();
    editModal.classList.add('open');
    setTimeout(() => {
      editGramsInput.focus();
      editGramsInput.select();
    }, 150);
  }

  function closeEditModal() {
    editModal.classList.remove('open');
    activeEditingMeal = null;
    activeBaseFood = null;
  }

  editCloseBtn.addEventListener('click', closeEditModal);
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
  });
  editGramsInput.addEventListener('input', updateEditPreview);

  saveEditBtn.addEventListener('click', async () => {
    if (!activeEditingMeal) return;
    const g = parseFloat(editGramsInput.value) || 0;
    if (g <= 0) return;

    let per100 = activeBaseFood;
    if (!per100) {
      const origG = activeEditingMeal.amount_g || 100;
      per100 = {
        calories: (activeEditingMeal.calories / origG) * 100,
        protein: (activeEditingMeal.protein / origG) * 100,
        carbs: (activeEditingMeal.carbs / origG) * 100,
        fats: (activeEditingMeal.fats / origG) * 100,
        saturated_fats: ((activeEditingMeal.saturated_fats !== undefined ? activeEditingMeal.saturated_fats : (activeEditingMeal.sat_fat || 0)) / origG) * 100,
        fiber: (activeEditingMeal.fiber / origG) * 100,
        salt: (activeEditingMeal.salt / origG) * 100,
        sugar: (activeEditingMeal.sugar / origG) * 100
      };
    }

    const factor = g / 100;
    activeEditingMeal.amount_g = g;
    activeEditingMeal.calories = (per100.calories || 0) * factor;
    activeEditingMeal.protein = Math.round((per100.protein || 0) * factor * 10) / 10;
    activeEditingMeal.carbs = Math.round((per100.carbs || 0) * factor * 10) / 10;
    activeEditingMeal.fats = Math.round((per100.fats || 0) * factor * 10) / 10;
    activeEditingMeal.saturated_fats = Math.round((per100.saturated_fats !== undefined ? per100.saturated_fats : (per100.sat_fat || 0)) * factor * 10) / 10;
    activeEditingMeal.fiber = Math.round((per100.fiber || 0) * factor * 10) / 10;
    activeEditingMeal.salt = Math.round((per100.salt || 0) * factor * 10000) / 10000;
    activeEditingMeal.sugar = Math.round((per100.sugar || 0) * factor * 10) / 10;

    await updateMeal(activeEditingMeal);
    closeEditModal();
    renderDashboard(container, currentDate, onDateChange, onNavigateToLog);
  });

  // Clicking meal opens edit modal
  container.querySelectorAll('[data-meal-id]').forEach(card => {
    card.addEventListener('click', (e) => {
      // ignore if delete button was clicked
      if (e.target.closest('[data-delete-id]')) return;
      const id = Number(card.getAttribute('data-meal-id'));
      const meal = meals.find(m => m.id === id);
      if (meal) openEditModal(meal);
    });
  });

  // Delete button
  container.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number(btn.getAttribute('data-delete-id'));
      if (confirm(t('confirm_delete_meal'))) {
        await deleteMeal(id);
        renderDashboard(container, currentDate, onDateChange, onNavigateToLog);
      }
    });
  });

  const quickLogBtn = container.querySelector('#btn-quick-log');
  if (quickLogBtn) quickLogBtn.addEventListener('click', onNavigateToLog);

  const emptyLogBtn = container.querySelector('#btn-empty-log');
  if (emptyLogBtn) emptyLogBtn.addEventListener('click', onNavigateToLog);
}
