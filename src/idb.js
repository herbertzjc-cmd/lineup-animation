// Tiny IndexedDB key/value store for images (club logo, manager photos). Large images do not
// fit comfortably in localStorage; everything else keeps using localStorage (see store.js).
const DB_NAME = 'lineup-animation';
const STORE = 'images';
let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => {
        // Let another tab upgrade or delete the database instead of blocking it.
        req.result.onversionchange = () => { req.result.close(); dbPromise = null; };
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

// Never hang the app on a stuck database: give up after a few seconds.
const withTimeout = (promise, ms = 4000) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('IndexedDB timed out')), ms))]);

async function run(mode, fn) {
  const db = await withTimeout(open());
  return withTimeout(new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export const idbGet = (key) => run('readonly', (s) => s.get(key));
export const idbSet = (key, blob) => run('readwrite', (s) => s.put(blob, key));
export const idbDelete = (key) => run('readwrite', (s) => s.delete(key));
export const idbClear = () => run('readwrite', (s) => s.clear());
