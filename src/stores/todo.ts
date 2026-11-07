import { defineStore } from 'pinia'
import { inject, ref, watch } from 'vue'
import type { InjectionKey } from 'vue'
import type { Todo, TodoDraft } from '../domain/todo'
import type { TodoService } from '../application/todoService'
import { useUserStore } from './user'

export const todoServiceKey: InjectionKey<TodoService> = Symbol('todoService')

function useTodoService(): TodoService {
  const service = inject(todoServiceKey)
  if (!service) throw new Error('Сервис задач не подключён')
  return service
}

export const useTodoStore = defineStore('todo', () => {
  const service = useTodoService()
  const users = useUserStore()
  const tasks = ref<Todo[]>([])
  const error = ref('')

  function currentUserId(): string {
    const id = users.currentUser?.id
    if (!id) throw new Error('Необходимо войти в аккаунт')
    return id
  }

  function reload() {
    error.value = ''
    tasks.value = users.currentUser ? service.load(users.currentUser.id) : []
  }

  watch(
    () => users.currentUser?.id,
    () => {
      tasks.value = []
      try {
        reload()
      } catch {
        error.value =
          'Не удалось загрузить задачи. Проверьте доступ к хранилищу браузера.'
      }
    },
    { immediate: true }
  )

  function create(input: TodoDraft) {
    service.create(currentUserId(), input)
    reload()
  }

  function update(id: number, input: TodoDraft) {
    if (!service.update(currentUserId(), id, input))
      throw new Error('Задача не найдена. Обновите список.')
    reload()
  }

  function toggle(id: number) {
    if (!service.toggle(currentUserId(), id))
      throw new Error('Задача не найдена. Обновите список.')
    reload()
  }

  function remove(id: number) {
    if (!service.remove(currentUserId(), id))
      throw new Error('Задача не найдена. Обновите список.')
    reload()
  }

  return { tasks, error, reload, create, update, toggle, remove }
})
