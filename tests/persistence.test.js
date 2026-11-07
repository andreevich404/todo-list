import { beforeEach, describe, expect, it } from 'vitest'
import { createApp, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import persistedstate from 'pinia-plugin-persistedstate'
import { pbkdf2Sync } from 'node:crypto'
import { useUserStore } from '../src/stores/user.ts'
import { useTodoStore } from '../src/stores/todo.ts'

const salt = '00112233445566778899aabbccddeeff'
// Точный формат localStorage лабы №7, до переноса на TypeScript.
const legacyUser = {
  id: 'legacy-user',
  email: 'legacy@example.com',
  salt,
  iterations: 1000,
  passwordHash: pbkdf2Sync(
    'secret1',
    Buffer.from(salt, 'hex'),
    1000,
    32,
    'sha256'
  ).toString('hex')
}

function restore() {
  const pinia = createPinia()
  pinia.use(persistedstate)
  createApp({}).use(pinia)
  setActivePinia(pinia)
  return { users: useUserStore(), todos: useTodoStore() }
}

beforeEach(() => localStorage.clear())

describe('совместимость localStorage лабы №7', () => {
  it('восстанавливает вход, аккаунт и задачи; повторный вход сохраняет изоляцию', async () => {
    localStorage.setItem(
      'todo.users',
      JSON.stringify({ users: [legacyUser], currentUserId: legacyUser.id })
    )
    localStorage.setItem(
      'todo.store',
      JSON.stringify({
        tasks: [
          { id: 4, userId: legacyUser.id, title: 'Старая задача', done: true },
          { id: 5, userId: 'other-user', title: 'Чужая задача', done: false }
        ],
        nextId: 6
      })
    )
    const { users, todos } = restore()
    expect(users.currentUser).toEqual(legacyUser)
    expect(todos.forUser(legacyUser.id)).toEqual([
      { id: 4, userId: legacyUser.id, title: 'Старая задача', done: true }
    ])
    users.logout()
    expect(
      (await users.login({ email: legacyUser.email, password: 'secret1' })).ok
    ).toBe(true)
    const added = todos.add(legacyUser.id, 'Новая задача')
    expect(added.id).toBe(6)
    await nextTick()
    const reloaded = restore()
    expect(reloaded.users.currentUser.id).toBe(legacyUser.id)
    expect(
      reloaded.todos.forUser(legacyUser.id).map((task) => task.title)
    ).toEqual(['Новая задача', 'Старая задача'])
    expect(reloaded.todos.nextId).toBe(7)
  })

  it('отбрасывает повреждённые записи и восстанавливает счётчик', () => {
    localStorage.setItem(
      'todo.users',
      JSON.stringify({
        users: [null, {}, legacyUser, legacyUser],
        currentUserId: 'missing'
      })
    )
    localStorage.setItem(
      'todo.store',
      JSON.stringify({
        tasks: [
          null,
          {},
          { id: 3, userId: legacyUser.id, title: '  Задача  ', done: true },
          { id: 3, userId: legacyUser.id, title: 'Дубль' }
        ],
        nextId: 'broken'
      })
    )
    const { users, todos } = restore()
    expect(users.users).toEqual([legacyUser])
    expect(users.currentUser).toBe(null)
    expect(todos.tasks).toEqual([
      { id: 3, userId: legacyUser.id, title: 'Задача', done: true }
    ])
    expect(todos.nextId).toBe(4)
  })

  it('не падает на невалидном JSON', () => {
    localStorage.setItem('todo.users', '{broken')
    localStorage.setItem('todo.store', '{broken')
    const { users, todos } = restore()
    expect(users.users).toEqual([])
    expect(users.isAuthenticated).toBe(false)
    expect(todos.tasks).toEqual([])
    expect(todos.nextId).toBe(1)
  })
})
