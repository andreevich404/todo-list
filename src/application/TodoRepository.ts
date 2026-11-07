import type { Todo } from '../domain/todo'

export interface TodoCollection {
  tasks: Todo[]
  nextId: number
}

export interface TodoRepository {
  load(userId: string): TodoCollection
  save(userId: string, collection: TodoCollection): void
}
