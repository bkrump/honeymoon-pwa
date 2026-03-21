import type { EncryptedTripPayload, TripData, V2EncryptedTripPayload } from '../types/trip';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const REMEMBER_SALT = 'honeymoon-remember-v1';

function b64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function bytesToB64(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value));
}

function toBufferSource(value: Uint8Array): BufferSource {
  return Uint8Array.from(value) as BufferSource;
}

async function deriveAesKey(passphrase: string, salt: Uint8Array, iterations: number, extractable = false): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey('raw', textEncoder.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: toBufferSource(salt), iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt']
  );
}

async function deriveRememberKey(passphrase: string, iterations: number, extractable = false): Promise<CryptoKey> {
  return deriveAesKey(passphrase, textEncoder.encode(REMEMBER_SALT), iterations, extractable);
}

async function importAesKey(rawKey: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toBufferSource(rawKey), { name: 'AES-GCM', length: 256 }, false, usages);
}

async function decryptCiphertext(ciphertext: string, iv: string, key: CryptoKey): Promise<TripData> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toBufferSource(b64ToBytes(iv)) },
    key,
    toBufferSource(b64ToBytes(ciphertext))
  );
  return JSON.parse(textDecoder.decode(plaintext)) as TripData;
}

async function unwrapContentKey(payload: V2EncryptedTripPayload, key: CryptoKey, remember = false): Promise<CryptoKey> {
  const encryptedKey = remember ? payload.rememberWrappedKey : payload.wrappedKey;
  const keyIv = remember ? payload.rememberWrappedKeyIv : payload.wrappedKeyIv;
  const rawContentKey = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toBufferSource(b64ToBytes(keyIv)) },
      key,
      toBufferSource(b64ToBytes(encryptedKey))
    )
  );
  return importAesKey(rawContentKey, ['decrypt']);
}

export async function decryptTripWithPassphrase(payload: EncryptedTripPayload, passphrase: string): Promise<{ trip: TripData; rememberKey: string }> {
  const iterations = Number(payload.iterations);
  if ('wrappedKey' in payload && payload.v === 2) {
    const wrappingKey = await deriveAesKey(passphrase, b64ToBytes(payload.salt), iterations, false);
    const contentKey = await unwrapContentKey(payload, wrappingKey, false);
    const trip = await decryptCiphertext(payload.ciphertext, payload.iv, contentKey);
    const rememberExport = new Uint8Array(await crypto.subtle.exportKey('raw', await deriveRememberKey(passphrase, iterations, true)));
    return { trip, rememberKey: bytesToB64(rememberExport) };
  }

  const legacyKey = await deriveAesKey(passphrase, b64ToBytes(payload.salt), iterations, true);
  const trip = await decryptCiphertext(payload.ciphertext, payload.iv, legacyKey);
  const rememberExport = new Uint8Array(await crypto.subtle.exportKey('raw', legacyKey));
  return { trip, rememberKey: bytesToB64(rememberExport) };
}

export async function decryptTripWithRememberedKey(payload: EncryptedTripPayload, rememberKey: string): Promise<TripData> {
  const importedRememberKey = await importAesKey(b64ToBytes(rememberKey), ['decrypt']);

  if ('wrappedKey' in payload && payload.v === 2) {
    const contentKey = await unwrapContentKey(payload, importedRememberKey, true);
    return decryptCiphertext(payload.ciphertext, payload.iv, contentKey);
  }

  return decryptCiphertext(payload.ciphertext, payload.iv, importedRememberKey);
}

export async function loadEncryptedPayload(url: string): Promise<EncryptedTripPayload> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Could not load the encrypted trip data.');
  }
  return response.json() as Promise<EncryptedTripPayload>;
}
