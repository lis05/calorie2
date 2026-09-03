import { t, getLanguage } from '../i18n.js';
import { getMealsByDateRange, getTargetsForDate, toLocalDateString } from '../db.js';

const METRICS = [
  { id: 'calories', labelKey: 'target_calories', unit: 'kcal', color: 'var(--cal-color, #f97316)' },
  { id: 'protein',  labelKey: 'protein',         unit: 'g',    color: 'var(--pro-color, #38bdf8)' },
  { id: 'carbs',    labelKey: 'carbs',           unit: 'g',    color: 'var(--carb-color, #34d399)' },
  { id: 'fats',     labelKey: 'fats',            unit: 'g',    color: 'var(--fat-color, #fbbf24)' },
  { id: 'fiber',    labelKey: 'fiber',           unit: 'g',    color: 'var(--fiber-color, #a78bfa)' },
  { id: 'salt',     labelKey: 'salt',            unit: 'g',    color: 'var(--salt-color, #94a3b8)' },
  { id: 'sugar',    labelKey: 'sugar',           unit: 'g',    color: 'var(--sugar-color, #f43f5e)' }
];

let selectedMetricId = 'calories';

export async function renderAnalytics(container) {
  container.innerHTML = `
    <div class="view-header">
      <h2>${t('weekly_title')}</h2>
    </div>

    <!-- Metric Selector Chips -->
    <div class="metric-chips" id="analytics-metric-chips"></div>

    <!-- Chart Card -->
    <div class="card" style="margin-top: 12px; padding: 16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
        <h3 id="current-metric-title" style="font-size:1.05rem; font-weight:700; margin:0;"></h3>
        <span id="current-metric-target" style="font-size:0.8rem; color:var(--text-muted); font-weight:600;"></span>
      </div>
      <div class="chart-container" id="analytics-chart-container"></div>
    </div>

    <!-- 7-Day Stats Grid -->
    <div class="analytics-stats-grid" id="analytics-stats-grid"></div>
  `;

  renderMetricChips(container);
  await loadAndDisplayChart(container);
}

function renderMetricChips(container) {
  const chipsContainer = container.querySelector('#analytics-metric-chips');
  if (!chipsContainer) return;

  chipsContainer.innerHTML = METRICS.map(m => {
    const isActive = m.id === selectedMetricId;
    const label = t(m.labelKey).replace(/\s*\([^)]*\)/, ''); // strip (g) or (kcal) if present
    return `
      <button class="metric-chip ${isActive ? 'active' : ''}" data-metric="${m.id}" style="${isActive ? `color:${m.color}; border-color:${m.color};` : ''}">
        <span style="width:8px; height:8px; border-radius:50%; background:${m.color}; display:inline-block; flex-shrink:0;"></span>
        <span>${label}</span>
      </button>
    `;
  }).join('');

  chipsContainer.querySelectorAll('.metric-chip').forEach(btn => {
    btn.addEventListener('click', async () => {
      selectedMetricId = btn.getAttribute('data-metric');
      renderMetricChips(container);
      await loadAndDisplayChart(container);
    });
  });
}

