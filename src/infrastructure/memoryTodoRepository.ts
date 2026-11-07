import type {
  TodoCollection,
  TodoRepository
} from '../application/TodoRepository'
import { copyTodo, mergeUserTasks } from './todoStorage'

export function createMemoryTodoRepository(): TodoRepository {
  let state: TodoCollection = { tasks: [], nextId: 1 }
  return {
    load(userId) {
      return {
        tasks: state.tasks
          .filter((task) => task.userId === userId)
          .map(copyTodo),
        nextId: state.nextId
      }
    },
    save(userId, collection) {
      state = mergeUserTasks(state, userId, collection)
    }
  }
}
