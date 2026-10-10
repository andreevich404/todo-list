import { describe, expect, it } from 'vitest';
import { loadTasks, saveTasks, TASKS_KEY } from './storage.js';

const makeStorage = (value) => ({
  getItem: () => value,
  setItem: (_k, v) => { makeStorage.last = v; },
});

describe('loadTasks', () => {
  it('возвращает [] для пустого хранилища', () => {
    expect(loadTasks(makeStorage(null))).toEqual([]);
  });

  it('возвращает [] для невалидного JSON и не-массива', () => {
    expect(loadTasks(makeStorage('{oops'))).toEqual([]);
    expect(loadTasks(makeStorage('{"a":1}'))).toEqual([]);
  });

  it('возвращает [] если хранилище бросает исключение', () => {
    const broken = { getItem() { throw new Error('denied'); } };
    expect(loadTasks(broken)).toEqual([]);
  });

  it('отбрасывает некорректные записи и дубликаты id', () => {
    const raw = JSON.stringify([
      { id: 1, title: ' Купить молоко ', done: true },
      { id: 1, title: 'Дубликат' },
      { id: 0, title: 'Плохой id' },
      { id: 2, title: '   ' },
      { id: 3, title: 42 },
      null,
      { id: 4, title: 'Ок', done: 'yes' },
    ]);
    expect(loadTasks(makeStorage(raw))).toEqual([
      { id: 1, title: 'Купить молоко', done: true },
      { id: 4, title: 'Ок', done: false },
    ]);
  });
});

describe('saveTasks', () => {
  it('пишет JSON в ключ todo.tasks', () => {
    const calls = [];
    saveTasks([{ id: 1, title: 'a', done: false }], { setItem: (k, v) => calls.push([k, v]) });
    expect(calls).toEqual([[TASKS_KEY, '[{"id":1,"title":"a","done":false}]']]);
  });

  it('не падает, если запись запрещена', () => {
    expect(() => saveTasks([], { setItem() { throw new Error('quota'); } })).not.toThrow();
  });
});
