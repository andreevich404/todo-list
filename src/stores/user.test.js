import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from './user.js';

const valid = { email: 'ivan@example.com', password: 'secret1', confirm: 'secret1' };

describe('useUserStore', () => {
  let store;
  beforeEach(() => {
    setActivePinia(createPinia());
    store = useUserStore();
  });

  describe('register', () => {
    it('регистрирует пользователя и не входит автоматически', async () => {
      const result = await store.register(valid);
      expect(result.ok).toBe(true);
      expect(store.users).toHaveLength(1);
      expect(store.isAuthenticated).toBe(false);
    });

    it('не хранит пароль открытым текстом', async () => {
      await store.register(valid);
      expect(JSON.stringify(store.users)).not.toContain('secret1');
    });

    it('проверяет формат email', async () => {
      const result = await store.register({ ...valid, email: 'not-an-email' });
      expect(result.ok).toBe(false);
      expect(result.errors.email).toBeTruthy();
    });

    it('проверяет длину пароля', async () => {
      const result = await store.register({ ...valid, password: '123', confirm: '123' });
      expect(result.errors.password).toBeTruthy();
    });

    it('проверяет совпадение паролей', async () => {
      const result = await store.register({ ...valid, confirm: 'other11' });
      expect(result.errors.confirm).toBeTruthy();
    });

    it('запрещает повторный email без учёта регистра и пробелов', async () => {
      await store.register(valid);
      const result = await store.register({ ...valid, email: '  IVAN@Example.com ' });
      expect(result.ok).toBe(false);
      expect(result.errors.email).toBeTruthy();
      expect(store.users).toHaveLength(1);
    });
  });

  describe('login / logout', () => {
    beforeEach(() => store.register(valid));

    it('входит с верными данными', async () => {
      const result = await store.login({ email: 'IVAN@example.com', password: 'secret1' });
      expect(result.ok).toBe(true);
      expect(store.isAuthenticated).toBe(true);
      expect(store.currentUser.email).toBe('ivan@example.com');
    });

    it('даёт одинаковую ошибку для неверного пароля и неизвестного email', async () => {
      const wrongPassword = await store.login({ email: valid.email, password: 'wrong' });
      const unknown = await store.login({ email: 'no@example.com', password: 'secret1' });
      expect(wrongPassword).toEqual({ ok: false, error: unknown.error });
      expect(store.isAuthenticated).toBe(false);
    });

    it('выход сбрасывает вход, но не удаляет аккаунт', async () => {
      await store.login({ email: valid.email, password: 'secret1' });
      store.logout();
      expect(store.isAuthenticated).toBe(false);
      expect(store.users).toHaveLength(1);
    });
  });

  it('sanitize чинит повреждённое состояние', () => {
    store.users = 'oops';
    store.currentUserId = 'missing';
    store.sanitize();
    expect(store.users).toEqual([]);
    expect(store.currentUserId).toBe(null);
  });
});
