import { defineStore } from 'pinia';
import { hashPassword, safeEqual, toHex } from '../utils/password.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;
const LOGIN_ERROR = 'Неверный email или пароль';

const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();

const PBKDF2_ITERATIONS = 600_000;

function randomHex(bytes = 16) {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

export const useUserStore = defineStore('user', {
  state: () => ({
    // { id, email, salt, iterations, passwordHash }
    users: [],
    currentUserId: null,
  }),

  getters: {
    currentUser: (state) => state.users.find((u) => u.id === state.currentUserId) ?? null,
    isAuthenticated() {
      return this.currentUser !== null;
    },
  },

  actions: {
    async register({ email, password, confirm }) {
      const errors = {};
      const normalized = normalizeEmail(email);

      if (!EMAIL_RE.test(normalized)) errors.email = 'Введите корректный email, например name@example.com';
      else if (this.users.some((u) => u.email === normalized)) errors.email = 'Пользователь с таким email уже существует';

      if (!password || password.length < MIN_PASSWORD) errors.password = `Пароль должен быть не короче ${MIN_PASSWORD} символов`;
      if (password !== confirm) errors.confirm = 'Пароли не совпадают';

      if (Object.keys(errors).length) return { ok: false, errors };

      const salt = randomHex();
      this.users.push({
        id: randomHex(),
        email: normalized,
        salt,
        iterations: PBKDF2_ITERATIONS,
        passwordHash: await hashPassword(password, salt, PBKDF2_ITERATIONS),
      });
      return { ok: true };
    },

    async login({ email, password }) {
      const user = this.users.find((u) => u.email === normalizeEmail(email));
      // одинаковая ошибка для неизвестного email и неверного пароля
      if (!user || !password) return { ok: false, error: LOGIN_ERROR };
      if (!safeEqual(await hashPassword(password, user.salt, user.iterations), user.passwordHash)) return { ok: false, error: LOGIN_ERROR };
      this.currentUserId = user.id;
      return { ok: true };
    },

    logout() {
      this.currentUserId = null;
    },

    sanitize() {
      const seen = new Set();
      const clean = [];
      for (const u of Array.isArray(this.users) ? this.users : []) {
        if (!u || typeof u !== 'object') continue;
        if (![u.id, u.email, u.salt, u.passwordHash].every((v) => typeof v === 'string' && v)) continue;
        if (!Number.isSafeInteger(u.iterations) || u.iterations < 1 || !/^([0-9a-f]{2})+$/.test(u.salt)) continue;
        if (seen.has(u.id) || seen.has(u.email)) continue;
        seen.add(u.id);
        seen.add(u.email);
        clean.push({ id: u.id, email: u.email, salt: u.salt, iterations: u.iterations, passwordHash: u.passwordHash });
      }
      this.users = clean;
      if (!clean.some((u) => u.id === this.currentUserId)) this.currentUserId = null;
    },
  },

  persist: {
    key: 'todo.users',
    pick: ['users', 'currentUserId'],
    afterHydrate: (ctx) => ctx.store.sanitize(),
  },
});
