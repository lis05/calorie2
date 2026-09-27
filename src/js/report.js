import { t, getLanguage } from './i18n.js';
import { getMealsByDateRange, getWeightsByDateRange, getTargetsForDate, toLocalDateString, getWeightByDate, getAllWeights } from './db.js';
import { getFoodShortName, getFoodDisplayName } from './defaultFoods.js';

export function formatReportDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const dd = parts[2].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const yy = parts[0].slice(-2);
    return `${dd}.${mm}.${yy}`;
  }
  return dateStr;
}

function fmtWeight(w) {
  if (w === undefined || w === null || w === '') return '';
  const n = Number(w);
  if (isNaN(n) || n <= 0) return '';
  return `${Math.round(n * 100) / 100} ${t('unit_kg')}`;
}

function fmtNum(v, dec = 1) {
  if (v === undefined || v === null || isNaN(Number(v)) || Number(v) === 0) return '-';
  const factor = Math.pow(10, dec);
  return `${Math.round(Number(v) * factor) / factor}`;
}

function fmtFat(fat, satFat) {
  const f = Math.round(Number(fat || 0) * 100) / 100;
  const sf = Math.round(Number(satFat || 0) * 100) / 100;
  if (f <= 0) return '-';
  if (sf > 0) return `${f}(${sf})`;
  return `${f}(-)`;
}

function fmtCarb(carb, sug) {
  const c = Math.round(Number(carb || 0) * 100) / 100;
  const s = Math.round(Number(sug || 0) * 100) / 100;
  if (c <= 0) return '-';
  if (s > 0) return `${c}(${s})`;
  return `${c}(-)`;
}

function fmtSalt(salt) {
  const s = Math.round(Number(salt || 0) * 1000) / 1000;
  if (s <= 0) return '';
  return `${s}`;
}

function subFat(fat, satFat) {
  const f = Math.round(Number(fat || 0) * 100) / 100;
  const sf = Math.round(Number(satFat || 0) * 100) / 100;
  if (f <= 0) return '-';
  if (sf > 0) return `${f}(${sf})`;
  return `${f}`;
}

function subCarb(carb, sug) {
  const c = Math.round(Number(carb || 0) * 100) / 100;
  const s = Math.round(Number(sug || 0) * 100) / 100;
  if (c <= 0) return '-';
  if (s > 0) return `${c}(${s})`;
  return `${c}`;
}

function resolveShortName(m, lang) {
  if (lang === 'en') {
    if (m.short_name_en && m.short_name_en.trim()) return m.short_name_en.trim();
  } else {
    if (m.short_name_uk && m.short_name_uk.trim()) return m.short_name_uk.trim();
  }
  if (m.short_name && m.short_name.trim()) return m.short_name.trim();
  const sn = getFoodShortName(m, lang);
  if (sn && sn.trim()) return sn.trim();
  return getFoodDisplayName(m, lang) || m.food_name || m.name || '';
}

function escapeCsv(val) {
  if (val === undefined || val === null) return '';
  const s = String(val);
  if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function escapeXml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
  }, 1000);
  // Keep object URL alive for 3 minutes so mobile OS DownloadManager has time to complete
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 180000);
  return url;
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  return downloadBlob(blob, fileName);
}

export function openFile(blobUrl, fileName, mimeType, blob) {
  if (mimeType === 'application/pdf') {
    const win = window.open(blobUrl, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      if (navigator.canShare && blob) {
        try {
          const file = new File([blob], fileName, { type: mimeType });
          if (navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: fileName });
            return;
          }
        } catch (e) {}
      }
      window.location.assign(blobUrl);
    }
  } else {
    if (navigator.canShare && blob) {
      try {
        const file = new File([blob], fileName, { type: mimeType });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: fileName });
          return;
        }
      } catch (e) {}
    }
    window.open(blobUrl, '_blank');
  }
}

