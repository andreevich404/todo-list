import { defineStore } from 'pinia'
import type {
  User,
  UserState,
  LoginForm,
  LoginResult,
  RegisterForm,
  RegisterErrors,
  RegisterResult
} from '../types/user'
import { cleanUsers } from '../utils/validation'
import { hashPassword, safeEqual, toHex } from '../utils/password'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 6
const LOGIN_ERROR = 'Неверный email или пароль'

const normalizeEmail = (email: string) =>
  String(email ?? '')
    .trim()
    .toLowerCase()

const PBKDF2_ITERATIONS = 600_000

function randomHex(bytes = 16) {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)))
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    // { id, email, salt, iterations, passwordHash }
    users: [],
    currentUserId: null
  }),

  getters: {
    currentUser: (state): User | null =>
      state.users.find((u) => u.id === state.currentUserId) ?? null,
    isAuthenticated(): boolean {
      return this.currentUser !== null
    }
  },

  actions: {
    async register({
      email,
      password,
      confirm
    }: RegisterForm): Promise<RegisterResult> {
      const errors: RegisterErrors = {}
      const normalized = normalizeEmail(email)

      if (!EMAIL_RE.test(normalized))
        errors.email = 'Введите корректный email, например name@example.com'
      else if (this.users.some((u) => u.email === normalized))
        errors.email = 'Пользователь с таким email уже существует'

      if (!password || password.length < MIN_PASSWORD)
        errors.password = `Пароль должен быть не короче ${MIN_PASSWORD} символов`
      if (password !== confirm) errors.confirm = 'Пароли не совпадают'

      if (Object.keys(errors).length) return { ok: false, errors }

      const salt = randomHex()
      this.users.push({
        id: randomHex(),
        email: normalized,
        salt,
        iterations: PBKDF2_ITERATIONS,
        passwordHash: await hashPassword(password, salt, PBKDF2_ITERATIONS)
      })
      return { ok: true }
    },

    async login({ email, password }: LoginForm): Promise<LoginResult> {
      const user = this.users.find((u) => u.email === normalizeEmail(email))
      // одинаковая ошибка для неизвестного email и неверного пароля
      if (!user || !password) return { ok: false, error: LOGIN_ERROR }
      if (
        !safeEqual(
          await hashPassword(password, user.salt, user.iterations),
          user.passwordHash
        )
      )
        return { ok: false, error: LOGIN_ERROR }
      this.currentUserId = user.id
      return { ok: true }
    },

    logout() {
      this.currentUserId = null
    },

    sanitize() {
      const clean = cleanUsers(this.users)
      this.users = clean
      if (!clean.some((u) => u.id === this.currentUserId))
        this.currentUserId = null
    }
  },

  persist: {
    key: 'todo.users',
    pick: ['users', 'currentUserId'],
    afterHydrate: (ctx) => ctx.store.sanitize()
  }
})
