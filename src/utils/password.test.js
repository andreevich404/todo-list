import { describe, expect, it } from 'vitest';
import { hashPassword, hashPasswordFallback } from './password.js';

const salt = '00112233445566778899aabbccddeeff';

describe('hashPassword', () => {
  it('детерминирован и зависит от пароля, соли и числа итераций', async () => {
    const a = await hashPassword('secret1', salt, 1000);
    expect(await hashPassword('secret1', salt, 1000)).toBe(a);
    expect(await hashPassword('secret2', salt, 1000)).not.toBe(a);
    expect(await hashPassword('secret1', 'ff'.repeat(16), 1000)).not.toBe(a);
    expect(await hashPassword('secret1', salt, 1001)).not.toBe(a);
  });

  it('запасной JS-вариант даёт тот же хеш, что и WebCrypto', async () => {
    expect(await hashPasswordFallback('secret1', salt, 1000)).toBe(await hashPassword('secret1', salt, 1000));
  });

  it('работает без crypto.subtle (http-адрес не localhost)', async () => {
    const expected = await hashPassword('secret1', salt, 1000);
    const original = Object.getOwnPropertyDescriptor(globalThis.crypto, 'subtle');
    Object.defineProperty(globalThis.crypto, 'subtle', { value: undefined, configurable: true });
    try {
      expect(await hashPassword('secret1', salt, 1000)).toBe(expected);
    } finally {
      if (original) Object.defineProperty(globalThis.crypto, 'subtle', original);
      else delete globalThis.crypto.subtle;
    }
  });
});
