import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

export const toHex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const fromHex = (hex) => Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16));

// Запасной вариант на чистом JS: crypto.subtle доступен только в защищённом контексте
// (https или localhost), а приложение могут открыть, например, по http://192.168.x.x.
// Алгоритм тот же, поэтому хеши совпадают и аккаунты работают в обоих вариантах.
export async function hashPasswordFallback(password, salt, iterations) {
  const bytes = await pbkdf2Async(sha256, new TextEncoder().encode(password), fromHex(salt), {
    c: iterations,
    dkLen: 32,
    asyncTick: 10,
  });
  return toHex(bytes);
}

// PBKDF2-SHA256 с солью и большим числом итераций: подбор пароля по украденному хешу становится дорогим.
// Это учебная мера: без сервера любой, кто видит localStorage, может править данные.
export async function hashPassword(password, salt, iterations) {
  if (!globalThis.crypto?.subtle) return hashPasswordFallback(password, salt, iterations);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(salt), iterations },
    key,
    256,
  );
  return toHex(bits);
}

// сравнение без раннего выхода по первому несовпавшему символу
export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
