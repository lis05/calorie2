import { t, getLanguage } from '../i18n.js';
import { getMealsByDate, deleteMeal, updateMeal, getTargetsForDate, toLocalDateString, getWeightByDate, saveWeight, deleteWeight, getWaterByDate, saveWater, deleteWater } from '../db.js';
import { getFoodDisplayName } from '../defaultFoods.js';

export async function renderDashboard(container, currentDate, onDateChange, onNavigateToLog) {
  document.querySelectorAll('#app > #edit-meal-modal').forEach(el => el.remove());

  const currentLang = getLanguage();
  const dateStr = toLocalDateString(currentDate);
  const meals = await getMealsByDate(dateStr);
  const currentWeight = await getWeightByDate(dateStr);
  const formattedWeight = currentWeight !== null && currentWeight !== undefined ? Number(currentWeight).toFixed(2) : null;
  const currentWater = await getWaterByDate(dateStr);

  const targets = await getTargetsForDate(dateStr);
  const targetCal = targets.calories || 2000;
  const targetPro = targets.protein || 90;
  const targetCarb = targets.carbs || 220;
  const targetFat = targets.fats || 65;
  const targetSatFat = targets.saturated_fats !== undefined ? targets.saturated_fats : (targets.sat_fat !== undefined ? targets.sat_fat : 20);
  const targetFib = targets.fiber !== undefined ? targets.fiber : 30;
  const targetSalt = targets.salt !== undefined ? targets.salt : 5;
  const targetSugar = targets.sugar !== undefined ? targets.sugar : 40;

  // Calculate totals
  let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0, totalSatFat = 0, totalFib = 0, totalSalt = 0, totalSugar = 0;
  for (const m of meals) {
    totalCal += m.calories || 0;
    totalPro += m.protein || 0;
    totalCarb += m.carbs || 0;
    totalFat += m.fats || 0;
    totalSatFat += Number(m.saturated_fats !== undefined ? m.saturated_fats : (m.sat_fat || 0)) || 0;
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

    <!-- Daily Weight Widget -->
    <div class="card" style="padding: 12px 14px; margin-bottom: 10px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.25rem; line-height: 1;">⚖️</span>
          <span style="font-size: 0.95rem; font-weight: normal; color: var(--text-main);">${t('weight')}</span>
        </div>
        <div id="weight-status-label" style="font-size: 0.85rem; font-weight: normal; color: ${formattedWeight !== null ? 'var(--text-main)' : 'var(--text-muted)'};">
          ${formattedWeight !== null ? `${formattedWeight} ${t('unit_kg')}` : t('no_weight_logged')}
        </div>
      </div>
      <form id="daily-weight-form" style="display: flex; align-items: center; gap: 8px; margin: 0;">
        <input type="number" id="daily-weight-input" class="form-input"
          step="any" min="10" max="500" inputmode="decimal" placeholder="--"
          value="${formattedWeight !== null ? formattedWeight : ''}"
          style="flex: 1; min-width: 0; font-weight: normal; color: var(--text-main); padding: 8px 12px; font-size: 0.95rem;" />
        <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-main);">${t('unit_kg')}</span>
        <button type="submit" id="save-weight-btn" class="btn-primary" style="width: auto; padding: 8px 16px; font-size: 0.85rem; white-space: nowrap;">
          ${t('save')}
        </button>
        ${currentWeight !== null ? `
          <button type="button" id="delete-weight-btn" class="btn-delete-item" title="${t('clear')}" style="padding: 5px 8px;">✕</button>
        ` : ''}
      </form>
    </div>

    <!-- Daily Water Widget -->
    <div class="card" style="padding: 12px 14px; margin-bottom: 14px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.25rem; line-height: 1;">💧</span>
          <span style="font-size: 0.95rem; font-weight: normal; color: var(--text-main);">${t('water')}</span>
        </div>
        <div id="water-status-label" style="font-size: 0.85rem; font-weight: normal; color: ${currentWater !== null ? 'var(--text-main)' : 'var(--text-muted)'};">
          ${currentWater !== null ? `${currentWater} ${t('unit_ml')}` : t('no_water_logged')}
        </div>
      </div>
      <form id="daily-water-form" style="display: flex; align-items: center; gap: 8px; margin: 0;">
        <input type="number" id="daily-water-input" class="form-input"
          step="any" min="0" max="20000" inputmode="numeric" placeholder="+ ${t('unit_ml')}"
          value=""
          style="flex: 1; min-width: 0; font-weight: normal; color: var(--text-main); padding: 8px 12px; font-size: 0.95rem;" />
        <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-main);">${t('unit_ml')}</span>
        <button type="submit" id="save-water-btn" class="btn-primary" style="width: auto; padding: 8px 16px; font-size: 0.85rem; white-space: nowrap;">
          ＋ ${t('add')}
        </button>
        ${currentWater !== null ? `
          <button type="button" id="delete-water-btn" class="btn-delete-item" title="${t('clear')}" style="padding: 5px 8px;">✕</button>
        ` : ''}
      </form>
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
              <h4 class="food-card-title">${getFoodDisplayName(m, currentLang)}</h4>
              <div class="food-card-sub">
                <span class="meal-badge">${t(m.meal_type || 'snack')}</span>
                <span style="color:var(--text-main); font-weight:normal;">${m.amount_g} ${t('grams')}</span>
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
      <form id="edit-meal-form" class="modal-card">
        <div class="modal-header">
          <h3 id="edit-modal-title">${t('edit_meal')}</h3>
          <button type="button" id="edit-modal-close" class="icon-btn">✕</button>
        </div>

        <div style="text-align:center; margin: 10px 0 16px;">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">${t('amount_g')}</div>
          <input type="number" id="edit-grams-input" class="form-input" min="0.1" step="any" inputmode="decimal"
            enterkeyhint="done"
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

        <button type="submit" id="btn-save-edit-meal" class="btn-primary">
          ${t('save_changes')}
        </button>
      </form>
    </div>
  `;

  // Listeners
  const weightForm = container.querySelector('#daily-weight-form');
  const weightInput = container.querySelector('#daily-weight-input');
  const deleteWeightBtn = container.querySelector('#delete-weight-btn');

  if (weightForm && weightInput) {
    weightForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      weightInput.blur();
      const val = weightInput.value.trim().replace(',', '.');
      if (!val) {
        await deleteWeight(dateStr);
      } else {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) {
          await deleteWeight(dateStr);
        } else {
          await saveWeight(dateStr, num);
        }
      }
      renderDashboard(container, currentDate, onDateChange, onNavigateToLog);
    });
  }

  if (deleteWeightBtn) {
    deleteWeightBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await deleteWeight(dateStr);
      renderDashboard(container, currentDate, onDateChange, onNavigateToLog);
    });
  }

  const waterForm = container.querySelector('#daily-water-form');
  const waterInput = container.querySelector('#daily-water-input');
  const deleteWaterBtn = container.querySelector('#delete-water-btn');

  if (waterForm && waterInput) {
    waterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      waterInput.blur();
      const val = waterInput.value.trim().replace(',', '.');
      if (!val) return;
      const num = parseFloat(val);
      if (isNaN(num)) return;

      if (num === 0) {
        await deleteWater(dateStr);
      } else {
        const current = (currentWater !== null && !isNaN(Number(currentWater))) ? Number(currentWater) : 0;
        const newTotal = Math.max(0, Math.round(current + num));
        if (newTotal === 0) {
          await deleteWater(dateStr);
        } else {
          await saveWater(dateStr, newTotal);
        }
      }
      renderDashboard(container, currentDate, onDateChange, onNavigateToLog);
    });
  }

  if (deleteWaterBtn) {
    deleteWaterBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await deleteWater(dateStr);
      renderDashboard(container, currentDate, onDateChange, onNavigateToLog);
    });
  }

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

  function getMealPer100(meal) {
    if (!meal) return null;
    if (meal.per_100g) {
      return meal.per_100g;
    }
    const origG = (meal.amount_g > 0) ? meal.amount_g : 100;
    const mCal = Number(meal.calories) || 0;
    const mPro = Number(meal.protein) || 0;
    const mCarb = Number(meal.carbs) || 0;
    const mFat = Number(meal.fats) || 0;
    const mSatFat = Number(meal.saturated_fats !== undefined ? meal.saturated_fats : (meal.sat_fat || 0)) || 0;
    const mFib = Number(meal.fiber) || 0;
    const mSalt = Number(meal.salt) || 0;
    const mSug = Number(meal.sugar) || 0;

    return {
      calories: (mCal / origG) * 100,
      protein: (mPro / origG) * 100,
      carbs: (mCarb / origG) * 100,
      fats: (mFat / origG) * 100,
      saturated_fats: (mSatFat / origG) * 100,
      fiber: (mFib / origG) * 100,
      salt: (mSalt / origG) * 100,
      sugar: (mSug / origG) * 100
    };
  }

  function updateEditPreview() {
    if (!activeEditingMeal) return;
    const g = Math.max(0, parseFloat(String(editGramsInput.value).replace(',', '.')) || 0);
    const per100 = getMealPer100(activeEditingMeal);
    if (!per100) return;

    const factor = g / 100;
    const sf = per100.saturated_fats !== undefined ? per100.saturated_fats : (per100.sat_fat || 0);
    epCal.textContent = `${Math.round((Number(per100.calories) || 0) * factor)} ${t('kcal')}`;
    epPro.textContent = `${Math.round((Number(per100.protein) || 0) * factor * 10) / 10}`;
    epCarb.textContent = `${Math.round((Number(per100.carbs) || 0) * factor * 10) / 10}`;
    epFat.textContent = `${Math.round((Number(per100.fats) || 0) * factor * 10) / 10}`;
    epSatFat.textContent = `${Math.round((Number(sf) || 0) * factor * 10) / 10}`;
    epFib.textContent = `${Math.round((Number(per100.fiber) || 0) * factor * 10) / 10}`;
    epSalt.textContent = `${Math.round((Number(per100.salt) || 0) * factor * 10000) / 10000}`;
    epSug.textContent = `${Math.round((Number(per100.sugar) || 0) * factor * 10) / 10}`;
  }

  function openEditModal(meal) {
    document.querySelectorAll('#app > #edit-meal-modal').forEach(el => {
      if (el !== editModal) el.remove();
    });
    if (editModal && editModal.parentElement !== document.getElementById('app')) {
      document.getElementById('app').appendChild(editModal);
    }
    activeEditingMeal = meal;
    const displayName = getFoodDisplayName(meal, currentLang);
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
    editGramsInput.blur();
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    editModal.classList.remove('open');
    activeEditingMeal = null;
  }

  editCloseBtn.addEventListener('click', closeEditModal);
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
  });
  editGramsInput.addEventListener('input', updateEditPreview);

  const editMealForm = container.querySelector('#edit-meal-form');

  const handleSaveEditMeal = async (e) => {
    if (e) e.preventDefault();
    editGramsInput.blur();
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (!activeEditingMeal) return;
    const g = Math.max(0, parseFloat(String(editGramsInput.value).replace(',', '.')) || 0);
    if (g <= 0) return;

    const per100 = getMealPer100(activeEditingMeal);
    if (!per100) return;

    const factor = g / 100;
    const sf = per100.saturated_fats !== undefined ? per100.saturated_fats : (per100.sat_fat || 0);
    activeEditingMeal.amount_g = g;
    activeEditingMeal.per_100g = per100;
    activeEditingMeal.calories = (Number(per100.calories) || 0) * factor;
    activeEditingMeal.protein = Math.round((Number(per100.protein) || 0) * factor * 10) / 10;
    activeEditingMeal.carbs = Math.round((Number(per100.carbs) || 0) * factor * 10) / 10;
    activeEditingMeal.fats = Math.round((Number(per100.fats) || 0) * factor * 10) / 10;
    activeEditingMeal.saturated_fats = Math.round((Number(sf) || 0) * factor * 10) / 10;
    activeEditingMeal.fiber = Math.round((Number(per100.fiber) || 0) * factor * 10) / 10;
    activeEditingMeal.salt = Math.round((Number(per100.salt) || 0) * factor * 10000) / 10000;
    activeEditingMeal.sugar = Math.round((Number(per100.sugar) || 0) * factor * 10) / 10;

    await updateMeal(activeEditingMeal);
    closeEditModal();
    renderDashboard(container, currentDate, onDateChange, onNavigateToLog);
  };

  if (editMealForm) {
    editMealForm.addEventListener('submit', handleSaveEditMeal);
  } else {
    saveEditBtn.addEventListener('click', handleSaveEditMeal);
  }

  editGramsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEditMeal();
    }
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
