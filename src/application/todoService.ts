import { validateTodo } from '../domain/todo'
import type { Todo, TodoDraft } from '../domain/todo'
import { sortTodos } from '../domain/todoRules'
import type { TodoRepository } from './TodoRepository'

export function createTodoService(repository: TodoRepository) {
  function load(userId: string) {
    if (!userId.trim()) throw new Error('Необходимо войти в аккаунт')
    return repository.load(userId)
  }

  function change(
    userId: string,
    id: number,
    transform: (task: Todo) => Todo | null
  ): boolean {
    const collection = load(userId)
    const task = collection.tasks.find(
      (item) => item.id === id && item.userId === userId
    )
    if (!task) return false
    const updated = transform(task)
    const tasks = updated
      ? collection.tasks.map((item) => (item.id === id ? updated : item))
      : collection.tasks.filter((item) => item.id !== id)
    repository.save(userId, { ...collection, tasks })
    return true
  }

  return {
    load(userId: string): Todo[] {
      return sortTodos(load(userId).tasks)
    },
    create(userId: string, input: TodoDraft): Todo {
      const fields = validateTodo(input)
      const collection = load(userId)
      if (
        !Number.isSafeInteger(collection.nextId) ||
        collection.nextId >= Number.MAX_SAFE_INTEGER
      ) {
        throw new Error('Закончились доступные номера задач')
      }
      const task: Todo = {
        ...fields,
        id: collection.nextId,
        userId,
        done: false
      }
      repository.save(userId, {
        tasks: [...collection.tasks, task],
        nextId: collection.nextId + 1
      })
      return task
    },
    update(userId: string, id: number, input: TodoDraft): boolean {
      const fields = validateTodo(input)
      return change(userId, id, (task) => ({ ...task, ...fields }))
    },
    toggle(userId: string, id: number): boolean {
      return change(userId, id, (task) => ({ ...task, done: !task.done }))
    },
    remove(userId: string, id: number): boolean {
      return change(userId, id, () => null)
    }
  }
}

export type TodoService = ReturnType<typeof createTodoService>
