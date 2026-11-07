import { beforeEach, describe, expect, it } from 'vitest'
import { createApp, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import persistedstate from 'pinia-plugin-persistedstate'
import { pbkdf2Sync } from 'node:crypto'
import { useUserStore } from '../src/stores/user.ts'
import { useTodoStore, todoServiceKey } from '../src/stores/todo.ts'
import { createTodoService } from '../src/application/todoService.ts'
import { createLocalStorageTodoRepository } from '../src/infrastructure/localStorageTodoRepository.ts'

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
  const repository = createLocalStorageTodoRepository(localStorage)
  createApp({})
    .provide(todoServiceKey, createTodoService(repository))
    .use(pinia)
  setActivePinia(pinia)
  return { users: useUserStore(), todos: useTodoStore(), repository }
}

beforeEach(() => localStorage.clear())

describe('совместимость localStorage лаб №7–9', () => {
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
    expect(todos.tasks).toEqual([
      {
        id: 4,
        userId: legacyUser.id,
        title: 'Старая задача',
        done: true,
        priority: 0,
        tags: [],
        startDate: undefined,
        dueDate: undefined
      }
    ])
    users.logout()
    expect(
      (await users.login({ email: legacyUser.email, password: 'secret1' })).ok
    ).toBe(true)
    todos.create({ title: 'Новая задача' })
    expect(todos.tasks[0].id).toBe(6)
    await nextTick()
    const reloaded = restore()
    expect(reloaded.users.currentUser.id).toBe(legacyUser.id)
    expect(reloaded.todos.tasks.map((task) => task.title)).toEqual([
      'Новая задача',
      'Старая задача'
    ])
    expect(reloaded.repository.load(legacyUser.id).nextId).toBe(7)
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
    expect(todos.tasks).toEqual([])
    const stored = createLocalStorageTodoRepository(localStorage).load(
      legacyUser.id
    )
    expect(stored.tasks).toMatchObject([
      {
        id: 3,
        userId: legacyUser.id,
        title: 'Задача',
        done: true,
        priority: 0,
        tags: []
      }
    ])
    expect(stored.nextId).toBe(4)
  })

  it('не падает на невалидном JSON', () => {
    localStorage.setItem('todo.users', '{broken')
    localStorage.setItem('todo.store', '{broken')
    const { users, todos } = restore()
    expect(users.users).toEqual([])
    expect(users.isAuthenticated).toBe(false)
    expect(todos.tasks).toEqual([])
    expect(
      createLocalStorageTodoRepository(localStorage).load(legacyUser.id).nextId
    ).toBe(1)
  })
})
