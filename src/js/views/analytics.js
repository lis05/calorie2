import { t, getLanguage } from '../i18n.js';
import { getMealsByDateRange, getTargetsForDate, getWeightsByDateRange, toLocalDateString } from '../db.js';

const METRICS = [
  { id: 'calories',       labelKey: 'calories_label',       unitKey: 'kcal',   color: 'var(--stat-cal)' },
  { id: 'protein',        labelKey: 'protein',              unitKey: 'unit_g', color: 'var(--stat-pro)' },
  { id: 'fats',           labelKey: 'fats',                 unitKey: 'unit_g', color: 'var(--stat-fat)' },
  { id: 'saturated_fats', labelKey: 'saturated_fats_short', unitKey: 'unit_g', color: 'var(--stat-sat-fat)' },
  { id: 'carbs',          labelKey: 'carbs',                unitKey: 'unit_g', color: 'var(--stat-carb)' },
  { id: 'sugar',          labelKey: 'sugar',                unitKey: 'unit_g', color: 'var(--stat-sug)' },
  { id: 'fiber',          labelKey: 'fiber',                unitKey: 'unit_g', color: 'var(--stat-fib)' },
  { id: 'salt',           labelKey: 'salt',                 unitKey: 'unit_g', color: 'var(--stat-salt)' }
];

let selectedMetricId = 'calories';
let weightRangeMonths = 3;

export async function renderAnalytics(container) {
  container.innerHTML = `
    <div class="view-header">
      <h2>${t('weekly_title')}</h2>
    </div>

    <!-- Metric Selector Chips -->
    <div class="metric-chips" id="analytics-metric-chips"></div>

    <!-- 7-Day Nutrition Chart Card -->
    <div class="card" style="margin-top: 12px; padding: 16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
        <h3 id="current-metric-title" style="font-size:1.05rem; font-weight:700; margin:0;"></h3>
        <span id="current-metric-target" style="font-size:0.8rem; color:var(--text-muted); font-weight:600;"></span>
      </div>
      <div class="chart-container" id="analytics-chart-container"></div>
    </div>

    <!-- 7-Day Stats Grid -->
    <div class="analytics-stats-grid" id="analytics-stats-grid"></div>

    <!-- Weight Trend (Last Months) Card -->
    <div class="card" style="margin-top: 20px; padding: 16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; gap: 8px; flex-wrap: wrap;">
        <div>
          <h3 style="font-size:1.05rem; font-weight:700; margin:0; display:flex; align-items:center; gap:6px;">
            <span>⚖️</span>
            <span>${t('weight_trend')}</span>
          </h3>
          <span style="font-size:0.75rem; color:var(--text-muted);">${t('last_months')}</span>
        </div>
        <div class="weight-range-picker" style="display:flex; gap:4px;">
          <button type="button" class="btn-secondary weight-range-btn ${weightRangeMonths === 1 ? 'active' : ''}" data-range="1" style="width:auto; padding:4px 10px; font-size:0.75rem; border-radius:14px;">1M</button>
          <button type="button" class="btn-secondary weight-range-btn ${weightRangeMonths === 3 ? 'active' : ''}" data-range="3" style="width:auto; padding:4px 10px; font-size:0.75rem; border-radius:14px;">3M</button>
          <button type="button" class="btn-secondary weight-range-btn ${weightRangeMonths === 6 ? 'active' : ''}" data-range="6" style="width:auto; padding:4px 10px; font-size:0.75rem; border-radius:14px;">6M</button>
        </div>
      </div>

      <div id="weight-chart-container" style="position:relative; width:100%; min-height:180px;"></div>

      <!-- Weight Summary Stats -->
      <div id="weight-stats-summary" class="analytics-stats-grid" style="margin-top: 14px;"></div>
    </div>
  `;

  renderMetricChips(container);
  await loadAndDisplayChart(container);
  setupWeightRangeButtons(container);
  await loadAndDisplayWeightChart(container);
}

