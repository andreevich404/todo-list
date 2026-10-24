import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTodoStore } from './todo.js';

describe('useTodoStore', () => {
  let store;
  beforeEach(() => {
    setActivePinia(createPinia());
    store = useTodoStore();
  });

  it('привязывает задачу к пользователю', () => {
    const task = store.add('u1', ' Купить молоко ');
    expect(task).toMatchObject({ userId: 'u1', title: 'Купить молоко', done: false });
  });

  it('не создаёт задачу с пустым названием', () => {
    expect(store.add('u1', '   ')).toBe(null);
    expect(store.tasks).toHaveLength(0);
  });

  it('forUser показывает только задачи владельца, невыполненные сверху', () => {
    const a = store.add('u1', 'a');
    store.add('u1', 'b');
    store.add('u2', 'чужая');
    store.toggle(a.id, 'u1');
    expect(store.forUser('u1').map((t) => t.title)).toEqual(['b', 'a']);
    expect(store.forUser('u2').map((t) => t.title)).toEqual(['чужая']);
  });

  it('не даёт менять и удалять чужие задачи', () => {
    const task = store.add('u1', 'моя');
    expect(store.rename(task.id, 'u2', 'взлом')).toBe(false);
    expect(store.toggle(task.id, 'u2')).toBe(false);
    expect(store.remove(task.id, 'u2')).toBe(false);
    expect(store.tasks[0]).toMatchObject({ title: 'моя', done: false });
  });

  it('редактирует, отмечает и удаляет свои задачи', () => {
    const task = store.add('u1', 'a');
    expect(store.rename(task.id, 'u1', 'b')).toBe(true);
    expect(store.toggle(task.id, 'u1')).toBe(true);
    expect(store.tasks[0]).toMatchObject({ title: 'b', done: true });
    expect(store.remove(task.id, 'u1')).toBe(true);
    expect(store.tasks).toHaveLength(0);
  });

  it('id не переиспользуются после удаления', () => {
    const a = store.add('u1', 'a');
    store.remove(a.id, 'u1');
    expect(store.add('u1', 'b').id).not.toBe(a.id);
  });

  it('sanitize отбрасывает записи без владельца и дубликаты', () => {
    store.tasks = [
      { id: 1, userId: 'u1', title: 'ок', done: true },
      { id: 1, userId: 'u1', title: 'дубль' },
      { id: 2, title: 'без владельца' },
      { id: 3, userId: 'u1', title: '  ' },
      null,
    ];
    store.nextId = 'bad';
    store.sanitize();
    expect(store.tasks).toEqual([{ id: 1, userId: 'u1', title: 'ок', done: true }]);
    expect(store.nextId).toBe(2);
  });
});
