import type { Todo } from '../domain/todo'
import { isPriority, normalizeDate } from '../domain/todo'
import type { TodoCollection } from '../application/TodoRepository'
import { isRecord } from '../utils/validation'

// Совместимый формат todo.store из лабы №9. Новые поля имеют безопасные defaults.
export function readTodoCollection(value: unknown): TodoCollection {
  const source = isRecord(value) ? value : {}
  const tasks: Todo[] = []
  const seen = new Set<number>()
  for (const item of Array.isArray(source.tasks) ? source.tasks : []) {
    if (!isRecord(item)) continue
    const { id, userId, title } = item
    if (
      typeof id !== 'number' ||
      !Number.isSafeInteger(id) ||
      id < 1 ||
      seen.has(id)
    )
      continue
    if (
      typeof userId !== 'string' ||
      !userId ||
      typeof title !== 'string' ||
      !title.trim()
    )
      continue
    let startDate: string | undefined, dueDate: string | undefined
    try {
      if (typeof item.startDate === 'string')
        startDate = normalizeDate(item.startDate)
    } catch {
      /* повреждённая дата не мешает сохранить задачу */
    }
    try {
      if (typeof item.dueDate === 'string')
        dueDate = normalizeDate(item.dueDate)
    } catch {
      /* повреждённая дата не мешает сохранить задачу */
    }
    if (startDate && dueDate && startDate > dueDate) dueDate = undefined
    const tags = Array.isArray(item.tags)
      ? item.tags.filter(
          (tag: unknown): tag is string => typeof tag === 'string'
        )
      : []
    seen.add(id)
    tasks.push({
      id,
      userId,
      title: title.trim(),
      done: item.done === true,
      startDate,
      dueDate,
      priority: isPriority(item.priority) ? item.priority : 0,
      tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
    })
  }
  const maxId = tasks.reduce((max, task) => Math.max(max, task.id), 0)
  const nextId =
    typeof source.nextId === 'number' &&
    Number.isSafeInteger(source.nextId) &&
    source.nextId > maxId
      ? source.nextId
      : maxId + 1
  return { tasks, nextId }
}

export function copyTodo(task: Todo): Todo {
  return { ...task, tags: [...task.tags] }
}

export function mergeUserTasks(
  current: TodoCollection,
  userId: string,
  collection: TodoCollection
): TodoCollection {
  if (collection.tasks.some((task) => task.userId !== userId))
    throw new Error('Нельзя сохранить задачи другого пользователя')
  const foreignIds = new Set(
    current.tasks
      .filter((task) => task.userId !== userId)
      .map((task) => task.id)
  )
  if (collection.tasks.some((task) => foreignIds.has(task.id)))
    throw new Error('Номер задачи уже занят другим пользователем')
  return {
    tasks: [
      ...current.tasks.filter((task) => task.userId !== userId),
      ...collection.tasks
    ].map(copyTodo),
    nextId: Math.max(current.nextId, collection.nextId)
  }
}