function renderMetricChips(container) {
  const chipsContainer = container.querySelector('#analytics-metric-chips');
  if (!chipsContainer) return;

  chipsContainer.innerHTML = METRICS.map(m => {
    const isActive = m.id === selectedMetricId;
    const label = t(m.labelKey);
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
  const unit = t(activeMetric.unitKey);
  const metricCleanName = t(activeMetric.labelKey);
  if (metricTitleEl) {
    metricTitleEl.textContent = `${metricCleanName} (${unit})`;
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

  const daySums = {};
  for (const d of days) {
    daySums[toLocalDateString(d)] = 0;
  }

  for (const meal of meals) {
    const dateStr = meal.date;
    if (daySums[dateStr] !== undefined) {
      let val = 0;
      if (selectedMetricId === 'saturated_fats') {
        val = Number(meal.saturated_fats !== undefined ? meal.saturated_fats : (meal.sat_fat || 0)) || 0;
      } else {
        val = Number(meal[selectedMetricId]) || 0;
      }
      daySums[dateStr] += val;
    }
  }

  // Fetch latest daily target for current metric
  const targets = await getTargetsForDate(endDateStr);
  let targetVal = 0;
  if (selectedMetricId === 'saturated_fats') {
    targetVal = Number(targets.saturated_fats !== undefined ? targets.saturated_fats : (targets.sat_fat !== undefined ? targets.sat_fat : 20)) || 20;
  } else {
    targetVal = Number(targets[selectedMetricId]) || 0;
  }

  if (metricTargetEl) {
    const targetDisplayVal = activeMetric.id === 'salt' ? (Math.round(targetVal * 10000) / 10000) : Math.round(targetVal);
    metricTargetEl.textContent = targetVal > 0 ? `${t('goal')}: ${targetDisplayVal} ${unit}` : '';
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
        let roundedVal = 0;
        if (activeMetric.id === 'salt') {
          roundedVal = Math.round(val * 10000) / 10000;
        } else if (activeMetric.id === 'calories') {
          roundedVal = Math.round(val);
        } else {
          roundedVal = Math.round(val * 10) / 10;
        }
        const isToday = dateStr === endDateStr;

        const heightPct = Math.max(Math.round((val / maxVal) * 100), val > 0 ? 6 : 2);
        const isOverTarget = targetVal > 0 && val > targetVal;
        const barBg = isOverTarget ? 'var(--accent-danger, #ef4444)' : activeMetric.color;

        return `
          <div class="chart-col ${isToday ? 'today' : ''}" title="${dateStr}: ${roundedVal} ${unit}">
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
  let avg = 0, highest = 0, lowest = 0;
  if (activeMetric.id === 'salt') {
    avg = Math.round((sum / 7) * 10000) / 10000;
    highest = Math.round(Math.max(...values) * 10000) / 10000;
    lowest = Math.round(Math.min(...values) * 10000) / 10000;
  } else if (activeMetric.id === 'calories') {
    avg = Math.round(sum / 7);
    highest = Math.round(Math.max(...values));
    lowest = Math.round(Math.min(...values));
  } else {
    avg = Math.round((sum / 7) * 10) / 10;
    highest = Math.round(Math.max(...values) * 10) / 10;
    lowest = Math.round(Math.min(...values) * 10) / 10;
  }

  const unitSpan = ` <span style="font-size:0.75rem;">${unit}</span>`;

  statsGrid.innerHTML = `
    <div class="stat-box" style="text-align:center; padding:10px 4px;">
      <div class="stat-label" style="font-size:0.72rem;">${t('avg_daily')}</div>
      <div class="stat-val" style="font-size:1.05rem; color:${activeMetric.color};">${avg}${unitSpan}</div>
    </div>
    <div class="stat-box" style="text-align:center; padding:10px 4px;">
      <div class="stat-label" style="font-size:0.72rem;">${t('highest_day')}</div>
      <div class="stat-val" style="font-size:1.05rem; color:var(--text-primary);">${highest}${unitSpan}</div>
    </div>
    <div class="stat-box" style="text-align:center; padding:10px 4px;">
      <div class="stat-label" style="font-size:0.72rem;">${t('lowest_day')}</div>
      <div class="stat-val" style="font-size:1.05rem; color:var(--text-primary);">${lowest}${unitSpan}</div>
    </div>
  `;
}

function setupWeightRangeButtons(container) {
  const rangeBtns = container.querySelectorAll('.weight-range-btn');
  rangeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      weightRangeMonths = Number(btn.getAttribute('data-range')) || 3;
      rangeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await loadAndDisplayWeightChart(container);
    });
  });
}

async function loadAndDisplayWeightChart(container) {
  const chartWrapper = container.querySelector('#weight-chart-container');
  const statsSummary = container.querySelector('#weight-stats-summary');
  if (!chartWrapper || !statsSummary) return;

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - weightRangeMonths);

  const startDateStr = toLocalDateString(startDate);
  const endDateStr = toLocalDateString(endDate);

  const records = await getWeightsByDateRange(startDateStr, endDateStr);
  records.sort((a, b) => a.date.localeCompare(b.date));

  const lang = getLanguage();
  const locale = lang === 'uk' ? 'uk-UA' : 'en-US';
  const startLabel = startDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const endLabel = endDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const unit = t('unit_kg');

  if (records.length === 0) {
    chartWrapper.innerHTML = `
      <div class="empty-state" style="padding: 30px 10px;">
        <div style="font-size: 1.6rem; margin-bottom: 6px;">⚖️</div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">${t('no_weight_data_range')}</div>
      </div>
    `;
    statsSummary.innerHTML = `
      <div class="stat-box" style="text-align:center; padding:10px 4px;">
        <div class="stat-label" style="font-size:0.72rem;">${t('first_logged')}</div>
        <div class="stat-val" style="font-size:1.05rem; color:var(--text-muted);">--</div>
      </div>
      <div class="stat-box" style="text-align:center; padding:10px 4px;">
        <div class="stat-label" style="font-size:0.72rem;">${t('latest_logged')}</div>
        <div class="stat-val" style="font-size:1.05rem; color:var(--text-muted);">--</div>
      </div>
      <div class="stat-box" style="text-align:center; padding:10px 4px;">
        <div class="stat-label" style="font-size:0.72rem;">${t('weight_change')}</div>
        <div class="stat-val" style="font-size:1.05rem; color:var(--text-muted);">--</div>
      </div>
    `;
    return;
  }

  // Calculate Y min and max with margin
  const weights = records.map(r => r.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  let yMin = Math.floor(minW - 0.5);
  let yMax = Math.ceil(maxW + 0.5);
  if (yMax <= yMin) {
    yMin = Math.max(0, yMin - 1);
    yMax = yMax + 1;
  }
  if (yMax - yMin < 2) {
    yMax = yMin + 2;
  }
  const yMid = Math.round(((yMin + yMax) / 2) * 10) / 10;

  // SVG dimensions
  const svgWidth = 340;
  const svgHeight = 180;
  const padLeft = 40;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 26;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const timeSpan = Math.max(endTime - startTime, 1);

  const points = records.map(r => {
    const tVal = new Date(r.date + 'T12:00:00').getTime();
    const clampedT = Math.max(startTime, Math.min(endTime, tVal));
    const x = Math.round((padLeft + ((clampedT - startTime) / timeSpan) * plotW) * 10) / 10;
    const y = Math.round((padTop + ((yMax - r.weight) / (yMax - yMin)) * plotH) * 10) / 10;
    return { x, y, date: r.date, weight: r.weight };
  });

  const polylinePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${polylinePath} L ${points[points.length - 1].x} ${padTop + plotH} L ${points[0].x} ${padTop + plotH} Z`;

  chartWrapper.innerHTML = `
    <div style="position:relative; width:100%;">
      <div id="weight-tooltip" style="display:none; position:absolute; pointer-events:none; background:var(--surface-color); border:1px solid var(--accent-secondary); color:var(--text-main); font-size:0.75rem; font-weight:700; padding:4px 8px; border-radius:6px; box-shadow:var(--shadow-md); z-index:10; transform:translate(-50%, -120%); white-space:nowrap;"></div>
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width:100%; height:auto; overflow:visible; display:block;">
        <defs>
          <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent-secondary, #38bdf8)" stop-opacity="0.25" />
            <stop offset="100%" stop-color="var(--accent-secondary, #38bdf8)" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Y scale horizontal lines and labels -->
        <line x1="${padLeft}" y1="${padTop}" x2="${svgWidth - padRight}" y2="${padTop}" stroke="var(--border-subtle)" stroke-dasharray="3,3" />
        <text x="${padLeft - 6}" y="${padTop + 4}" font-size="10" font-weight="600" fill="var(--text-muted)" text-anchor="end">${yMax}</text>

        <line x1="${padLeft}" y1="${padTop + plotH / 2}" x2="${svgWidth - padRight}" y2="${padTop + plotH / 2}" stroke="var(--border-subtle)" stroke-dasharray="3,3" />
        <text x="${padLeft - 6}" y="${padTop + plotH / 2 + 4}" font-size="10" font-weight="600" fill="var(--text-muted)" text-anchor="end">${yMid}</text>

        <line x1="${padLeft}" y1="${padTop + plotH}" x2="${svgWidth - padRight}" y2="${padTop + plotH}" stroke="var(--border-subtle)" />
        <text x="${padLeft - 6}" y="${padTop + plotH + 4}" font-size="10" font-weight="600" fill="var(--text-muted)" text-anchor="end">${yMin}</text>

        <!-- Gradient fill beneath zig-zag line -->
        ${points.length >= 2 ? `<path d="${areaPath}" fill="url(#weightAreaGrad)" />` : ''}

        <!-- Connecting Zig-Zag Line -->
        ${points.length >= 2 ? `<path d="${polylinePath}" fill="none" stroke="var(--accent-secondary, #38bdf8)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />` : ''}

        <!-- Dots -->
        ${points.map((p, idx) => {
          const isLatest = idx === points.length - 1;
          return `
            <circle cx="${p.x}" cy="${p.y}" r="${isLatest ? 5 : 3.5}"
              fill="${isLatest ? 'var(--accent-primary, #10b981)' : 'var(--accent-secondary, #38bdf8)'}"
              stroke="var(--surface-card, #1e2230)" stroke-width="2"
              class="weight-chart-dot"
              data-date="${p.date}" data-weight="${p.weight}"
              style="cursor:pointer;" />
          `;
        }).join('')}

        <!-- X scale (only beginning and end of range) -->
        <text x="${padLeft}" y="${svgHeight - 4}" font-size="10" font-weight="600" fill="var(--text-muted)" text-anchor="start">${startLabel}</text>
        <text x="${svgWidth - padRight}" y="${svgHeight - 4}" font-size="10" font-weight="600" fill="var(--text-muted)" text-anchor="end">${endLabel}</text>
      </svg>
    </div>
  `;

  // Interactive tooltip on dot hover/touch
  const tooltip = chartWrapper.querySelector('#weight-tooltip');
  const dots = chartWrapper.querySelectorAll('.weight-chart-dot');
  dots.forEach(dot => {
    const showTip = () => {
      const d = dot.getAttribute('data-date');
      const w = dot.getAttribute('data-weight');
      const dObj = new Date(d + 'T12:00:00');
      const formattedD = dObj.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      tooltip.textContent = `${formattedD}: ${w} ${unit}`;
      const rect = dot.getBoundingClientRect();
      const parentRect = chartWrapper.getBoundingClientRect();
      tooltip.style.left = `${rect.left - parentRect.left + rect.width / 2}px`;
      tooltip.style.top = `${rect.top - parentRect.top}px`;
      tooltip.style.display = 'block';
    };
    dot.addEventListener('mouseenter', showTip);
    dot.addEventListener('click', showTip);
    dot.addEventListener('touchstart', showTip, { passive: true });
  });

  chartWrapper.addEventListener('mouseleave', () => {
    if (tooltip) tooltip.style.display = 'none';
  });

  // Summary stats
  const firstW = records[0].weight;
  const lastW = records[records.length - 1].weight;
  const diff = Math.round((lastW - firstW) * 10) / 10;
  const diffText = diff > 0 ? `+${diff}` : `${diff}`;
  const diffColor = diff < 0 ? 'var(--accent-primary, #10b981)' : (diff > 0 ? 'var(--accent-warning, #f59e0b)' : 'var(--text-primary)');

  statsSummary.innerHTML = `
    <div class="stat-box" style="text-align:center; padding:10px 4px;">
      <div class="stat-label" style="font-size:0.72rem;">${t('first_logged')}</div>
      <div class="stat-val" style="font-size:1.05rem; color:var(--text-secondary);">${firstW} <span style="font-size:0.75rem;">${unit}</span></div>
    </div>
    <div class="stat-box" style="text-align:center; padding:10px 4px;">
      <div class="stat-label" style="font-size:0.72rem;">${t('latest_logged')}</div>
      <div class="stat-val" style="font-size:1.05rem; color:var(--accent-secondary);">${lastW} <span style="font-size:0.75rem;">${unit}</span></div>
    </div>
    <div class="stat-box" style="text-align:center; padding:10px 4px;">
      <div class="stat-label" style="font-size:0.72rem;">${t('weight_change')}</div>
      <div class="stat-val" style="font-size:1.05rem; color:${diffColor};">${diffText} <span style="font-size:0.75rem;">${unit}</span></div>
    </div>
  `;
}
