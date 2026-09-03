import { defaultFoods } from './defaultFoods.js';

const DB_NAME = 'Calorie2DB';
const DB_VERSION = 3;

let dbInstance = null;

export function toLocalDateString(dateObj) {
  const d = dateObj || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Foods store: keyPath id (autoIncrement), indexes on name
      if (!db.objectStoreNames.contains('foods')) {
        const foodsStore = db.createObjectStore('foods', { keyPath: 'id', autoIncrement: true });
        foodsStore.createIndex('name', 'name', { unique: false });
      }

      // Meals store: keyPath id (autoIncrement), indexes on date and meal_type
      if (!db.objectStoreNames.contains('meals')) {
        const mealsStore = db.createObjectStore('meals', { keyPath: 'id', autoIncrement: true });
        mealsStore.createIndex('date', 'date', { unique: false });
        mealsStore.createIndex('meal_type', 'meal_type', { unique: false });
      }

      // Settings store: keyPath key
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Daily Targets history store: keyPath id, index on start_date
      if (!db.objectStoreNames.contains('daily_targets')) {
        const targetStore = db.createObjectStore('daily_targets', { keyPath: 'id', autoIncrement: true });
        targetStore.createIndex('start_date', 'start_date', { unique: false });
      }
    };

    request.onsuccess = async (event) => {
      dbInstance = event.target.result;
      await seedDefaultsIfEmpty(dbInstance);
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function seedDefaultsIfEmpty(db) {
  const count = await getFoodCount(db);
  if (count === 0) {
    const tx = db.transaction(['foods'], 'readwrite');
    const store = tx.objectStore('foods');
    for (const food of defaultFoods) {
      store.add(food);
    }
  } else {
    // Backfill name_en and name_uk on existing stored foods
    const tx = db.transaction(['foods'], 'readwrite');
    const store = tx.objectStore('foods');
    const req = store.getAll();
    req.onsuccess = () => {
      const items = req.result || [];
      for (const f of items) {
        if (!f.name_en) {
          const match = defaultFoods.find(df => df.name_uk === f.name || df.name === f.name);
          if (match) {
            f.name_uk = match.name_uk;
            f.name_en = match.name_en;
            if (f.salt === undefined) f.salt = match.salt;
            if (f.sugar === undefined) f.sugar = match.sugar;
            store.put(f);
          }
        }
      }
    };
  }

  // Default targets baseline (applies from dawn of time until user modifies)
  const txTargets = db.transaction(['daily_targets'], 'readwrite');
  const targetStore = txTargets.objectStore('daily_targets');
  const targetCountReq = targetStore.count();
  targetCountReq.onsuccess = () => {
    if (targetCountReq.result === 0) {
      targetStore.add({
        start_date: "1970-01-01",
        created_at: new Date().toISOString(),
        calories: 2000,
        protein: 90,
        carbs: 220,
        fats: 65,
        fiber: 30,
        salt: 5,
        sugar: 40
      });
    }
  };
}

function getFoodCount(db) {
  return new Promise((resolve) => {
    const tx = db.transaction(['foods'], 'readonly');
    const store = tx.objectStore('foods');
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(0);
  });
}

export async function getAllFoods() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['foods'], 'readonly');
    const store = tx.objectStore('foods');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getFoodById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['foods'], 'readonly');
    const store = tx.objectStore('foods');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function searchFoods(query) {
  const all = await getAllFoods();
  if (!query || !query.trim()) return all;
  const q = query.toLowerCase().trim();
  return all.filter(f => f.name.toLowerCase().includes(q));
}

export async function addFood(food) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['foods'], 'readwrite');
    const store = tx.objectStore('foods');
    const req = store.add(food);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function updateFood(food) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['foods'], 'readwrite');
    const store = tx.objectStore('foods');
    const req = store.put(food);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFood(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['foods'], 'readwrite');
    const store = tx.objectStore('foods');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Meals CRUD
