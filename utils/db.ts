/**
 * ─────────────────────────────────────────────────────────────────
 *  IndexedDB Utility for Storage-Heavy Data
 * ─────────────────────────────────────────────────────────────────
 *
 *  localStorage has a 5MB limit. IndexedDB allows gigabytes.
 *  Perfect for caching Base64 images and large AI responses.
 */

const DB_NAME = 'RelearnDB';
const DB_VERSION = 1;
const STORE_NAME = 'image_cache';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getCachedImage = async (key: string): Promise<string | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key.toLowerCase().trim());

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

export const cacheImage = async (key: string, data: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(data, key.toLowerCase().trim());
  } catch (e) {
    console.warn('[IndexedDB] Failed to cache image', e);
  }
};

export const clearOldCache = async (maxItems: number = 100): Promise<void> => {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
            if (countRequest.result > maxItems) {
                // Simplified: clear all if over limit for now, 
                // or open cursor to delete first N. 
                // For a tutor app, regular purging is good.
                store.clear();
            }
        };
    } catch (e) {}
};
