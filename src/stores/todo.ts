import { defineStore } from 'pinia'
import type { Todo, TodoState } from '../types/todo'
import { cleanTodos } from '../utils/validation'

export const useTodoStore = defineStore('todo', {
  state: (): TodoState => ({
    // { id, userId, title, done }
    tasks: [],
    // счётчик не уменьшается, поэтому id не переиспользуются
    nextId: 1
  }),

  getters: {
    // задачи пользователя: невыполненные сверху, выполненные внизу
    forUser:
      (state) =>
      (userId: string | null): Todo[] => {
        const own = state.tasks.filter((t) => t.userId === userId)
        return [...own.filter((t) => !t.done), ...own.filter((t) => t.done)]
      }
  },

  actions: {
    add(userId: string | null, title: string): Todo | null {
      const value = title.trim()
      if (!userId || !value) return null
      const task = { id: this.nextId++, userId, title: value, done: false }
      this.tasks.push(task)
      return task
    },

    // находит задачу только среди задач владельца
    findOwn(id: number, userId: string | null): Todo | null {
      return this.tasks.find((t) => t.id === id && t.userId === userId) ?? null
    },

    rename(id: number, userId: string | null, title: string): boolean {
      const task = this.findOwn(id, userId)
      const value = title.trim()
      if (!task || !value) return false
      task.title = value
      return true
    },

    toggle(id: number, userId: string | null): boolean {
      const task = this.findOwn(id, userId)
      if (!task) return false
      task.done = !task.done
      return true
    },

    remove(id: number, userId: string | null): boolean {
      if (!this.findOwn(id, userId)) return false
      this.tasks = this.tasks.filter((t) => t.id !== id)
      return true
    },

    // Хранилище доступно пользователю и может быть повреждено — чиним после восстановления
    sanitize() {
      const clean = cleanTodos(this.tasks)
      this.tasks = clean
      const maxId = clean.reduce((max, t) => Math.max(max, t.id), 0)
      this.nextId =
        Number.isSafeInteger(this.nextId) && this.nextId > maxId
          ? this.nextId
          : maxId + 1
    }
  },

  persist: {
    key: 'todo.store',
    pick: ['tasks', 'nextId'],
    afterHydrate: (ctx) => ctx.store.sanitize()
  }
})
