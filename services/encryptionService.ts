/**
 * ─────────────────────────────────────────────────────────────────
 *  ReLearn.ai — Encryption Service
 * ─────────────────────────────────────────────────────────────────
 * 
 * Provides field-level encryption for sensitive user data (Notes, Journal)
 * using the Web Crypto API (AES-GCM).
 */

const ENCRYPTION_KEY_SALT = 'relearn_salt_v1';

async function getEncryptionKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId + ENCRYPTION_KEY_SALT),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(ENCRYPTION_KEY_SALT),
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptField(text: string, userId: string): Promise<string> {
  if (!text || !userId) return text;
  try {
    const key = await getEncryptionKey(userId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(text);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedText
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error('[EncryptionService] Encryption failed:', err);
    return text;
  }
}

export async function decryptField(encryptedBase64: string, userId: string): Promise<string> {
  if (!encryptedBase64 || !userId || encryptedBase64.length < 20) return encryptedBase64;
  try {
    const key = await getEncryptionKey(userId);
    const combined = new Uint8Array(
      atob(encryptedBase64).split('').map(char => char.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    // If decryption fails, it might be unencrypted raw text
    return encryptedBase64;
  }
}
