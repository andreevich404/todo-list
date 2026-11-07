import type { Todo } from './todo'

export type TodoView = 'search' | 'all' | 'today' | 'upcoming' | 'completed'
export interface TodoSelection {
  userId: string
  view: TodoView
  query?: string
  tag?: string
  showCompleted?: boolean
}

function compareDate(
  first: string | undefined,
  second: string | undefined
): number {
  const a = first ? new Date(first).getTime() : Infinity
  const b = second ? new Date(second).getTime() : Infinity
  return a === b ? 0 : a < b ? -1 : 1
}

export function sortTodos(tasks: readonly Todo[]): Todo[] {
  return [...tasks].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      b.priority - a.priority ||
      compareDate(a.dueDate, b.dueDate) ||
      compareDate(a.startDate, b.startDate) ||
      a.id - b.id
  )
}

export function selectTodos(
  tasks: readonly Todo[],
  selection: TodoSelection,
  now: Date
): Todo[] {
  if (!Number.isFinite(now.getTime()))
    throw new RangeError('Некорректная текущая дата')
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  const weekStart = new Date(dayStart)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const query = (selection.query ?? '').trim().toLocaleLowerCase()
  return sortTodos(
    tasks.filter((task) => {
      if (task.userId !== selection.userId) return false
      switch (selection.view) {
        case 'all':
          return true
        case 'completed':
          return task.done
        case 'search':
          return (
            !task.done &&
            (!query || task.title.toLocaleLowerCase().includes(query)) &&
            (!selection.tag || task.tags.includes(selection.tag))
          )
        case 'today':
        case 'upcoming': {
          if (!task.dueDate || (task.done && !selection.showCompleted))
            return false
          const due = new Date(task.dueDate).getTime()
          const start = selection.view === 'today' ? dayStart : weekStart
          const end = selection.view === 'today' ? dayEnd : weekEnd
          return due >= start.getTime() && due < end.getTime()
        }
      }
    })
  )
}

export function collectTags(tasks: readonly Todo[]): string[] {
  return [...new Set(tasks.flatMap((task) => task.tags))].sort((a, b) =>
    a.localeCompare(b)
  )
}
