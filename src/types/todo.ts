export interface Todo {
  id: number
  userId: string
  title: string
  done: boolean
}

export interface TodoState {
  tasks: Todo[]
  nextId: number
}