export function showDownloadNotification(fileName, blobUrl, mimeType, blob) {
  document.querySelectorAll('#download-file-notification').forEach(el => el.remove());

  const notif = document.createElement('div');
  notif.id = 'download-file-notification';
  notif.style.cssText = `
    position: fixed;
    bottom: calc(var(--nav-height, 68px) + env(safe-area-inset-bottom, 0px) + 14px);
    left: 14px;
    right: 14px;
    max-width: 440px;
    margin: 0 auto;
    background: var(--surface-color, #1e293b);
    border: 1px solid var(--accent-secondary, #10b981);
    color: var(--text-primary, #f8fafc);
    border-radius: 12px;
    padding: 12px 14px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    z-index: 10000;
  `;

  notif.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px; overflow:hidden; flex:1;">
      <span style="font-size:1.4rem;">📥</span>
      <div style="overflow:hidden;">
        <div style="font-size:0.85rem; font-weight:700; color:var(--accent-secondary, #10b981);">
          ${t('file_downloaded')}
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted, #94a3b8); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${fileName}
        </div>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:8px;">
      <button type="button" id="notif-btn-open" class="btn-primary" style="padding:6px 14px; font-size:0.82rem; font-weight:700; width:auto; border-radius:8px;">
        👁️ ${t('open')}
      </button>
      <button type="button" id="notif-btn-close" style="background:none; border:none; color:var(--text-muted); font-size:1.15rem; padding:4px 6px; cursor:pointer;">
        ✕
      </button>
    </div>
  `;

  document.body.appendChild(notif);

  const openBtn = notif.querySelector('#notif-btn-open');
  const closeBtn = notif.querySelector('#notif-btn-close');

  openBtn.addEventListener('click', () => {
    openFile(blobUrl, fileName, mimeType, blob);
  });

  closeBtn.addEventListener('click', () => notif.remove());

  setTimeout(() => {
    if (notif.parentElement) notif.remove();
  }, 25000);
}

export function openReportDialog() {
  document.querySelectorAll('#report-dialog-modal').forEach(el => el.remove());

  const today = new Date();
  const endDateDefault = toLocalDateString(today);
  const startDateObj = new Date(today);
  startDateObj.setDate(startDateObj.getDate() - 6);
  const startDateDefault = toLocalDateString(startDateObj);

  const modal = document.createElement('div');
  modal.id = 'report-dialog-modal';
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal-card" style="max-width: 440px;">
      <div class="modal-header">
        <h3 style="display:flex; align-items:center; gap:8px;">
          <span>📄</span>
          <span>${t('generate_report')}</span>
        </h3>
        <button type="button" id="btn-close-report-dialog" class="icon-btn">✕</button>
      </div>

      <div style="margin-bottom: 14px;">
        <label class="form-label">${t('report_date_range')}</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <span style="font-size: 0.72rem; color: var(--text-muted); display:block; margin-bottom:4px;">${t('start_date')}</span>
            <input type="date" id="report-input-start" class="form-input" value="${startDateDefault}" style="padding: 8px 10px; font-size: 0.9rem;" />
          </div>
          <div>
            <span style="font-size: 0.72rem; color: var(--text-muted); display:block; margin-bottom:4px;">${t('end_date')}</span>
            <input type="date" id="report-input-end" class="form-input" value="${endDateDefault}" style="padding: 8px 10px; font-size: 0.9rem;" />
          </div>
        </div>
      </div>

      <!-- Quick Preset Ranges -->
      <div style="display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap;">
        <button type="button" class="btn-secondary report-preset-btn active" data-days="7" style="padding: 4px 10px; font-size: 0.78rem; border-radius: 14px;">
          ${t('range_7d')}
        </button>
        <button type="button" class="btn-secondary report-preset-btn" data-days="14" style="padding: 4px 10px; font-size: 0.78rem; border-radius: 14px;">
          ${t('range_14d')}
        </button>
        <button type="button" class="btn-secondary report-preset-btn" data-days="30" style="padding: 4px 10px; font-size: 0.78rem; border-radius: 14px;">
          ${t('range_30d')}
        </button>
        <button type="button" class="btn-secondary report-preset-btn" data-type="month" style="padding: 4px 10px; font-size: 0.78rem; border-radius: 14px;">
          ${t('range_month')}
        </button>
      </div>

      <!-- Format Selection -->
      <div style="margin-bottom: 20px;">
        <label class="form-label">${t('file_format')}</label>
        <div style="display: flex; gap: 14px; margin-top: 6px; flex-wrap: wrap;">
          <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9rem; cursor: pointer;">
            <input type="radio" name="report-format" value="pdf" checked />
            <span style="font-weight: 600;">PDF (.pdf)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9rem; cursor: pointer;">
            <input type="radio" name="report-format" value="excel" />
            <span>Excel (.xls)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-size: 0.9rem; cursor: pointer;">
            <input type="radio" name="report-format" value="csv" />
            <span>CSV (.csv)</span>
          </label>
        </div>
      </div>

      <div id="report-dialog-actions" style="margin-top: 4px; display: flex; flex-direction: column; gap: 8px;">
        <button type="button" id="btn-submit-download-report" class="btn-primary" style="padding: 12px 16px; font-size: 0.95rem; font-weight: 700; gap: 8px; justify-content: center;">
          📥 ${t('download_report')}
        </button>
      </div>
    </div>
  `;

  document.getElementById('app').appendChild(modal);

  const startInput = modal.querySelector('#report-input-start');
  const endInput = modal.querySelector('#report-input-end');
  const presetBtns = modal.querySelectorAll('.report-preset-btn');
  const closeBtn = modal.querySelector('#btn-close-report-dialog');
  const submitBtn = modal.querySelector('#btn-submit-download-report');
  const actionsDiv = modal.querySelector('#report-dialog-actions');

  const closeDialog = () => modal.remove();
  closeBtn.addEventListener('click', closeDialog);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeDialog();
  });

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const endD = new Date();
      endInput.value = toLocalDateString(endD);

      if (btn.dataset.type === 'month') {
        const startD = new Date(endD.getFullYear(), endD.getMonth(), 1);
        startInput.value = toLocalDateString(startD);
      } else {
        const days = Number(btn.dataset.days) || 7;
        const startD = new Date(endD);
        startD.setDate(startD.getDate() - (days - 1));
        startInput.value = toLocalDateString(startD);
      }
    });
  });

  submitBtn.addEventListener('click', async () => {
    const sVal = startInput.value;
    const eVal = endInput.value;
    if (!sVal || !eVal) return;
    const sDate = sVal <= eVal ? sVal : eVal;
    const eDate = sVal <= eVal ? eVal : sVal;
    const selectedFormat = modal.querySelector('input[name="report-format"]:checked')?.value || 'pdf';

    submitBtn.disabled = true;
    submitBtn.innerHTML = `⏳ ${t('generating_report')}`;

    try {
      const report = await createReportBlob(sDate, eDate, selectedFormat);
      if (!report) {
        alert(t('no_data_for_report'));
        submitBtn.disabled = false;
        submitBtn.innerHTML = `📥 ${t('download_report')}`;
        return;
      }

      // Try automatic download and show in-app notification banner
      const blobUrl = downloadBlob(report.blob, report.fileName);
      showDownloadNotification(report.fileName, blobUrl, report.mimeType, report.blob);

      // Check if Web Share API with files is supported
      let canShare = false;
      let shareFile = null;
      try {
        if ('canShare' in navigator && 'share' in navigator) {
          shareFile = new File([report.blob], report.fileName, { type: report.mimeType });
          canShare = navigator.canShare({ files: [shareFile] });
        }
      } catch (e) {
        canShare = false;
      }

      // Transform action container to show success & provide direct buttons for Open, Download, and Share
      if (actionsDiv) {
        actionsDiv.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:10px; width:100%; margin-top:4px;">
            <div style="color:var(--accent-secondary, #10b981); font-size:0.95rem; font-weight:700; text-align:center;">
              ✓ ${t('report_ready')}
            </div>

            <button type="button" id="btn-open-report-direct" class="btn-primary" style="padding: 12px 16px; font-size: 0.95rem; font-weight: 700; gap: 8px; justify-content: center; background: #0284c7; border-color: #0284c7;">
              👁️ ${t('open_report')}
            </button>

            <button type="button" id="btn-manual-download" class="btn-secondary" style="padding: 11px 16px; font-size: 0.92rem; font-weight: 600; gap: 8px; justify-content: center;">
              📥 ${t('download')} (${report.fileName})
            </button>

            ${canShare ? `
              <button type="button" id="btn-share-report" class="btn-secondary" style="padding: 10px 16px; font-size: 0.9rem; font-weight: 600; gap: 8px; justify-content: center;">
                📤 ${t('open_with')}
              </button>
            ` : ''}
          </div>
        `;

        const openBtn = actionsDiv.querySelector('#btn-open-report-direct');
        openBtn.addEventListener('click', () => {
          openFile(blobUrl, report.fileName, report.mimeType, report.blob);
        });

        const manualBtn = actionsDiv.querySelector('#btn-manual-download');
        manualBtn.addEventListener('click', () => {
          // Direct synchronous user activation
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = blobUrl;
          a.download = report.fileName;
          a.rel = 'noopener';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => a.remove(), 1000);
          showDownloadNotification(report.fileName, blobUrl, report.mimeType, report.blob);
        });

        if (canShare && shareFile) {
          const shareBtn = actionsDiv.querySelector('#btn-share-report');
          shareBtn.addEventListener('click', async () => {
            try {
              await navigator.share({
                files: [shareFile],
                title: report.fileName,
              });
            } catch (err) {
              if (err.name !== 'AbortError') {
                openFile(blobUrl, report.fileName, report.mimeType, report.blob);
              }
            }
          });
        }
      }
    } catch (err) {
      console.error('Report generation error:', err);
      alert('Error: ' + err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = `📥 ${t('download_report')}`;
    }
  });
}

export async function createReportBlob(startDateStr, endDateStr, format = 'pdf') {
  const lang = getLanguage();
  const meals = await getMealsByDateRange(startDateStr, endDateStr);
  const allWeights = await getAllWeights();
  allWeights.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // Group meals by date
  const mealsByDate = new Map();
  for (const m of meals) {
    if (!mealsByDate.has(m.date)) mealsByDate.set(m.date, []);
    mealsByDate.get(m.date).push(m);
  }

  const dates = [...mealsByDate.keys()].sort();

  if (dates.length === 0) {
    return null;
  }

  // Populate weightMap: direct match, direct getWeightByDate, and fallback to latest weight on/before date
  const weightMap = new Map();
  for (const w of allWeights) {
    const d = w.date || w.id;
    const val = w.weight !== undefined ? w.weight : (w.value !== undefined ? w.value : w.val);
    if (d && val !== undefined && val !== null) {
      weightMap.set(d, val);
    }
  }

  for (const d of dates) {
    if (!weightMap.has(d)) {
      const directW = await getWeightByDate(d);
      if (directW !== null && directW !== undefined) {
        weightMap.set(d, directW);
      }
    }
  }

  for (const d of dates) {
    if (!weightMap.has(d) || weightMap.get(d) === null || weightMap.get(d) === undefined) {
      const priorWeights = allWeights.filter(w => (w.date || w.id) <= d && (w.weight !== undefined ? w.weight : (w.value !== undefined ? w.value : w.val)));
      if (priorWeights.length > 0) {
        const lastW = priorWeights[priorWeights.length - 1];
        const val = lastW.weight !== undefined ? lastW.weight : (lastW.value !== undefined ? lastW.value : lastW.val);
        weightMap.set(d, val);
      } else if (allWeights.length > 0) {
        const firstW = allWeights[0];
        const val = firstW.weight !== undefined ? firstW.weight : (firstW.value !== undefined ? firstW.value : firstW.val);
        weightMap.set(d, val);
      }
    }
  }

  // Pre-load targets for all dates
  const targetsMap = new Map();
  for (const d of dates) {
    const targets = await getTargetsForDate(d);
    targetsMap.set(d, targets);
  }

  const fileBaseName = `calorie_report_${startDateStr}_${endDateStr}`;

  if (format === 'pdf') {
    const pdfBlob = await generatePdfReport(dates, mealsByDate, weightMap, targetsMap, lang);
    return { blob: pdfBlob, fileName: `${fileBaseName}.pdf`, mimeType: 'application/pdf' };
  } else if (format === 'csv') {
    const csvContent = generateCsvSpreadsheet(dates, mealsByDate, weightMap, targetsMap, lang);
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return { blob: csvBlob, fileName: `${fileBaseName}.csv`, mimeType: 'text/csv' };
  } else {
    const xmlContent = generateExcelXmlSpreadsheet(dates, mealsByDate, weightMap, targetsMap, lang);
    const xmlBlob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    return { blob: xmlBlob, fileName: `${fileBaseName}.xls`, mimeType: 'application/vnd.ms-excel' };
  }
}

export async function exportReport(startDateStr, endDateStr, format = 'pdf') {
  const report = await createReportBlob(startDateStr, endDateStr, format);
  if (!report) {
    alert(t('no_data_for_report'));
    return;
  }
  downloadBlob(report.blob, report.fileName);
}

// ----------------------------------------------------
// PDF GENERATION VIA HI-RES CANVAS PAGES
// ----------------------------------------------------
async function generatePdfReport(dates, mealsByDate, weightMap, targetsMap, lang) {
  const canvases = [];
  const pageWidth = 1240;
  const pageHeight = 1754;
  const maxUsableY = 1660;

  // Column X positions
  const colName = 60;
  const colWeight = 370;
  const colKcal = 470;
  const colPro = 560;
  const colFat = 720;
  const colCarb = 880;
  const colFib = 1050;
  const colSalt = 1160;

  let currentCanvas = null;
  let ctx = null;
  let curY = 70;

  function newPage() {
    currentCanvas = document.createElement('canvas');
    currentCanvas.width = pageWidth;
    currentCanvas.height = pageHeight;
    ctx = currentCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageWidth, pageHeight);
    canvases.push(currentCanvas);
    curY = 70;
  }

  function ensureSpace(neededHeight) {
    if (curY + neededHeight > maxUsableY) {
      newPage();
    }
  }

  // Start first page
  newPage();

  for (let dIdx = 0; dIdx < dates.length; dIdx++) {
    const d = dates[dIdx];
    const dayMeals = mealsByDate.get(d) || [];
    const weightVal = weightMap.get(d);
    const weightDisplay = fmtWeight(weightVal);

    const targets = targetsMap.get(d) || {};
    const targetCal = targets.calories || 2000;
    const targetPro = targets.protein || 90;
    const targetFat = targets.fats || 65;
    const targetSatFat = targets.saturated_fats !== undefined ? targets.saturated_fats : 20;
    const targetCarb = targets.carbs || 220;
    const targetSug = targets.sugar !== undefined ? targets.sugar : 40;
    const targetFib = targets.fiber !== undefined ? targets.fiber : 30;
    const targetSalt = targets.salt !== undefined ? targets.salt : 5;

    // Group meals
    const mealTypes = [];
    for (const m of dayMeals) {
      const type = m.meal_type || 'snack';
      if (!mealTypes.includes(type)) mealTypes.push(type);
    }

    // If consecutive day on the same page, check if we have enough room to start (Day Header + 1 meal)
    if (curY > 70) {
      if (curY + 220 > maxUsableY) {
        newPage();
      } else {
        curY += 40; // Clean spacing between consecutive days on the same page
      }
    }

    // Day Header: Date (Green, left-aligned) and Weight (Black, right-aligned to weight column)
    ensureSpace(46);
    ctx.font = 'bold 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = '#16a34a';
    ctx.textAlign = 'left';
    ctx.fillText(formatReportDate(d), colName, curY);

    if (weightDisplay) {
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'right';
      ctx.fillText(weightDisplay, colWeight, curY);
    }
    curY += 46;

    let dayTotalCal = 0, dayTotalPro = 0, dayTotalFat = 0, dayTotalSatFat = 0, dayTotalCarb = 0, dayTotalSug = 0, dayTotalFib = 0, dayTotalSalt = 0;

    for (const mt of mealTypes) {
      const items = dayMeals.filter(m => (m.meal_type || 'snack') === mt);
      let subCal = 0, subPro = 0, subFatVal = 0, subSatFatVal = 0, subCarbVal = 0, subSugVal = 0, subFib = 0, subSalt = 0;

      // Estimate total height needed for this meal section:
      // header (30) + items (N * 27) + subtotal (35) + gap (15)
      const mealTotalHeight = 30 + items.length * 27 + 35 + 15;

      // If the whole meal block can fit on a clean page, but doesn't fit on the current remaining page,
      // move it to a new page so the meal is not cut across pages unnecessarily.
      if (curY + mealTotalHeight > maxUsableY && mealTotalHeight <= (maxUsableY - 70)) {
        newPage();
      } else {
        ensureSpace(30 + 27);
      }

      // Meal Header line: Meal title (Orange) + Column Headers
      ctx.textAlign = 'left';
      ctx.font = 'bold 22px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillStyle = '#c2410c';
      ctx.fillText(t(mt), colName, curY);

      ctx.textAlign = 'right';
      ctx.font = 'bold 20px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillStyle = '#111827';
      ctx.fillText(t('weight'), colWeight, curY);
      ctx.fillText(t('kcal'), colKcal, curY);
      ctx.fillText(t('protein_short'), colPro, curY);
      ctx.fillText(t('fats_short'), colFat, curY);
      ctx.fillText(t('carbs_short'), colCarb, curY);
      ctx.fillText(t('fiber'), colFib, curY);
      ctx.fillText(t('salt'), colSalt, curY);

      curY += 30;

      // Food items
      ctx.font = '19px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillStyle = '#1f2937';

      for (const m of items) {
        ensureSpace(27);
        const shortName = resolveShortName(m, lang);
        const g = Math.round(Number(m.amount_g || 0));
        const cal = Number(m.calories || 0);
        const pro = Number(m.protein || 0);
        const fat = Number(m.fats || 0);
        const sf = Number(m.saturated_fats !== undefined ? m.saturated_fats : (m.sat_fat || 0));
        const carb = Number(m.carbs || 0);
        const sug = Number(m.sugar || 0);
        const fib = Number(m.fiber || 0);
        const salt = Number(m.salt || 0);

        subCal += cal; subPro += pro; subFatVal += fat; subSatFatVal += sf;
        subCarbVal += carb; subSugVal += sug; subFib += fib; subSalt += salt;

        dayTotalCal += cal; dayTotalPro += pro; dayTotalFat += fat; dayTotalSatFat += sf;
        dayTotalCarb += carb; dayTotalSug += sug; dayTotalFib += fib; dayTotalSalt += salt;

        const calDisplay = Math.round(cal * 10) / 10;

        ctx.font = '19px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillStyle = '#1f2937';
        ctx.textAlign = 'left';
        ctx.fillText(shortName, colName, curY);

        ctx.textAlign = 'right';
        ctx.fillText(`${g} г`, colWeight, curY);
        ctx.fillText(`${calDisplay}`, colKcal, curY);
        ctx.fillText(fmtNum(pro), colPro, curY);
        ctx.fillText(fmtFat(fat, sf), colFat, curY);
        ctx.fillText(fmtCarb(carb, sug), colCarb, curY);
        ctx.fillText(fmtNum(fib), colFib, curY);
        ctx.fillText(fmtSalt(salt), colSalt, curY);

        curY += 27;
      }

      // Subtotals (Purple)
      ensureSpace(35);
      const subCalDisplay = Math.round(subCal * 10) / 10;
      const subProDisplay = Math.round(subPro * 10) / 10;
      const subFibDisplay = Math.round(subFib * 100) / 100;
      const subSaltDisplay = subSalt > 0 ? `${Math.round(subSalt * 100) / 100}` : '';

      ctx.font = 'bold 20px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillStyle = '#7c3aed';
      ctx.textAlign = 'right';

      ctx.fillText(`${subCalDisplay}`, colKcal, curY);
      ctx.fillText(`${subProDisplay}`, colPro, curY);
      ctx.fillText(subFat(subFatVal, subSatFatVal), colFat, curY);
      ctx.fillText(subCarb(subCarbVal, subSugVal), colCarb, curY);
      ctx.fillText(`${subFibDisplay}`, colFib, curY);
      if (subSaltDisplay) {
        ctx.fillText(subSaltDisplay, colSalt, curY);
      }

      curY += 35;
    }

    // Daily summary
    ensureSpace(90);
    const dayCalDisplay = Math.round(dayTotalCal);
    const dayProDisplay = Math.round(dayTotalPro * 10) / 10;
    const dayFatDisplay = `${Math.round(dayTotalFat * 100) / 100}(${Math.round(dayTotalSatFat * 100) / 100})`;
    const dayCarbDisplay = `${Math.round(dayTotalCarb * 100) / 100}(${Math.round(dayTotalSug * 100) / 100})`;
    const dayFibDisplay = `${Math.round(dayTotalFib * 100) / 100}`;
    const daySaltDisplay = dayTotalSalt > 0 ? `${Math.round(dayTotalSalt * 100) / 100}` : '-';

    curY += 12;

    // Summary Header
    ctx.textAlign = 'left';
    ctx.font = 'bold italic 22px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = '#111827';
    ctx.fillText(t('for_day'), colName, curY);

    ctx.textAlign = 'right';
    ctx.font = 'bold 20px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillText(t('kcal'), colKcal, curY);
    ctx.fillText(t('protein_short'), colPro, curY);
    ctx.fillText(t('fats_short'), colFat, curY);
    ctx.fillText(t('carbs_short'), colCarb, curY);
    ctx.fillText(t('fiber'), colFib, curY);
    ctx.fillText(t('salt'), colSalt, curY);

    curY += 28;

    // Actual Totals (Bold Black)
    ctx.font = 'bold 21px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'right';
    ctx.fillText(`${dayCalDisplay}`, colKcal, curY);
    ctx.fillText(`${dayProDisplay}`, colPro, curY);
    ctx.fillText(dayFatDisplay, colFat, curY);
    ctx.fillText(dayCarbDisplay, colCarb, curY);
    ctx.fillText(dayFibDisplay, colFib, curY);
    ctx.fillText(daySaltDisplay, colSalt, curY);

    curY += 26;

    // Daily Targets (Muted Italic)
    ctx.font = 'italic 18px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'right';
    ctx.fillText(`${targetCal}`, colKcal, curY);
    ctx.fillText(`${targetPro}`, colPro, curY);
    ctx.fillText(`${targetFat}(${targetSatFat})`, colFat, curY);
    ctx.fillText(`${targetCarb}(${targetSug})`, colCarb, curY);
    ctx.fillText(`${targetFib}`, colFib, curY);
    ctx.fillText(`${targetSalt}`, colSalt, curY);

    curY += 30;
  }

  return generatePdfFromCanvases(canvases);
}

function generatePdfFromCanvases(canvases) {
  const chunks = [];
  const encoder = new TextEncoder();
  const offsets = [];
  let currentOffset = 0;

  function addStr(str) {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    currentOffset += bytes.length;
  }

  function addBytes(bytes) {
    chunks.push(bytes);
    currentOffset += bytes.length;
  }

  const numPages = canvases.length;
  const pageObjIds = [];
  const imageObjIds = [];
  const contentObjIds = [];

  for (let i = 0; i < numPages; i++) {
    pageObjIds.push(3 + i * 3);
    imageObjIds.push(3 + i * 3 + 1);
    contentObjIds.push(3 + i * 3 + 2);
  }

  const totalObjs = 2 + numPages * 3;

  addStr("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  // Catalog
  offsets[1] = currentOffset;
  addStr("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Pages
  offsets[2] = currentOffset;
  const kidsStr = pageObjIds.map(id => `${id} 0 R`).join(' ');
  addStr(`2 0 obj\n<< /Type /Pages /Kids [ ${kidsStr} ] /Count ${numPages} >>\nendobj\n`);

  for (let i = 0; i < numPages; i++) {
    const canvas = canvases[i];
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const base64Data = dataUrl.split(',')[1];
    const binaryStr = atob(base64Data);
    const jpegBytes = new Uint8Array(binaryStr.length);
    for (let b = 0; b < binaryStr.length; b++) {
      jpegBytes[b] = binaryStr.charCodeAt(b);
    }

    const pageId = pageObjIds[i];
    const imgId = imageObjIds[i];
    const contId = contentObjIds[i];

    // Page Object (Standard A4 dimensions: 595.28 x 841.89)
    offsets[pageId] = currentOffset;
    addStr(`${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im1 ${imgId} 0 R >> >> /Contents ${contId} 0 R >>\nendobj\n`);

    // Image Object
    offsets[imgId] = currentOffset;
    addStr(`${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
    addBytes(jpegBytes);
    addStr("\nendstream\nendobj\n");

    // Content Stream Object
    offsets[contId] = currentOffset;
    const streamContent = "q\n595.28 0 0 841.89 0 0 cm\n/Im1 Do\nQ\n";
    addStr(`${contId} 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream\nendobj\n`);
  }

  // xref
  const startXref = currentOffset;
  addStr(`xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= totalObjs; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    addStr(`${offStr} 00000 n \n`);
  }

  addStr(`trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`);

  return new Blob(chunks, { type: 'application/pdf' });
}

// ----------------------------------------------------
// CSV GENERATION
// ----------------------------------------------------
function generateCsvSpreadsheet(dates, mealsByDate, weightMap, targetsMap, lang) {
  const lines = [];
  lines.push('\uFEFFsep=;'); // UTF-8 BOM + Excel delimiter hint

  for (const d of dates) {
    const dayMeals = mealsByDate.get(d) || [];
    const weightVal = weightMap.get(d);
    const weightDisplay = fmtWeight(weightVal);

    // Day header line: Date and Weight
    lines.push(`${escapeCsv(formatReportDate(d))};${escapeCsv(weightDisplay)};;;;;;`);

    // Group meals preserving occurrence order
    const mealTypes = [];
    for (const m of dayMeals) {
      const type = m.meal_type || 'snack';
      if (!mealTypes.includes(type)) mealTypes.push(type);
    }

    let dayTotalCal = 0, dayTotalPro = 0, dayTotalFat = 0, dayTotalSatFat = 0, dayTotalCarb = 0, dayTotalSug = 0, dayTotalFib = 0, dayTotalSalt = 0;

    for (const mt of mealTypes) {
      const items = dayMeals.filter(m => (m.meal_type || 'snack') === mt);
      let subCal = 0, subPro = 0, subFatVal = 0, subSatFatVal = 0, subCarbVal = 0, subSugVal = 0, subFib = 0, subSalt = 0;

      // Meal section title
      lines.push(`${escapeCsv(t(mt))};;;;;;;`);

      // Explicit Column headers: Product, Weight, Kcal, Protein, Fat, Carbs, Fiber, Salt
      lines.push([
        escapeCsv(t('food_item')),
        escapeCsv(t('weight')),
        escapeCsv(t('kcal')),
        escapeCsv(t('protein_short')),
        escapeCsv(t('fats_short')),
        escapeCsv(t('carbs_short')),
        escapeCsv(t('fiber')),
        escapeCsv(t('salt'))
      ].join(';'));

      for (const m of items) {
        const shortName = resolveShortName(m, lang);
        const g = Math.round(Number(m.amount_g || 0));
        const cal = Number(m.calories || 0);
        const pro = Number(m.protein || 0);
        const fat = Number(m.fats || 0);
        const sf = Number(m.saturated_fats !== undefined ? m.saturated_fats : (m.sat_fat || 0));
        const carb = Number(m.carbs || 0);
        const sug = Number(m.sugar || 0);
        const fib = Number(m.fiber || 0);
        const salt = Number(m.salt || 0);

        subCal += cal; subPro += pro; subFatVal += fat; subSatFatVal += sf;
        subCarbVal += carb; subSugVal += sug; subFib += fib; subSalt += salt;

        dayTotalCal += cal; dayTotalPro += pro; dayTotalFat += fat; dayTotalSatFat += sf;
        dayTotalCarb += carb; dayTotalSug += sug; dayTotalFib += fib; dayTotalSalt += salt;

        const calDisplay = Math.round(cal * 10) / 10;

        lines.push([
          escapeCsv(shortName),
          escapeCsv(`${g} г`),
          escapeCsv(calDisplay),
          escapeCsv(fmtNum(pro)),
          escapeCsv(fmtFat(fat, sf)),
          escapeCsv(fmtCarb(carb, sug)),
          escapeCsv(fmtNum(fib)),
          escapeCsv(fmtSalt(salt))
        ].join(';'));
      }

      // Meal subtotal line
      const subCalDisplay = Math.round(subCal * 10) / 10;
      const subProDisplay = Math.round(subPro * 10) / 10;
      const subFibDisplay = Math.round(subFib * 100) / 100;
      const subSaltDisplay = subSalt > 0 ? `${Math.round(subSalt * 100) / 100}` : '-';

      lines.push([
        escapeCsv(`${t('subtotal')} ${t(mt)}`),
        '',
        escapeCsv(subCalDisplay),
        escapeCsv(subProDisplay),
        escapeCsv(subFat(subFatVal, subSatFatVal)),
        escapeCsv(subCarb(subCarbVal, subSugVal)),
        escapeCsv(subFibDisplay),
        escapeCsv(subSaltDisplay)
      ].join(';'));

      lines.push(';;;;;;;');
    }

    // Daily summary
    const targets = targetsMap.get(d) || {};
    const targetCal = targets.calories || 2000;
    const targetPro = targets.protein || 90;
    const targetFat = targets.fats || 65;
    const targetSatFat = targets.saturated_fats !== undefined ? targets.saturated_fats : 20;
    const targetCarb = targets.carbs || 220;
    const targetSug = targets.sugar !== undefined ? targets.sugar : 40;
    const targetFib = targets.fiber !== undefined ? targets.fiber : 30;
    const targetSalt = targets.salt !== undefined ? targets.salt : 5;

    const dayCalDisplay = Math.round(dayTotalCal);
    const dayProDisplay = Math.round(dayTotalPro * 10) / 10;
    const dayFatDisplay = `${Math.round(dayTotalFat * 100) / 100}(${Math.round(dayTotalSatFat * 100) / 100})`;
    const dayCarbDisplay = `${Math.round(dayTotalCarb * 100) / 100}(${Math.round(dayTotalSug * 100) / 100})`;
    const dayFibDisplay = `${Math.round(dayTotalFib * 100) / 100}`;
    const daySaltDisplay = dayTotalSalt > 0 ? `${Math.round(dayTotalSalt * 100) / 100}` : '-';

    lines.push([
      escapeCsv(t('for_day')),
      '',
      escapeCsv(t('kcal')),
      escapeCsv(t('protein_short')),
      escapeCsv(t('fats_short')),
      escapeCsv(t('carbs_short')),
      escapeCsv(t('fiber')),
      escapeCsv(t('salt'))
    ].join(';'));

    lines.push([
      escapeCsv(t('for_day')),
      '',
      escapeCsv(dayCalDisplay),
      escapeCsv(dayProDisplay),
      escapeCsv(dayFatDisplay),
      escapeCsv(dayCarbDisplay),
      escapeCsv(dayFibDisplay),
      escapeCsv(daySaltDisplay)
    ].join(';'));

    lines.push([
      escapeCsv(t('target_label')),
      '',
      escapeCsv(targetCal),
      escapeCsv(targetPro),
      escapeCsv(`${targetFat}(${targetSatFat})`),
      escapeCsv(`${targetCarb}(${targetSug})`),
      escapeCsv(targetFib),
      escapeCsv(targetSalt)
    ].join(';'));

    lines.push(';;;;;;;');
    lines.push(';;;;;;;');
  }

  return lines.join('\r\n');
}

// ----------------------------------------------------
// EXCEL XML SPREADSHEET GENERATION
// ----------------------------------------------------
function generateExcelXmlSpreadsheet(dates, mealsByDate, weightMap, targetsMap, lang) {
  let rowsXml = '';

  for (const d of dates) {
    const dayMeals = mealsByDate.get(d) || [];
    const weightVal = weightMap.get(d);
    const weightDisplay = fmtWeight(weightVal);

    // Day Header
    rowsXml += `
      <Row ss:Height="22">
        <Cell ss:StyleID="DayDate"><Data ss:Type="String">${escapeXml(formatReportDate(d))}</Data></Cell>
        <Cell ss:StyleID="DayWeight"><Data ss:Type="String">${escapeXml(weightDisplay)}</Data></Cell>
      </Row>
    `;

    // Group meals
    const mealTypes = [];
    for (const m of dayMeals) {
      const type = m.meal_type || 'snack';
      if (!mealTypes.includes(type)) mealTypes.push(type);
    }

    let dayTotalCal = 0, dayTotalPro = 0, dayTotalFat = 0, dayTotalSatFat = 0, dayTotalCarb = 0, dayTotalSug = 0, dayTotalFib = 0, dayTotalSalt = 0;

    for (const mt of mealTypes) {
      const items = dayMeals.filter(m => (m.meal_type || 'snack') === mt);
      let subCal = 0, subPro = 0, subFatVal = 0, subSatFatVal = 0, subCarbVal = 0, subSugVal = 0, subFib = 0, subSalt = 0;

      // Meal section title
      rowsXml += `
        <Row ss:Height="18">
          <Cell ss:StyleID="MealHeader"><Data ss:Type="String">${escapeXml(t(mt))}</Data></Cell>
        </Row>
      `;

      // Explicit Column headers: Product, Weight, Kcal, Protein, Fat, Carbs, Fiber, Salt
      rowsXml += `
        <Row ss:Height="17">
          <Cell ss:StyleID="ColHeaderLeft"><Data ss:Type="String">${escapeXml(t('food_item'))}</Data></Cell>
          <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(t('weight'))}</Data></Cell>
          <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(t('kcal'))}</Data></Cell>
          <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(t('protein_short'))}</Data></Cell>
          <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(t('fats_short'))}</Data></Cell>
          <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(t('carbs_short'))}</Data></Cell>
          <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(t('fiber'))}</Data></Cell>
          <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(t('salt'))}</Data></Cell>
        </Row>
      `;

      for (const m of items) {
        const shortName = resolveShortName(m, lang);
        const g = Math.round(Number(m.amount_g || 0));
        const cal = Number(m.calories || 0);
        const pro = Number(m.protein || 0);
        const fat = Number(m.fats || 0);
        const sf = Number(m.saturated_fats !== undefined ? m.saturated_fats : (m.sat_fat || 0));
        const carb = Number(m.carbs || 0);
        const sug = Number(m.sugar || 0);
        const fib = Number(m.fiber || 0);
        const salt = Number(m.salt || 0);

        subCal += cal; subPro += pro; subFatVal += fat; subSatFatVal += sf;
        subCarbVal += carb; subSugVal += sug; subFib += fib; subSalt += salt;

        dayTotalCal += cal; dayTotalPro += pro; dayTotalFat += fat; dayTotalSatFat += sf;
        dayTotalCarb += carb; dayTotalSug += sug; dayTotalFib += fib; dayTotalSalt += salt;

        const calDisplay = Math.round(cal * 10) / 10;

        rowsXml += `
          <Row ss:Height="16">
            <Cell ss:StyleID="ItemLeft"><Data ss:Type="String">${escapeXml(shortName)}</Data></Cell>
            <Cell ss:StyleID="ItemRight"><Data ss:Type="String">${escapeXml(`${g} г`)}</Data></Cell>
            <Cell ss:StyleID="ItemRight"><Data ss:Type="Number">${calDisplay}</Data></Cell>
            <Cell ss:StyleID="ItemRight"><Data ss:Type="String">${escapeXml(fmtNum(pro))}</Data></Cell>
            <Cell ss:StyleID="ItemRight"><Data ss:Type="String">${escapeXml(fmtFat(fat, sf))}</Data></Cell>
            <Cell ss:StyleID="ItemRight"><Data ss:Type="String">${escapeXml(fmtCarb(carb, sug))}</Data></Cell>
            <Cell ss:StyleID="ItemRight"><Data ss:Type="String">${escapeXml(fmtNum(fib))}</Data></Cell>
            <Cell ss:StyleID="ItemRight"><Data ss:Type="String">${escapeXml(fmtSalt(salt))}</Data></Cell>
          </Row>
        `;
      }

      // Meal subtotal
      const subCalDisplay = Math.round(subCal * 10) / 10;
      const subProDisplay = Math.round(subPro * 10) / 10;
      const subFibDisplay = Math.round(subFib * 100) / 100;
      const subSaltDisplay = subSalt > 0 ? `${Math.round(subSalt * 100) / 100}` : '-';

      rowsXml += `
        <Row ss:Height="17">
          <Cell ss:StyleID="Subtotal"><Data ss:Type="String">${escapeXml(`${t('subtotal')} ${t(mt)}`)}</Data></Cell>
          <Cell ss:StyleID="Subtotal"></Cell>
          <Cell ss:StyleID="Subtotal"><Data ss:Type="Number">${subCalDisplay}</Data></Cell>
          <Cell ss:StyleID="Subtotal"><Data ss:Type="Number">${subProDisplay}</Data></Cell>
          <Cell ss:StyleID="Subtotal"><Data ss:Type="String">${escapeXml(subFat(subFatVal, subSatFatVal))}</Data></Cell>
          <Cell ss:StyleID="Subtotal"><Data ss:Type="String">${escapeXml(subCarb(subCarbVal, subSugVal))}</Data></Cell>
          <Cell ss:StyleID="Subtotal"><Data ss:Type="String">${escapeXml(subFibDisplay)}</Data></Cell>
          <Cell ss:StyleID="Subtotal"><Data ss:Type="String">${escapeXml(subSaltDisplay)}</Data></Cell>
        </Row>
        <Row ss:Height="8"></Row>
      `;
    }

    // Daily summary
    const targets = targetsMap.get(d) || {};
    const targetCal = targets.calories || 2000;
    const targetPro = targets.protein || 90;
    const targetFat = targets.fats || 65;
    const targetSatFat = targets.saturated_fats !== undefined ? targets.saturated_fats : 20;
    const targetCarb = targets.carbs || 220;
    const targetSug = targets.sugar !== undefined ? targets.sugar : 40;
    const targetFib = targets.fiber !== undefined ? targets.fiber : 30;
    const targetSalt = targets.salt !== undefined ? targets.salt : 5;

    const dayCalDisplay = Math.round(dayTotalCal);
    const dayProDisplay = Math.round(dayTotalPro * 10) / 10;
    const dayFatDisplay = `${Math.round(dayTotalFat * 100) / 100}(${Math.round(dayTotalSatFat * 100) / 100})`;
    const dayCarbDisplay = `${Math.round(dayTotalCarb * 100) / 100}(${Math.round(dayTotalSug * 100) / 100})`;
    const dayFibDisplay = `${Math.round(dayTotalFib * 100) / 100}`;
    const daySaltDisplay = dayTotalSalt > 0 ? `${Math.round(dayTotalSalt * 100) / 100}` : '-';

    rowsXml += `
      <Row ss:Height="18">
        <Cell ss:StyleID="DayTotalHeader"><Data ss:Type="String">${escapeXml(t('for_day'))}</Data></Cell>
        <Cell ss:StyleID="ColHeader"></Cell>
        <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(t('kcal'))}</Data></Cell>
        <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(t('protein_short'))}</Data></Cell>
        <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(t('fats_short'))}</Data></Cell>
        <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(t('carbs_short'))}</Data></Cell>
        <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(t('fiber'))}</Data></Cell>
        <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(t('salt'))}</Data></Cell>
      </Row>
      <Row ss:Height="18">
        <Cell ss:StyleID="DayTotal"><Data ss:Type="String">${escapeXml(t('for_day'))}</Data></Cell>
        <Cell ss:StyleID="DayTotal"></Cell>
        <Cell ss:StyleID="DayTotal"><Data ss:Type="Number">${dayCalDisplay}</Data></Cell>
        <Cell ss:StyleID="DayTotal"><Data ss:Type="Number">${dayProDisplay}</Data></Cell>
        <Cell ss:StyleID="DayTotal"><Data ss:Type="String">${escapeXml(dayFatDisplay)}</Data></Cell>
        <Cell ss:StyleID="DayTotal"><Data ss:Type="String">${escapeXml(dayCarbDisplay)}</Data></Cell>
        <Cell ss:StyleID="DayTotal"><Data ss:Type="String">${escapeXml(dayFibDisplay)}</Data></Cell>
        <Cell ss:StyleID="DayTotal"><Data ss:Type="String">${escapeXml(daySaltDisplay)}</Data></Cell>
      </Row>
      <Row ss:Height="16">
        <Cell ss:StyleID="DayTarget"><Data ss:Type="String">${escapeXml(t('target_label'))}</Data></Cell>
        <Cell ss:StyleID="DayTarget"></Cell>
        <Cell ss:StyleID="DayTarget"><Data ss:Type="Number">${targetCal}</Data></Cell>
        <Cell ss:StyleID="DayTarget"><Data ss:Type="Number">${targetPro}</Data></Cell>
        <Cell ss:StyleID="DayTarget"><Data ss:Type="String">${escapeXml(`${targetFat}(${targetSatFat})`)}</Data></Cell>
        <Cell ss:StyleID="DayTarget"><Data ss:Type="String">${escapeXml(`${targetCarb}(${targetSug})`)}</Data></Cell>
        <Cell ss:StyleID="DayTarget"><Data ss:Type="Number">${targetFib}</Data></Cell>
        <Cell ss:StyleID="DayTarget"><Data ss:Type="Number">${targetSalt}</Data></Cell>
      </Row>
      <Row ss:Height="16"></Row>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#111827"/>
    </Style>
    <Style ss:ID="DayDate">
      <Font ss:FontName="Segoe UI" ss:Size="12" ss:Bold="1" ss:Color="#16A34A"/>
    </Style>
    <Style ss:ID="DayWeight">
      <Font ss:FontName="Segoe UI" ss:Size="12" ss:Bold="1" ss:Color="#111827"/>
      <Alignment ss:Horizontal="Left"/>
    </Style>
    <Style ss:ID="MealHeader">
      <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#C2410C"/>
    </Style>
    <Style ss:ID="ColHeaderLeft">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#111827"/>
      <Alignment ss:Horizontal="Left"/>
    </Style>
    <Style ss:ID="ColHeader">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#111827"/>
      <Alignment ss:Horizontal="Right"/>
    </Style>
    <Style ss:ID="ItemLeft">
      <Alignment ss:Horizontal="Left"/>
    </Style>
    <Style ss:ID="ItemRight">
      <Alignment ss:Horizontal="Right"/>
    </Style>
    <Style ss:ID="Subtotal">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#7C3AED"/>
      <Alignment ss:Horizontal="Right"/>
    </Style>
    <Style ss:ID="DayTotalHeader">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Italic="1" ss:Color="#111827"/>
      <Alignment ss:Horizontal="Left"/>
    </Style>
    <Style ss:ID="DayTotal">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#111827"/>
      <Alignment ss:Horizontal="Right"/>
    </Style>
    <Style ss:ID="DayTarget">
      <Font ss:FontName="Segoe UI" ss:Size="9" ss:Italic="1" ss:Color="#6B7280"/>
      <Alignment ss:Horizontal="Right"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Report">
    <Table ss:DefaultColumnWidth="65">
      <Column ss:Width="180"/>
      <Column ss:Width="70"/>
      <Column ss:Width="65"/>
      <Column ss:Width="55"/>
      <Column ss:Width="95"/>
      <Column ss:Width="95"/>
      <Column ss:Width="85"/>
      <Column ss:Width="60"/>
      ${rowsXml}
    </Table>
  </Worksheet>
</Workbook>`;
}