async function loadAndDisplayChart(container) {
  const chartContainer = container.querySelector('#analytics-chart-container');
  const statsGrid = container.querySelector('#analytics-stats-grid');
  const metricTitleEl = container.querySelector('#current-metric-title');
  const metricTargetEl = container.querySelector('#current-metric-target');
  if (!chartContainer || !statsGrid) return;

  const activeMetric = METRICS.find(m => m.id === selectedMetricId) || METRICS[0];
  const metricCleanName = t(activeMetric.labelKey).replace(/\s*\([^)]*\)/, '');
  if (metricTitleEl) {
    metricTitleEl.textContent = `${metricCleanName} (${activeMetric.unit})`;
  }

  // Calculate 7-day dates: 6 days ago -> today
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }

  const startDateStr = toLocalDateString(days[0]);
  const endDateStr = toLocalDateString(days[days.length - 1]);

  // Fetch meals for 7 days
  const meals = await getMealsByDateRange(startDateStr, endDateStr);

  // Group meals by date
  const daySums = {};
  for (const d of days) {
    daySums[toLocalDateString(d)] = 0;
  }

  for (const meal of meals) {
    const dateStr = meal.date;
    if (daySums[dateStr] !== undefined) {
      const val = Number(meal[selectedMetricId]) || 0;
      daySums[dateStr] += val;
    }
  }

  // Fetch latest daily target for current metric
  const targets = await getTargetsForDate(endDateStr);
  const targetVal = Number(targets[selectedMetricId]) || 0;
  if (metricTargetEl) {
    metricTargetEl.textContent = targetVal > 0 ? `${t('goal')}: ${Math.round(targetVal)} ${activeMetric.unit}` : '';
  }

  // Find max value to normalize bar heights
  const values = days.map(d => daySums[toLocalDateString(d)]);
  const maxVal = Math.max(...values, targetVal > 0 ? targetVal : 1, 1);

  const lang = getLanguage();
  const locale = lang === 'uk' ? 'uk-UA' : 'en-US';

  // Render chart: bars track with unified baseline + fixed 2-line labels row
  chartContainer.innerHTML = `
    <div class="chart-bars-area">
      ${days.map(d => {
        const dateStr = toLocalDateString(d);
        const val = daySums[dateStr] || 0;
        const roundedVal = Math.round(val);
        const isToday = dateStr === endDateStr;

        const heightPct = Math.max(Math.round((val / maxVal) * 100), val > 0 ? 6 : 2);
        const isOverTarget = targetVal > 0 && val > targetVal;
        const barBg = isOverTarget ? 'var(--accent-danger, #ef4444)' : activeMetric.color;

        return `
          <div class="chart-col ${isToday ? 'today' : ''}" title="${dateStr}: ${roundedVal} ${activeMetric.unit}">
            <span class="chart-bar-val">${val > 0 ? roundedVal : '0'}</span>
            <div class="chart-bar" style="height: ${heightPct}%; background-color: ${barBg};"></div>
          </div>
        `;
      }).join('')}
    </div>
    <div class="chart-labels-area">
      ${days.map(d => {
        const dateStr = toLocalDateString(d);
        const isToday = dateStr === endDateStr;
        const weekday = d.toLocaleDateString(locale, { weekday: 'short' });
        const dayNum = d.getDate();

        return `
          <div class="chart-label-slot ${isToday ? 'today' : ''}">
            <span class="chart-weekday">${weekday}</span>
            <span class="chart-daynum">${dayNum}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Calculate statistics (Average, Highest, Lowest)
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / 7);
  const highest = Math.round(Math.max(...values));
  const lowest = Math.round(Math.min(...values));

  statsGrid.innerHTML = `
    <div class="stat-box" style="text-align:center; padding:10px 4px;">
      <div class="stat-label" style="font-size:0.72rem;">${t('avg_daily')}</div>
      <div class="stat-val" style="font-size:1.05rem; color:${activeMetric.color};">${avg} <span style="font-size:0.75rem;">${activeMetric.unit}</span></div>
    </div>
    <div class="stat-box" style="text-align:center; padding:10px 4px;">
      <div class="stat-label" style="font-size:0.72rem;">${t('highest_day')}</div>
      <div class="stat-val" style="font-size:1.05rem; color:var(--text-primary);">${highest} <span style="font-size:0.75rem;">${activeMetric.unit}</span></div>
    </div>
    <div class="stat-box" style="text-align:center; padding:10px 4px;">
      <div class="stat-label" style="font-size:0.72rem;">${t('lowest_day')}</div>
      <div class="stat-val" style="font-size:1.05rem; color:var(--text-primary);">${lowest} <span style="font-size:0.75rem;">${activeMetric.unit}</span></div>
    </div>
  `;
}
