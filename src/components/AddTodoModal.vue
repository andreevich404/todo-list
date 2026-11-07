<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { Todo, TodoDraft, TodoErrors } from '../domain/todo'
import { TodoValidationError, validateTodo } from '../domain/todo'
import { priorityLabels, toLocalInput } from '../utils/todoPresentation'

const props = defineProps<{
  open: boolean
  task: Todo | null
  saveError: string
}>()
const emit = defineEmits<{ save: [input: TodoDraft]; close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)
const startInput = ref<HTMLInputElement | null>(null)
const dueInput = ref<HTMLInputElement | null>(null)
const title = ref('')
const startDate = ref('')
const dueDate = ref('')
const priority = ref(0)
const tags = ref('')
const expanded = ref(false)
const errors = ref<TodoErrors>({})

watch(
  () => props.open,
  (open) => {
    if (open) {
      title.value = props.task?.title ?? ''
      startDate.value = toLocalInput(props.task?.startDate)
      dueDate.value = toLocalInput(props.task?.dueDate)
      priority.value = props.task?.priority ?? 0
      tags.value = props.task?.tags.join(', ') ?? ''
      expanded.value = Boolean(
        startDate.value || dueDate.value || priority.value || tags.value
      )
      errors.value = {}
      dialog.value?.showModal()
    } else if (dialog.value?.open) dialog.value.close()
  }
)

async function focusError() {
  if (errors.value.title) {
    titleInput.value?.focus()
    return
  }
  expanded.value = true
  await nextTick()
  const field = Object.keys(errors.value)[0]
  document.getElementById(`task-${field}`)?.focus()
}

async function submit() {
  errors.value = {}
  if (startInput.value?.validity.badInput)
    errors.value.startDate = 'Введите корректные дату и время начала'
  if (dueInput.value?.validity.badInput)
    errors.value.dueDate = 'Введите корректные дату и время дедлайна'
  if (Object.keys(errors.value).length) {
    await focusError()
    return
  }
  const input: TodoDraft = {
    title: title.value,
    startDate: startDate.value,
    dueDate: dueDate.value,
    priority: priority.value,
    tags: tags.value.split(',')
  }
  try {
    emit('save', validateTodo(input))
  } catch (error: unknown) {
    if (!(error instanceof TodoValidationError)) throw error
    errors.value = error.fields
    await focusError()
  }
}

function onDetailsToggle(event: Event) {
  if (event.target instanceof HTMLDetailsElement)
    expanded.value = event.target.open
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) dialog.value?.close()
}
</script>

<template>
  <dialog
    ref="dialog"
    class="modal"
    aria-labelledby="task-dialog-title"
    @click="onBackdropClick"
    @close="emit('close')"
  >
    <form class="modal__form" novalidate @submit.prevent="submit">
      <h2 id="task-dialog-title" class="modal__title">
        {{ task ? 'Редактировать задачу' : 'Новая задача' }}
      </h2>
      <p v-if="saveError" class="field__error" role="alert">{{ saveError }}</p>
      <div class="field">
        <label class="field__label" for="task-title">Название</label>
        <input
          id="task-title"
          ref="titleInput"
          v-model="title"
          class="field__input"
          name="title"
          type="text"
          maxlength="200"
          required
          autofocus
          autocomplete="off"
          placeholder="Например, купить молоко"
          :aria-invalid="Boolean(errors.title)"
          :aria-describedby="errors.title ? 'task-title-error' : undefined"
        />
        <p
          v-if="errors.title"
          id="task-title-error"
          class="field__error"
          role="alert"
        >
          {{ errors.title }}
        </p>
      </div>
      <details class="task-details" :open="expanded" @toggle="onDetailsToggle">
        <summary>Даты, приоритет и метки</summary>
        <div class="task-details__fields">
          <div class="field">
            <label class="field__label" for="task-startDate">Начало</label>
            <input
              id="task-startDate"
              ref="startInput"
              v-model="startDate"
              class="field__input"
              type="datetime-local"
              step="1"
              :aria-invalid="Boolean(errors.startDate)"
              :aria-describedby="
                errors.startDate ? 'task-start-error' : 'task-dates-hint'
              "
            />
            <p
              v-if="errors.startDate"
              id="task-start-error"
              class="field__error"
              role="alert"
            >
              {{ errors.startDate }}
            </p>
          </div>
          <div class="field">
            <label class="field__label" for="task-dueDate">Дедлайн</label>
            <input
              id="task-dueDate"
              ref="dueInput"
              v-model="dueDate"
              class="field__input"
              type="datetime-local"
              step="1"
              :aria-invalid="Boolean(errors.dueDate)"
              :aria-describedby="
                errors.dueDate ? 'task-due-error' : 'task-dates-hint'
              "
            />
            <p
              v-if="errors.dueDate"
              id="task-due-error"
              class="field__error"
              role="alert"
            >
              {{ errors.dueDate }}
            </p>
          </div>
          <p id="task-dates-hint" class="field__hint">
            Обе даты необязательны. Время — местное.
          </p>
          <div class="field">
            <label class="field__label" for="task-priority">Приоритет</label>
            <select
              id="task-priority"
              v-model.number="priority"
              class="field__input"
              :aria-invalid="Boolean(errors.priority)"
              :aria-describedby="
                errors.priority ? 'task-priority-error' : undefined
              "
            >
              <option
                v-for="(label, value) in priorityLabels"
                :key="value"
                :value="Number(value)"
              >
                {{ value }} — {{ label }}
              </option>
            </select>
            <p
              v-if="errors.priority"
              id="task-priority-error"
              class="field__error"
              role="alert"
            >
              {{ errors.priority }}
            </p>
          </div>
          <div class="field">
            <label class="field__label" for="task-tags">Метки</label>
            <input
              id="task-tags"
              v-model="tags"
              class="field__input"
              type="text"
              placeholder="Учёба, Дом"
              aria-describedby="task-tags-hint"
            />
            <p id="task-tags-hint" class="field__hint">
              Несколько меток разделяйте запятыми.
            </p>
          </div>
        </div>
      </details>
      <div class="modal__actions">
        <button
          type="button"
          class="button button--ghost"
          @click="dialog?.close()"
        >
          Отмена
        </button>
        <button type="submit" class="button button--primary">Сохранить</button>
      </div>
    </form>
  </dialog>
</template>
