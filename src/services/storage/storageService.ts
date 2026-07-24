/**
 * ─────────────────────────────────────────────────────────────────
 *  ReLearn.ai — Storage Service
 * ─────────────────────────────────────────────────────────────────
 * 
 * Handles localStorage persistence, XOR obfuscation, and 
 * data size optimization (Base64 stripping).
 */

const LS_PREFIX = 'relearn_';
const OBF_KEY = 'v2_relearn_prod_k3y_99x_z0';

/**
 * Simple XOR obfuscation for defense-in-depth of local data.
 */
export function obfuscate(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    const xored = bytes.map((byte, i) => 
      byte ^ OBF_KEY.charCodeAt(i % OBF_KEY.length)
    );
    const binString = Array.from(xored, (byte) => String.fromCharCode(byte)).join("");
    return btoa(binString);
  } catch (e) {
    return btoa(unescape(encodeURIComponent(str)));
  }
}

export function deobfuscate(str: string): string {
  try {
    const binString = atob(str);
    const bytes = Uint8Array.from(binString, (char) => char.charCodeAt(0));
    const dexored = bytes.map((byte, i) => 
      byte ^ OBF_KEY.charCodeAt(i % OBF_KEY.length)
    );
    return new TextDecoder().decode(dexored);
  } catch {
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch {
      return str;
    }
  }
}

export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = LS_PREFIX + 'test';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Strips large Base64 images to save storage space.
 */
export function optimizeDataSize(value: any): any {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => optimizeDataSize(item));

  const optimized: any = { ...value };
  let modified = false;

  for (const key in optimized) {
    const val = optimized[key];
    if (typeof val === 'string' && val.length > 5000 && val.startsWith('data:image')) {
      optimized[key] = "[Stored in IndexedDB]";
      modified = true;
    } else if (typeof val === 'object' && val !== null) {
      const nested = optimizeDataSize(val);
      if (nested !== val) {
        optimized[key] = nested;
        modified = true;
      }
    }
  }
  return modified ? optimized : value;
}

export function lsGet<T>(key: string, fallback: T): T {
  if (!isLocalStorageAvailable()) return fallback;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return fallback;
    
    const deobfuscated = deobfuscate(raw);
    try {
      return JSON.parse(deobfuscated);
    } catch {
      return JSON.parse(raw);
    }
  } catch {
    return fallback;
  }
}

export function lsSet(key: string, value: unknown): void {
  if (!isLocalStorageAvailable()) return;

  try {
    const dataToSave = key === 'unsynced_changes' ? value : optimizeDataSize(value);
    const serialized = JSON.stringify(dataToSave);
    const obfuscated = obfuscate(serialized);
    localStorage.setItem(LS_PREFIX + key, obfuscated);
  } catch (err: any) {
    if (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014) {
      handleQuotaExceeded(key, value);
      return;
    }
    console.error('[StorageService] write failed:', err);
  }
}

function handleQuotaExceeded(key: string, value: any): void {
  try {
    const keysToRemove = Object.keys(localStorage).filter(k => 
      k.startsWith(LS_PREFIX + 'activity_') || 
      k.startsWith(LS_PREFIX + 'notifications_')
    );
    keysToRemove.forEach(k => localStorage.removeItem(k));

    if (key === 'unsynced_changes' && Array.isArray(value)) {
      const prunedValue = value.slice(-100);
      lsSet(key, prunedValue);
    } else {
      lsSet(key, optimizeDataSize(value));
    }
  } catch {}
}
