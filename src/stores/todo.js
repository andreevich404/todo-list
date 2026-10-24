import { defineStore } from 'pinia';

export const useTodoStore = defineStore('todo', {
  state: () => ({
    // { id, userId, title, done }
    tasks: [],
    // счётчик не уменьшается, поэтому id не переиспользуются
    nextId: 1,
  }),

  getters: {
    // задачи пользователя: невыполненные сверху, выполненные внизу
    forUser: (state) => (userId) => {
      const own = state.tasks.filter((t) => t.userId === userId);
      return [...own.filter((t) => !t.done), ...own.filter((t) => t.done)];
    },
  },

  actions: {
    add(userId, title) {
      const value = title.trim();
      if (!userId || !value) return null;
      const task = { id: this.nextId++, userId, title: value, done: false };
      this.tasks.push(task);
      return task;
    },

    // находит задачу только среди задач владельца
    findOwn(id, userId) {
      return this.tasks.find((t) => t.id === id && t.userId === userId) ?? null;
    },

    rename(id, userId, title) {
      const task = this.findOwn(id, userId);
      const value = title.trim();
      if (!task || !value) return false;
      task.title = value;
      return true;
    },

    toggle(id, userId) {
      const task = this.findOwn(id, userId);
      if (!task) return false;
      task.done = !task.done;
      return true;
    },

    remove(id, userId) {
      if (!this.findOwn(id, userId)) return false;
      this.tasks = this.tasks.filter((t) => t.id !== id);
      return true;
    },

    // Хранилище доступно пользователю и может быть повреждено — чиним после восстановления
    sanitize() {
      const seen = new Set();
      const clean = [];
      for (const item of Array.isArray(this.tasks) ? this.tasks : []) {
        if (!item || typeof item !== 'object') continue;
        if (!Number.isSafeInteger(item.id) || item.id < 1 || seen.has(item.id)) continue;
        if (typeof item.userId !== 'string' || !item.userId) continue;
        if (typeof item.title !== 'string' || !item.title.trim()) continue;
        seen.add(item.id);
        clean.push({ id: item.id, userId: item.userId, title: item.title.trim(), done: item.done === true });
      }
      this.tasks = clean;
      const maxId = clean.reduce((max, t) => Math.max(max, t.id), 0);
      this.nextId = Number.isSafeInteger(this.nextId) && this.nextId > maxId ? this.nextId : maxId + 1;
    },
  },

  persist: {
    key: 'todo.store',
    pick: ['tasks', 'nextId'],
    afterHydrate: (ctx) => ctx.store.sanitize(),
  },
});
