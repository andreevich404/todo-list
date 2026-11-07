<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import SearchBar from '../components/SearchBar.vue'
import TodoViews from '../components/TodoViews.vue'
import TodoList from '../components/TodoList.vue'
import AddTodoModal from '../components/AddTodoModal.vue'
import { useTodoStore } from '../stores/todo'
import { useUserStore } from '../stores/user'
import { collectTags, selectTodos } from '../domain/todoRules'
import type { TodoView } from '../domain/todoRules'
import type { TodoDraft } from '../domain/todo'
import { TodoValidationError } from '../domain/todo'

const todos = useTodoStore()
const users = useUserStore()
const view = ref<TodoView>('all')
const query = ref('')
const tag = ref('')
const showTodayCompleted = ref(false)
const showUpcomingCompleted = ref(false)
const now = ref(new Date())
const modalOpen = ref(false)
const editingId = ref<number | null>(null)
const liveMessage = ref('')
const actionError = ref('')
const saveError = ref('')
const addButton = ref<HTMLButtonElement | null>(null)
const availableTags = computed(() => collectTags(todos.tasks))
const visibleTasks = computed(() =>
  selectTodos(
    todos.tasks,
    {
      userId: users.currentUser?.id ?? '',
      view: view.value,
      query: query.value,
      tag: tag.value,
      showCompleted:
        view.value === 'today'
          ? showTodayCompleted.value
          : showUpcomingCompleted.value
    },
    now.value
  )
)
const editingTask = computed(
  () => todos.tasks.find((task) => task.id === editingId.value) ?? null
)

let searchTimer: ReturnType<typeof setTimeout> | undefined
let announceTimer: ReturnType<typeof setTimeout> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined
function refreshDate() {
  now.value = new Date()
}
onMounted(() => {
  clockTimer = setInterval(refreshDate, 30_000)
  window.addEventListener('focus', refreshDate)
})
onUnmounted(() => {
  clearTimeout(searchTimer)
  clearTimeout(announceTimer)
  clearInterval(clockTimer)
  window.removeEventListener('focus', refreshDate)
})
watch([query, tag], () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(
    () => announce(`Найдено задач: ${visibleTasks.value.length}`),
    700
  )
})
watch(availableTags, (tags) => {
  if (tag.value && !tags.includes(tag.value)) tag.value = ''
})

function announce(message: string) {
  liveMessage.value = ''
  clearTimeout(announceTimer)
  announceTimer = setTimeout(() => {
    liveMessage.value = message
  }, 50)
}
function focusById(id: string) {
  const element = document.getElementById(id)
  if (!element) return false
  element.focus()
  return true
}
function openModal(id: number | null = null) {
  editingId.value = id
  saveError.value = ''
  modalOpen.value = true
}
function saveTask(input: TodoDraft) {
  saveError.value = ''
  try {
    if (editingId.value !== null) todos.update(editingId.value, input)
    else todos.create(input)
    announce(editingId.value !== null ? 'Задача изменена' : 'Задача добавлена')
    void onModalClose()
  } catch (error: unknown) {
    saveError.value =
      error instanceof TodoValidationError
        ? error.message
        : 'Не удалось сохранить задачу. Проверьте доступ к хранилищу и свободное место в браузере.'
  }
}
async function onModalClose() {
  if (!modalOpen.value) return
  const id = editingId.value
  modalOpen.value = false
  editingId.value = null
  await nextTick()
  if (id === null || !focusById(`task-${id}-edit`)) addButton.value?.focus()
}
async function toggleTask(id: number) {
  actionError.value = ''
  const index = visibleTasks.value.findIndex((task) => task.id === id)
  const neighbour =
    visibleTasks.value[index + 1] ?? visibleTasks.value[index - 1]
  try {
    todos.toggle(id)
  } catch {
    actionError.value =
      'Не удалось изменить задачу. Проверьте доступ к хранилищу.'
    return
  }
  announce('Статус задачи изменён')
  await nextTick()
  if (
    !focusById(`task-${id}-done`) &&
    (!neighbour || !focusById(`task-${neighbour.id}-done`))
  )
    addButton.value?.focus()
}
async function deleteTask(id: number) {
  actionError.value = ''
  const index = visibleTasks.value.findIndex((task) => task.id === id)
  const neighbour =
    visibleTasks.value[index + 1] ?? visibleTasks.value[index - 1]
  try {
    todos.remove(id)
  } catch {
    actionError.value =
      'Не удалось удалить задачу. Проверьте доступ к хранилищу.'
    return
  }
  announce('Задача удалена')
  await nextTick()
  if (!neighbour || !focusById(`task-${neighbour.id}-done`))
    addButton.value?.focus()
}
</script>

<template>
  <div class="todo-heading">
    <h1 class="page-title">Мои задачи</h1>
    <button
      ref="addButton"
      type="button"
      class="button button--primary"
      @click="openModal()"
    >
      Добавить задачу
    </button>
  </div>
  <TodoViews v-model="view" />
  <div
    id="todo-panel"
    role="tabpanel"
    :aria-labelledby="`todo-tab-${view}`"
    tabindex="0"
  >
    <div v-if="view === 'search'" class="toolbar todo-filters">
      <SearchBar v-model="query" />
      <div class="field todo-filters__tags">
        <label class="field__label" for="tag-filter">Метка</label>
        <select id="tag-filter" v-model="tag" class="field__input">
          <option value="">Все метки</option>
          <option v-for="label in availableTags" :key="label" :value="label">
            {{ label }}
          </option>
        </select>
      </div>
    </div>
    <label v-if="view === 'today'" class="completed-filter"
      ><input v-model="showTodayCompleted" type="checkbox" /> Показать
      выполненные</label
    >
    <label v-if="view === 'upcoming'" class="completed-filter"
      ><input v-model="showUpcomingCompleted" type="checkbox" /> Показать
      выполненные</label
    >
    <p v-if="view === 'upcoming'" class="view-hint">
      Дедлайны с понедельника по воскресенье текущей недели, включая прошедшие
      дни.
    </p>
    <p
      v-if="todos.error || actionError"
      class="notice notice--error"
      role="alert"
    >
      {{ todos.error || actionError }}
    </p>
    <TodoList
      :tasks="visibleTasks"
      :total="todos.tasks.length"
      @toggle="toggleTask"
      @edit="openModal"
      @delete="deleteTask"
    />
  </div>
  <div
    class="visually-hidden"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    {{ liveMessage }}
  </div>
  <AddTodoModal
    :open="modalOpen"
    :task="editingTask"
    :save-error="saveError"
    @save="saveTask"
    @close="onModalClose"
  />
</template>
