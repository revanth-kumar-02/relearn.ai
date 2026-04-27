/**
 * Simple IndexedDB wrapper for caching images and other large objects
 */

const DB_NAME = 'relearn_cache_db';
const STORE_NAME = 'images';
const DB_VERSION = 1;

interface CacheItem {
  key: string;
  data: string;
  timestamp: number;
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
        reject(new Error('IndexedDB not available'));
        return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

export const getCachedImage = async (key: string): Promise<string | null> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to read from cache:', err);
    return null;
  }
};

export const cacheImage = async (key: string, data: string): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const item: CacheItem = {
        key,
        data,
        timestamp: Date.now()
      };

      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to write to cache:', err);
  }
};

export const clearOldCache = async (maxItems: number = 100): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      
      // Get all keys sorted by timestamp (oldest first)
      const request = index.getAllKeys();
      
      request.onsuccess = () => {
        const keys = request.result;
        if (keys.length > maxItems) {
          const keysToDelete = keys.slice(0, keys.length - maxItems);
          keysToDelete.forEach(key => store.delete(key));
        }
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to clear old cache:', err);
  }
};
