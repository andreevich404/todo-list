export interface User {
  id: string
  email: string
  salt: string
  iterations: number
  passwordHash: string
}

export interface UserState {
  users: User[]
  currentUserId: string | null
}

export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm extends LoginForm {
  confirm: string
}

export type RegisterField = keyof RegisterForm
export type RegisterErrors = Partial<Record<RegisterField, string>>
export type RegisterResult =
  { ok: true } | { ok: false; errors: RegisterErrors; formError?: string }
export type LoginResult = { ok: true } | { ok: false; error: string }
