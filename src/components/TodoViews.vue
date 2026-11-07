<script setup lang="ts">
import { nextTick } from 'vue'
import type { TodoView } from '../domain/todoRules'

const props = defineProps<{ modelValue: TodoView }>()
const emit = defineEmits<{ 'update:modelValue': [view: TodoView] }>()
const views: { id: TodoView; label: string }[] = [
  { id: 'search', label: 'Поиск' },
  { id: 'all', label: 'Все' },
  { id: 'today', label: 'На сегодня' },
  { id: 'upcoming', label: 'Грядущие' },
  { id: 'completed', label: 'Выполненные' }
]

async function onKeydown(event: KeyboardEvent) {
  const index = views.findIndex((view) => view.id === props.modelValue)
  let next: number
  switch (event.key) {
    case 'ArrowRight':
      next = (index + 1) % views.length
      break
    case 'ArrowLeft':
      next = (index + views.length - 1) % views.length
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = views.length - 1
      break
    default:
      return
  }
  event.preventDefault()
  const view = views[next]
  if (!view) return
  emit('update:modelValue', view.id)
  await nextTick()
  document.getElementById(`todo-tab-${view.id}`)?.focus()
}
</script>

<template>
  <div
    class="todo-views"
    role="tablist"
    aria-label="Представления задач"
    @keydown="onKeydown"
  >
    <button
      v-for="view in views"
      :id="`todo-tab-${view.id}`"
      :key="view.id"
      type="button"
      role="tab"
      :aria-selected="modelValue === view.id"
      aria-controls="todo-panel"
      :tabindex="modelValue === view.id ? 0 : -1"
      @click="emit('update:modelValue', view.id)"
    >
      {{ view.label }}
    </button>
  </div>
</template>
