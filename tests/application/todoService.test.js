import { describe, expect, it, vi } from 'vitest'
import { createTodoService } from '../../src/application/todoService.ts'
import { createMemoryTodoRepository } from '../../src/infrastructure/memoryTodoRepository.ts'
import {
  createLocalStorageTodoRepository,
  TODO_STORAGE_KEY
} from '../../src/infrastructure/localStorageTodoRepository.ts'

function storage() {
  const data = new Map()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value)
  }
}

const adapters = [
  ['память', () => createMemoryTodoRepository()],
  ['localStorage', () => createLocalStorageTodoRepository(storage())]
]

describe.each(adapters)('сценарии и контракт: %s', (_, createRepository) => {
  it('создание, изменение всех полей, выполнение, удаление и изоляция пользователей', () => {
    const repo = createRepository()
    const service = createTodoService(repo)
    const a = service.create('u1', { title: 'Первая' })
    const b = service.create('u2', { title: 'Чужая' })
    const fields = {
      title: 'Обновлена',
      priority: 3,
      tags: ['Учёба', 'Работа'],
      startDate: '2026-11-02T08:00:00Z',
      dueDate: '2026-11-04T12:00:00Z'
    }
    expect(service.update('u1', a.id, fields)).toBe(true)
    expect(service.load('u1')[0]).toMatchObject({
      ...fields,
      startDate: '2026-11-02T08:00:00.000Z',
      dueDate: '2026-11-04T12:00:00.000Z'
    })
    expect(service.toggle('u1', a.id)).toBe(true)
    expect(service.load('u1')[0].done).toBe(true)
    expect(service.update('u2', a.id, { title: 'Взлом' })).toBe(false)
    expect(service.toggle('u2', a.id)).toBe(false)
    expect(service.remove('u2', a.id)).toBe(false)
    expect(service.load('u2')).toEqual([b])
    expect(service.remove('u1', a.id)).toBe(true)
    expect(service.load('u1')).toEqual([])
    expect(service.remove('u1', a.id)).toBe(false)
    expect(service.create('u1', { title: 'Новая' }).id).toBeGreaterThan(b.id)
  })
  it('прямой вызов сценария отклоняет ошибки без изменения сохранённых данных', () => {
    const service = createTodoService(createRepository())
    const task = service.create('u1', { title: 'Не меняется' })
    for (const fields of [
      { title: ' ' },
      { title: 'a', priority: 4 },
      { title: 'a', dueDate: '2026-02-30T12:00' },
      { title: 'a', startDate: '2026-11-05T12:00', dueDate: '2026-11-04T12:00' }
    ]) {
      expect(() => service.create('u1', fields)).toThrow()
      expect(() => service.update('u1', task.id, fields)).toThrow()
    }
    expect(service.load('u1')).toEqual([task])
    expect(() => service.create('', { title: 'a' })).toThrow(/войти/)
  })
  it('защищает хранилище от мутаций полученных списков и массивов меток', () => {
    const repo = createRepository()
    const service = createTodoService(repo)
    const task = service.create('u1', { title: 'a', tags: ['Дом'] })
    task.tags.push('Внешняя')
    const snapshot = repo.load('u1')
    snapshot.tasks[0].title = 'Снаружи'
    snapshot.tasks[0].tags.push('Внешняя')
    expect(service.load('u1')[0]).toMatchObject({ title: 'a', tags: ['Дом'] })
    expect(() => repo.save('u2', snapshot)).toThrow(/другого пользователя/)
  })
})

describe('старые данные и ошибки localStorage', () => {
  it('читает лабу 9 с defaults, сохраняет других владельцев, не возвращает удалённое и не дублирует', () => {
    const disk = storage()
    disk.setItem(
      TODO_STORAGE_KEY,
      JSON.stringify({
        tasks: [
          { id: 1, userId: 'u1', title: 'Старая', done: false },
          { id: 2, userId: 'u2', title: 'Чужая', done: true }
        ],
        nextId: 10
      })
    )
    const service = createTodoService(createLocalStorageTodoRepository(disk))
    expect(service.load('u1')[0]).toMatchObject({
      priority: 0,
      tags: [],
      startDate: undefined,
      dueDate: undefined
    })
    service.remove('u1', 1)
    for (let i = 0; i < 3; i++) {
      const reloaded = createTodoService(createLocalStorageTodoRepository(disk))
      expect(reloaded.load('u1')).toEqual([])
      expect(reloaded.load('u2')).toHaveLength(1)
    }
    expect(service.create('u1', { title: 'Новая' }).id).toBe(10)
  })
  it('повреждённые записи, JSON и новые поля не ломают загрузку', () => {
    const disk = storage()
    disk.setItem(TODO_STORAGE_KEY, '{broken')
    const repo = createLocalStorageTodoRepository(disk)
    expect(repo.load('u1')).toEqual({ tasks: [], nextId: 1 })
    disk.setItem(
      TODO_STORAGE_KEY,
      JSON.stringify({
        tasks: [
          null,
          {},
          {
            id: 3,
            userId: 'u1',
            title: 'a',
            priority: 10,
            startDate: 'bad',
            tags: ['ok', 123, 'ok']
          },
          { id: 3, userId: 'u1', title: 'Дубль' }
        ],
        nextId: 'bad'
      })
    )
    expect(repo.load('u1')).toMatchObject({
      tasks: [{ id: 3, priority: 0, tags: ['ok'], startDate: undefined }],
      nextId: 4
    })
  })
  it('при отказе записи сообщает об ошибке и не выдаёт несохранённый результат', () => {
    const service = createTodoService(
      createLocalStorageTodoRepository({
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceeded')
        }
      })
    )
    expect(() => service.create('u1', { title: 'Не сохранилась' })).toThrow(
      'QuotaExceeded'
    )
    expect(service.load('u1')).toEqual([])
  })
  it('память не пишет в localStorage и исчезает с новым экземпляром', () => {
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    const service = createTodoService(createMemoryTodoRepository())
    service.create('u1', { title: 'Временная' })
    expect(writes).not.toHaveBeenCalled()
    writes.mockRestore()
    expect(createTodoService(createMemoryTodoRepository()).load('u1')).toEqual(
      []
    )
  })
})
