import type {
  TodoCollection,
  TodoRepository
} from '../application/TodoRepository'
import { copyTodo, mergeUserTasks, readTodoCollection } from './todoStorage'

export const TODO_STORAGE_KEY = 'todo.store'

export function createLocalStorageTodoRepository(
  storage?: Pick<Storage, 'getItem' | 'setItem'>
): TodoRepository {
  const getStorage = () => storage ?? globalThis.localStorage
  function read(): TodoCollection {
    const raw = getStorage().getItem(TODO_STORAGE_KEY)
    if (!raw) return { tasks: [], nextId: 1 }
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { tasks: [], nextId: 1 }
    }
    return readTodoCollection(parsed)
  }
  return {
    load(userId) {
      const collection = read()
      return {
        tasks: collection.tasks
          .filter((task) => task.userId === userId)
          .map(copyTodo),
        nextId: collection.nextId
      }
    },
    save(userId, collection) {
      const merged = mergeUserTasks(read(), userId, collection)
      // Ошибки записи передаются UI: не выдаём несохранённую задачу за сохранённую.
      getStorage().setItem(TODO_STORAGE_KEY, JSON.stringify(merged))
    }
  }
}
