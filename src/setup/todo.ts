import type { App } from 'vue'
import { createTodoService } from '../application/todoService'
import { createLocalStorageTodoRepository } from '../infrastructure/localStorageTodoRepository'
import { todoServiceKey } from '../stores/todo'

export function setupTodos(app: App) {
  // Единственное место выбора адаптера. Для временного хранения здесь можно
  // передать createMemoryTodoRepository(), не меняя store, сценарии или компоненты.
  const repository = createLocalStorageTodoRepository()
  app.provide(todoServiceKey, createTodoService(repository))
}
