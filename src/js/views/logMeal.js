import { t, getLanguage } from '../i18n.js';
import { getAllFoods, searchFoods, addMeal, toLocalDateString } from '../db.js';
import { getFoodDisplayName } from '../defaultFoods.js';

export async function renderLogMeal(container, currentDate, onMealSaved) {
  let allFoods = await getAllFoods();
  let selectedFood = null;
  const currentLang = getLanguage();

  container.innerHTML = `
    <div class="card" style="padding:14px;">
      <div class="form-group" style="margin-bottom:10px;">
        <label class="form-label">${t('meal_type')}</label>
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:6px;">
          <button type="button" class="btn-secondary meal-type-btn active" data-type="breakfast">${t('breakfast')}</button>
          <button type="button" class="btn-secondary meal-type-btn" data-type="lunch">${t('lunch')}</button>
          <button type="button" class="btn-secondary meal-type-btn" data-type="dinner">${t('dinner')}</button>
          <button type="button" class="btn-secondary meal-type-btn" data-type="snack">${t('snack')}</button>
        </div>
      </div>

      <div class="form-group" style="margin-bottom:0;">
        <input type="text" id="food-search-input" class="form-input" placeholder="${t('search_food')}" autocomplete="off" />
      </div>
    </div>

    <!-- Food list -->
    <div id="food-results-list"></div>

    <!-- Modal for entering grams -->
    <div id="grams-modal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 id="modal-food-title"></h3>
          <button id="modal-close-btn" class="icon-btn">✕</button>
        </div>

        <div style="text-align:center; margin: 8px 0 14px;">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">${t('amount_g')}</div>
          <input type="number" id="grams-input" class="form-input" value="100" min="1" step="1"
            style="font-size:2rem; text-align:center; font-weight:800; width:160px; margin:0 auto; padding:8px;" />
        </div>

        <!-- Live nutrition calculation preview in 2xN grid -->
        <div class="card" style="background:var(--surface-color); padding:14px; margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:700;">${t('calories_label')}:</span>
            <span id="preview-cal" style="font-size:1.35rem; font-weight:800; color:var(--stat-cal);">0 ${t('kcal')}</span>
          </div>
          <div class="stats-table-2xn">
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot pro"></span>${t('protein')}</span>
              <span id="preview-pro" class="stat-cell-val pro">0g</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot carb"></span>${t('carbs')}</span>
              <span id="preview-carb" class="stat-cell-val carb">0g</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot fat"></span>${t('fats')}</span>
              <span id="preview-fat" class="stat-cell-val fat">0g</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot fib"></span>${t('fiber')}</span>
              <span id="preview-fib" class="stat-cell-val fib">0g</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot salt"></span>${t('salt')}</span>
              <span id="preview-salt" class="stat-cell-val salt">0g</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot sug"></span>${t('sugar')}</span>
              <span id="preview-sug" class="stat-cell-val sug">0g</span>
            </div>
          </div>
        </div>

        <button id="btn-confirm-add" class="btn-primary">
          ${t('add')}
        </button>
      </div>
    </div>
  `;

  let currentMealType = 'breakfast';
  const typeBtns = container.querySelectorAll('.meal-type-btn');
  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMealType = btn.getAttribute('data-type');
    });
  });

  const searchInput = container.querySelector('#food-search-input');
  const resultsContainer = container.querySelector('#food-results-list');
  const modal = container.querySelector('#grams-modal');
  const gramsInput = container.querySelector('#grams-input');
  const modalTitle = container.querySelector('#modal-food-title');
  const modalClose = container.querySelector('#modal-close-btn');
  const confirmAddBtn = container.querySelector('#btn-confirm-add');

  const pCal = container.querySelector('#preview-cal');
  const pPro = container.querySelector('#preview-pro');
  const pCarb = container.querySelector('#preview-carb');
  const pFat = container.querySelector('#preview-fat');
  const pFib = container.querySelector('#preview-fib');
  const pSalt = container.querySelector('#preview-salt');
  const pSug = container.querySelector('#preview-sug');

  function updatePreview() {
    if (!selectedFood) return;
    const g = parseFloat(gramsInput.value) || 0;
    const factor = g / 100;
    pCal.textContent = `${Math.round((selectedFood.calories || 0) * factor)} ${t('kcal')}`;
    pPro.textContent = `${Math.round((selectedFood.protein || 0) * factor * 10) / 10}g`;
    pCarb.textContent = `${Math.round((selectedFood.carbs || 0) * factor * 10) / 10}g`;
    pFat.textContent = `${Math.round((selectedFood.fats || 0) * factor * 10) / 10}g`;
    pFib.textContent = `${Math.round((selectedFood.fiber || 0) * factor * 10) / 10}g`;
    pSalt.textContent = `${Math.round((selectedFood.salt || 0) * factor * 100) / 100}g`;
    pSug.textContent = `${Math.round((selectedFood.sugar || 0) * factor * 10) / 10}g`;
  }

  function openGramsModal(food) {
    selectedFood = food;
    modalTitle.textContent = getFoodDisplayName(food, currentLang);
    gramsInput.value = "100";
    updatePreview();
    modal.classList.add('open');
    setTimeout(() => {
      gramsInput.focus();
      gramsInput.select();
    }, 150);
  }

  function closeModal() {
    modal.classList.remove('open');
    selectedFood = null;
  }

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  gramsInput.addEventListener('input', updatePreview);

  confirmAddBtn.addEventListener('click', async () => {
    if (!selectedFood) return;
    const g = parseFloat(gramsInput.value) || 0;
    if (g <= 0) return;

    const factor = g / 100;
    const dateStr = toLocalDateString(currentDate);
    const foodName = getFoodDisplayName(selectedFood, currentLang);

    await addMeal({
      date: dateStr,
      meal_type: currentMealType,
      food_id: selectedFood.id,
      food_name: foodName,
      amount_g: g,
      calories: (selectedFood.calories || 0) * factor,
      protein: Math.round((selectedFood.protein || 0) * factor * 10) / 10,
      carbs: Math.round((selectedFood.carbs || 0) * factor * 10) / 10,
      fats: Math.round((selectedFood.fats || 0) * factor * 10) / 10,
      fiber: Math.round((selectedFood.fiber || 0) * factor * 10) / 10,
      salt: Math.round((selectedFood.salt || 0) * factor * 100) / 100,
      sugar: Math.round((selectedFood.sugar || 0) * factor * 10) / 10,
      created_at: new Date().toISOString()
    });

    closeModal();
    onMealSaved();
  });

  function renderList(list) {
    if (list.length === 0) {
      resultsContainer.innerHTML = `<div class="empty-state"><div>${t('no_foods_found')}</div></div>`;
      return;
    }

    resultsContainer.innerHTML = list.map(f => {
      const displayName = getFoodDisplayName(f, currentLang);
      return `
        <div class="food-card clickable" data-id="${f.id}">
          <div class="food-card-header">
            <div style="flex:1;">
              <h4 class="food-card-title">${displayName}</h4>
              <div class="food-card-sub">
                <span>${t('per_100g')}</span>
              </div>
            </div>
            <div class="food-card-cal">
              ${Math.round(f.calories)}
              <div class="food-card-cal-sub">${t('kcal')}</div>
            </div>
          </div>

          <!-- 2xN Stats Table -->
          <div class="stats-table-2xn">
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot pro"></span>${t('protein')}</span>
              <span class="stat-cell-val pro">${f.protein || 0}g</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot carb"></span>${t('carbs')}</span>
              <span class="stat-cell-val carb">${f.carbs || 0}g</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot fat"></span>${t('fats')}</span>
              <span class="stat-cell-val fat">${f.fats || 0}g</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot fib"></span>${t('fiber')}</span>
              <span class="stat-cell-val fib">${f.fiber || 0}g</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot salt"></span>${t('salt')}</span>
              <span class="stat-cell-val salt">${f.salt || 0}g</span>
            </div>
            <div class="stat-cell">
              <span class="stat-cell-name"><span class="stat-dot sug"></span>${t('sugar')}</span>
              <span class="stat-cell-val sug">${f.sugar || 0}g</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    resultsContainer.querySelectorAll('.food-card').forEach(row => {
      row.addEventListener('click', () => {
        const id = Number(row.getAttribute('data-id'));
        const food = list.find(item => item.id === id);
        if (food) openGramsModal(food);
      });
    });
  }

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    renderList(allFoods.filter(f => {
      const name = getFoodDisplayName(f, currentLang).toLowerCase();
      return name.includes(q);
    }));
  });

  renderList(allFoods);
}
