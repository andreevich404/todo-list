import type { Todo } from '../types/todo'
import type { User } from '../types/user'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function cleanUsers(value: unknown): User[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const users: User[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const { id, email, salt, iterations, passwordHash } = item
    if (typeof id !== 'string' || !id || typeof email !== 'string' || !email)
      continue
    if (typeof salt !== 'string' || !/^([0-9a-f]{2})+$/.test(salt)) continue
    if (typeof passwordHash !== 'string' || !passwordHash) continue
    if (
      typeof iterations !== 'number' ||
      !Number.isSafeInteger(iterations) ||
      iterations < 1
    )
      continue
    if (seen.has(id) || seen.has(email)) continue
    seen.add(id)
    seen.add(email)
    users.push({ id, email, salt, iterations, passwordHash })
  }
  return users
}

export function cleanTodos(value: unknown): Todo[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<number>()
  const tasks: Todo[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const { id, userId, title, done } = item
    if (
      typeof id !== 'number' ||
      !Number.isSafeInteger(id) ||
      id < 1 ||
      seen.has(id)
    )
      continue
    if (
      typeof userId !== 'string' ||
      !userId ||
      typeof title !== 'string' ||
      !title.trim()
    )
      continue
    seen.add(id)
    tasks.push({ id, userId, title: title.trim(), done: done === true })
  }
  return tasks
}
