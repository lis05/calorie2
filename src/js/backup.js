import { openDB, exportAllData, importAllData, toLocalDateString } from './db.js';
import { t } from './i18n.js';

const BACKUP_DB_NAME = 'Calorie2BackupsDB';
const BACKUP_DB_VERSION = 1;
const MAX_BACKUP_DAYS = 7;

let backupDbInstance = null;

export function openBackupsDB() {
  if (backupDbInstance) return Promise.resolve(backupDbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BACKUP_DB_NAME, BACKUP_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('daily_backups')) {
        db.createObjectStore('daily_backups', { keyPath: 'date' });
      }
    };

    request.onsuccess = (event) => {
      backupDbInstance = event.target.result;
      resolve(backupDbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Performs daily backup.
 * Captures all data from primary DB and saves to daily_backups store under key YYYY-MM-DD.
 * Keeps only the last 7 daily backups.
 */
export async function performDailyBackup() {
  try {
    const backupDb = await openBackupsDB();
    const todayStr = toLocalDateString(new Date());

    const currentData = await exportAllData();
    const hasData = (currentData.foods && currentData.foods.length > 0) ||
                    (currentData.meals && currentData.meals.length > 0) ||
                    (currentData.weights && currentData.weights.length > 0) ||
                    (currentData.water && currentData.water.length > 0);

    if (!hasData) return null;

    const record = {
      date: todayStr,
      timestamp: new Date().toISOString(),
      meals_count: (currentData.meals || []).length,
      foods_count: (currentData.foods || []).length,
      data: currentData
    };

    // Save or update today's backup
    await new Promise((resolve, reject) => {
      const tx = backupDb.transaction(['daily_backups'], 'readwrite');
      const store = tx.objectStore('daily_backups');
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Prune old backups, preserving only the last 7
    await pruneOldBackups(backupDb);

    return record;
  } catch (err) {
    console.error('Failed to perform daily backup:', err);
    return null;
  }
}

async function pruneOldBackups(backupDb) {
  return new Promise((resolve) => {
    const tx = backupDb.transaction(['daily_backups'], 'readwrite');
    const store = tx.objectStore('daily_backups');
    const req = store.getAll();

    req.onsuccess = () => {
      const allBackups = req.result || [];
      if (allBackups.length <= MAX_BACKUP_DAYS) {
        resolve();
        return;
      }

      // Sort newest to oldest
      allBackups.sort((a, b) => b.date.localeCompare(a.date));

      // Items to delete (beyond 7)
      const toDelete = allBackups.slice(MAX_BACKUP_DAYS);
      for (const b of toDelete) {
        store.delete(b.date);
      }
      resolve();
    };

    req.onerror = () => resolve();
  });
}

/**
 * Returns all preserved backups sorted descending by date (newest first).
 */
export async function getAllBackups() {
  try {
    const backupDb = await openBackupsDB();
    return new Promise((resolve) => {
      const tx = backupDb.transaction(['daily_backups'], 'readonly');
      const store = tx.objectStore('daily_backups');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => b.date.localeCompare(a.date));
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

/**
 * Downloads a single JSON archive containing all preserved backups (up to 7 days).
 */
export async function downloadAllBackupsArchive() {
  // Ensure we have today's latest data backed up
  await performDailyBackup();

  const backups = await getAllBackups();
  if (backups.length === 0) {
    throw new Error(t('no_backups_available'));
  }

  const archive = {
    app: 'Calorie',
    version: 5,
    archive_type: 'daily_backups_7d',
    generated_at: new Date().toISOString(),
    backup_count: backups.length,
    dates: backups.map(b => b.date),
    backups: backups.map(b => ({
      date: b.date,
      timestamp: b.timestamp,
      meals_count: b.meals_count,
      foods_count: b.foods_count,
      data: b.data
    }))
  };

  const jsonBlob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
  const fileName = `calorie2_all_backups_7d_${toLocalDateString(new Date())}.json`;
  const url = URL.createObjectURL(jsonBlob);

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
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000);

  return { fileName, count: backups.length };
}

/**
 * Restores the primary database from a specific local backup date.
 */
export async function restoreFromBackup(dateStr) {
  const backups = await getAllBackups();
  const backup = backups.find(b => b.date === dateStr);
  if (!backup || !backup.data) {
    throw new Error('Backup not found for date: ' + dateStr);
  }
  await importAllData(backup.data);
  return backup;
}