export async function getMealsByDate(dateStr) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meals'], 'readonly');
    const store = tx.objectStore('meals');
    const index = store.index('date');
    const req = index.getAll(IDBKeyRange.only(dateStr));
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getMealsByDateRange(startDateStr, endDateStr) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meals'], 'readonly');
    const store = tx.objectStore('meals');
    const index = store.index('date');
    const range = IDBKeyRange.bound(startDateStr, endDateStr);
    const req = index.getAll(range);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function addMeal(meal) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meals'], 'readwrite');
    const store = tx.objectStore('meals');
    const req = store.add(meal);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function updateMeal(meal) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meals'], 'readwrite');
    const store = tx.objectStore('meals');
    const req = store.put(meal);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMeal(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meals'], 'readwrite');
    const store = tx.objectStore('meals');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Settings
export async function getSetting(key) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(['settings'], 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => resolve(null);
  });
}

export async function saveSetting(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['settings'], 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Save versioned daily targets starting from specific date (YYYY-MM-DD)
export async function saveDailyTargets(targets, startDateStr) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['daily_targets'], 'readwrite');
    const store = tx.objectStore('daily_targets');
    const record = {
      start_date: startDateStr,
      created_at: new Date().toISOString(),
      ...targets
    };
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Get effective daily targets for specific date (YYYY-MM-DD)
export async function getTargetsForDate(dateStr) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(['daily_targets'], 'readonly');
    const store = tx.objectStore('daily_targets');
    const req = store.getAll();

    req.onsuccess = () => {
      const all = req.result || [];
      // Filter targets where start_date <= dateStr, sort by start_date asc, take latest
      const valid = all.filter(t => t.start_date <= dateStr)
                       .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.id - b.id);

      if (valid.length > 0) {
        resolve(valid[valid.length - 1]);
      } else if (all.length > 0) {
        // If target date is before the earliest custom target, return the earliest target
        const sorted = all.sort((a, b) => a.start_date.localeCompare(b.start_date));
        resolve(sorted[0]);
      } else {
        // Fallback default targets
        resolve({
          calories: 2000,
          protein: 90,
          carbs: 220,
          fats: 65,
          fiber: 30,
          salt: 5,
          sugar: 40
        });
      }
    };

    req.onerror = () => {
      resolve({
        calories: 2000,
        protein: 90,
        carbs: 220,
        fats: 65,
        fiber: 30,
        salt: 5,
        sugar: 40
      });
    };
  });
}

// Full Export / Import
export async function exportAllData() {
  const db = await openDB();
  const foods = await getAllFoods();
  const meals = await new Promise((resolve) => {
    const tx = db.transaction(['meals'], 'readonly');
    const store = tx.objectStore('meals');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });

  const settings = await new Promise((resolve) => {
    const tx = db.transaction(['settings'], 'readonly');
    const store = tx.objectStore('settings');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });

  const daily_targets = await new Promise((resolve) => {
    const tx = db.transaction(['daily_targets'], 'readonly');
    const store = tx.objectStore('daily_targets');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });

  return {
    version: 3,
    exported_at: new Date().toISOString(),
    foods,
    meals,
    settings,
    daily_targets
  };
}

export async function importAllData(data) {
  const db = await openDB();

  if (data.foods && Array.isArray(data.foods)) {
    const tx = db.transaction(['foods'], 'readwrite');
    const store = tx.objectStore('foods');
    store.clear();
    for (const f of data.foods) {
      delete f.id;
      store.add(f);
    }
  }

  if (data.meals && Array.isArray(data.meals)) {
    const tx = db.transaction(['meals'], 'readwrite');
    const store = tx.objectStore('meals');
    store.clear();
    for (const m of data.meals) {
      delete m.id;
      store.add(m);
    }
  }

  if (data.settings && Array.isArray(data.settings)) {
    const tx = db.transaction(['settings'], 'readwrite');
    const store = tx.objectStore('settings');
    for (const s of data.settings) {
      store.put(s);
    }
  }

  if (data.daily_targets && Array.isArray(data.daily_targets)) {
    const tx = db.transaction(['daily_targets'], 'readwrite');
    const store = tx.objectStore('daily_targets');
    store.clear();
    for (const dt of data.daily_targets) {
      delete dt.id;
      store.add(dt);
    }
  }
}

export async function clearAllData() {
  const db = await openDB();
  const tx = db.transaction(['foods', 'meals', 'daily_targets'], 'readwrite');
  tx.objectStore('foods').clear();
  tx.objectStore('meals').clear();
  tx.objectStore('daily_targets').clear();
  await seedDefaultsIfEmpty(db);
}
