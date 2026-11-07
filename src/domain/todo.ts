export type Priority = 0 | 1 | 2 | 3

export interface Todo {
  id: number
  userId: string
  title: string
  done: boolean
  startDate?: string
  dueDate?: string
  priority: Priority
  tags: string[]
}

export interface TodoDraft {
  title: string
  startDate?: string
  dueDate?: string
  priority?: number
  tags?: readonly string[]
}

export type TodoFields = Pick<
  Todo,
  'title' | 'startDate' | 'dueDate' | 'priority' | 'tags'
>
export type TodoErrors = Partial<Record<keyof TodoDraft, string>>

export class TodoValidationError extends Error {
  constructor(public readonly fields: TodoErrors) {
    super(Object.values(fields).join('. '))
    this.name = 'TodoValidationError'
  }
}

export function isPriority(value: unknown): value is Priority {
  return value === 0 || value === 1 || value === 2 || value === 3
}

// Принимает datetime-local из формы и ISO со смещением/UTC из хранилища.
// Календарные части проверяются до Date.parse, который может исправить 30 февраля.
export function normalizeDate(value: string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined
  if (typeof value !== 'string')
    throw new RangeError('Некорректная дата и время')
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/.exec(
      value
    )
  if (!match) throw new RangeError('Некорректная дата и время')
  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    ,
    zone
  ] = match
  const year = Number(yearText),
    month = Number(monthText),
    day = Number(dayText)
  const hour = Number(hourText),
    minute = Number(minuteText),
    second = Number(secondText ?? 0)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > (days[month - 1] ?? 0) ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new RangeError('Некорректная дата и время')
  }
  const date = new Date(value)
  if (!Number.isFinite(date.getTime()))
    throw new RangeError('Некорректная дата и время')
  if (
    !zone &&
    (date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date.getHours() !== hour ||
      date.getMinutes() !== minute)
  ) {
    throw new RangeError('Такого местного времени не существует')
  }
  return date.toISOString()
}

export function validateTodo(input: TodoDraft): TodoFields {
  const errors: TodoErrors = {}
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title) errors.title = 'Введите название задачи'
  else if (title.length > 200)
    errors.title = 'Название должно быть не длиннее 200 символов'
  const priority = input.priority === undefined ? 0 : input.priority
  if (!isPriority(priority))
    errors.priority = 'Выберите целый приоритет от 0 до 3'
  let startDate: string | undefined, dueDate: string | undefined
  try {
    startDate = normalizeDate(input.startDate)
  } catch {
    errors.startDate = 'Введите корректные дату и время начала'
  }
  try {
    dueDate = normalizeDate(input.dueDate)
  } catch {
    errors.dueDate = 'Введите корректные дату и время дедлайна'
  }
  if (
    startDate &&
    dueDate &&
    new Date(dueDate).getTime() < new Date(startDate).getTime()
  ) {
    errors.dueDate = 'Дедлайн не может быть раньше начала'
  }
  const tags = input.tags === undefined ? [] : input.tags
  if (
    !Array.isArray(tags) ||
    !tags.every((tag: unknown) => typeof tag === 'string')
  ) {
    errors.tags = 'Метки должны быть списком строк'
  }
  if (Object.keys(errors).length || !isPriority(priority))
    throw new TodoValidationError(errors)
  return {
    title,
    startDate,
    dueDate,
    priority,
    tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
  }
}
