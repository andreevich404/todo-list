import { beforeEach, describe, expect, it } from 'vitest'
import { createApp, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useTodoStore, todoServiceKey } from '../../src/stores/todo.ts'
import { useUserStore } from '../../src/stores/user.ts'
import { createTodoService } from '../../src/application/todoService.ts'
import { createMemoryTodoRepository } from '../../src/infrastructure/memoryTodoRepository.ts'

const user = (id) => ({
  id,
  email: `${id}@example.com`,
  salt: '00',
  iterations: 1,
  passwordHash: 'hash'
})

describe('Pinia вызывает сценарии и хранит только состояние интерфейса', () => {
  let store, users, service
  beforeEach(() => {
    service = createTodoService(createMemoryTodoRepository())
    const pinia = createPinia()
    createApp({}).provide(todoServiceKey, service).use(pinia)
    setActivePinia(pinia)
    users = useUserStore()
    users.users = [user('u1'), user('u2')]
    users.currentUserId = 'u1'
    store = useTodoStore()
  })
  it('создаёт и редактирует все поля через сервис', () => {
    store.create({ title: ' Купить молоко ' })
    const id = store.tasks[0].id
    expect(store.tasks[0]).toMatchObject({
      userId: 'u1',
      title: 'Купить молоко',
      priority: 0,
      tags: []
    })
    store.update(id, { title: 'Купить хлеб', priority: 2, tags: ['Дом'] })
    store.toggle(id)
    expect(service.load('u1')[0]).toMatchObject({
      title: 'Купить хлеб',
      done: true,
      priority: 2,
      tags: ['Дом']
    })
    store.remove(id)
    expect(service.load('u1')).toEqual([])
    expect(store.tasks).toEqual([])
  })
  it('отклоняет ошибочные данные без изменения UI', () => {
    expect(() => store.create({ title: ' ' })).toThrow()
    expect(store.tasks).toEqual([])
  })
  it('переключает задачи по пользователю и очищает их при выходе', async () => {
    store.create({ title: 'Ивана' })
    users.currentUserId = 'u2'
    await nextTick()
    expect(store.tasks).toEqual([])
    store.create({ title: 'Петра' })
    expect(store.tasks.map((task) => task.title)).toEqual(['Петра'])
    users.currentUserId = 'u1'
    await nextTick()
    expect(store.tasks.map((task) => task.title)).toEqual(['Ивана'])
    expect(() => store.remove(service.load('u2')[0].id)).toThrow(/не найдена/)
    users.logout()
    await nextTick()
    expect(store.tasks).toEqual([])
    expect(() => store.create({ title: 'Гостя' })).toThrow(/войти/)
  })
})
