import { describe, expect, it } from 'vitest'
import {
  normalizeDate,
  TodoValidationError,
  validateTodo
} from '../../src/domain/todo.ts'
import {
  collectTags,
  selectTodos,
  sortTodos
} from '../../src/domain/todoRules.ts'

const task = (id, fields = {}) => ({
  id,
  userId: 'u1',
  title: `Задача ${id}`,
  done: false,
  priority: 0,
  tags: [],
  ...fields
})
const iso = (day, hour = 0, minute = 0) =>
  new Date(2026, 10, day, hour, minute).toISOString()
const now = new Date(2026, 10, 4, 12) // среда; неделя 2–8 ноября
const ids = (tasks) => tasks.map((task) => task.id)
const select = (tasks, view, extra = {}, date = now) =>
  selectTodos(tasks, { userId: 'u1', view, ...extra }, date)

describe('валидация задачи без Vue и хранилища', () => {
  it('достаточно названия, defaults и нормализация меток', () => {
    expect(validateTodo({ title: '  Купить молоко  ' })).toEqual({
      title: 'Купить молоко',
      priority: 0,
      tags: [],
      startDate: undefined,
      dueDate: undefined
    })
    expect(
      validateTodo({ title: 'a', tags: [' Дом ', '', 'Дом', 'дом'] }).tags
    ).toEqual(['Дом', 'дом'])
  })
  it.each([-1, 4, 1.5, NaN, Infinity, '3', null])(
    'отклоняет приоритет %s',
    (priority) => {
      expect(() => validateTodo({ title: 'a', priority })).toThrow(
        TodoValidationError
      )
    }
  )
  it.each([
    'bad',
    '2026-02-30T12:00',
    '2025-02-29T12:00',
    '2026-13-01T12:00',
    '2026-01-01T24:00',
    '2026-01-01T12:60',
    '2026-01-01T12:00:61Z',
    '2026-01-01',
    null
  ])('отклоняет дату %s', (startDate) => {
    expect(() => validateTodo({ title: 'a', startDate })).toThrow(
      TodoValidationError
    )
  })
  it('принимает високосную дату и нормализует смещение', () => {
    expect(normalizeDate('2024-02-29T12:00:00+07:00')).toBe(
      '2024-02-29T05:00:00.000Z'
    )
  })
  it('обе даты независимы, равенство допустимо, обратный порядок запрещён', () => {
    expect(
      validateTodo({ title: 'a', startDate: iso(4) }).dueDate
    ).toBeUndefined()
    expect(
      validateTodo({ title: 'a', dueDate: iso(4) }).startDate
    ).toBeUndefined()
    expect(
      validateTodo({ title: 'a', startDate: iso(4), dueDate: iso(4) }).dueDate
    ).toBe(iso(4))
    expect(() =>
      validateTodo({ title: 'a', startDate: iso(5), dueDate: iso(4) })
    ).toThrow(/раньше начала/)
  })
  it('отклоняет пустое/длинное название и некорректные метки', () => {
    expect(() => validateTodo({ title: ' ' })).toThrow(/название/)
    expect(() => validateTodo({ title: 'a'.repeat(201) })).toThrow(/200/)
    expect(() => validateTodo({ title: 'a', tags: ['tag', 1] })).toThrow(
      /Метки/
    )
  })
})

describe('правила списка', () => {
  it('done → приоритет → дедлайн → начало → id, отсутствующие даты в конце; не мутирует вход', () => {
    const input = Object.freeze(
      [
        task(1, { priority: 3, done: true }),
        task(2),
        task(3, { dueDate: iso(4), startDate: iso(3) }),
        task(4, { dueDate: iso(4), startDate: iso(2) }),
        task(5, { dueDate: iso(3) }),
        task(6, { priority: 1 }),
        task(7, { dueDate: iso(4) }),
        task(8, { startDate: iso(1) })
      ].map(Object.freeze)
    )
    const original = ids(input)
    expect(ids(sortTodos(input))).toEqual([6, 5, 4, 3, 7, 8, 2, 1])
    expect(ids(input)).toEqual(original)
  })
  it('поиск и метка совместны, выполненные и чужие исключены', () => {
    const tasks = [
      task(1, { title: 'Купить молоко', tags: ['Дом'] }),
      task(2, { title: 'Купить хлеб', tags: ['Работа'] }),
      task(3, { title: 'Купить молоко', tags: ['Дом'], done: true }),
      task(4, { title: 'Купить молоко', tags: ['Дом'], userId: 'other' })
    ]
    expect(
      ids(select(tasks, 'search', { query: ' КУПИТЬ ', tag: 'Дом' }))
    ).toEqual([1])
    expect(ids(select(tasks, 'search', { query: 'купить' }))).toEqual([1, 2])
    expect(ids(select(tasks, 'all'))).toEqual([1, 2, 3])
    expect(ids(select(tasks, 'completed'))).toEqual([3])
    expect(collectTags(tasks.slice(0, 3))).toEqual(['Дом', 'Работа'])
  })
  it('сегодня — только дедлайн, границы местного дня и чекбокс', () => {
    const tasks = [
      task(1, { dueDate: iso(4) }),
      task(2, { dueDate: iso(4, 23, 59) }),
      task(3, { dueDate: iso(5) }),
      task(4, { startDate: iso(4) }),
      task(5, { dueDate: iso(4, 12), done: true }),
      task(6, { startDate: iso(3), dueDate: iso(5) })
    ]
    expect(ids(select(tasks, 'today'))).toEqual([1, 2])
    expect(ids(select(tasks, 'today', { showCompleted: true }))).toEqual([
      1, 2, 5
    ])
  })
  it('неделя — понедельник–воскресенье, включая прошедшие дни; только дедлайн', () => {
    const tasks = [
      task(1, { dueDate: iso(1, 23, 59) }),
      task(2, { dueDate: iso(2) }),
      task(3, { dueDate: iso(8, 23, 59) }),
      task(4, { dueDate: iso(9) }),
      task(5, { startDate: iso(4) }),
      task(6, { dueDate: iso(3), done: true })
    ]
    expect(ids(select(tasks, 'upcoming'))).toEqual([2, 3])
    expect(ids(select(tasks, 'upcoming', { showCompleted: true }))).toEqual([
      2, 3, 6
    ])
    expect(
      ids(select(tasks, 'upcoming', {}, new Date(2026, 10, 8, 20)))
    ).toEqual([2, 3])
  })
  it('неделя корректна на границе года и во время смены DST', () => {
    const dates = [
      '2026-12-27T23:59',
      '2026-12-28T00:00',
      '2027-01-03T23:59',
      '2027-01-04T00:00'
    ]
    const tasks = dates.map((dueDate, i) =>
      task(i + 1, { dueDate: normalizeDate(dueDate) })
    )
    expect(ids(select(tasks, 'upcoming', {}, new Date(2027, 0, 1)))).toEqual([
      2, 3
    ])
    const dstTasks = [
      task(1, { dueDate: normalizeDate('2026-03-08T23:59') }),
      task(2, { dueDate: normalizeDate('2026-03-09T00:00') })
    ]
    expect(
      ids(select(dstTasks, 'upcoming', {}, new Date(2026, 2, 8, 12)))
    ).toEqual([1])
  })
})
