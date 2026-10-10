<script setup>
import { computed } from 'vue';

const props = defineProps({
  task: { type: Object, required: true },
});
defineEmits(['toggle', 'edit', 'delete']);

const prefix = computed(() => `task-${props.task.id}`);
</script>

<template>
  <li class="task" :data-done="task.done">
    <span class="task__check">
      <input :id="`${prefix}-done`" class="task__input" type="checkbox" :checked="task.done"
        @change="$emit('toggle', task.id)">
      <span class="task__box" aria-hidden="true">
        <svg class="task__mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2.2"
            stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    </span>
    <label :id="`${prefix}-title`" class="task__title" :for="`${prefix}-done`">{{ task.title }}</label>
    <div class="task__actions">
      <button :id="`${prefix}-edit`" type="button" class="button button--icon"
        :aria-labelledby="`${prefix}-edit ${prefix}-title`" @click="$emit('edit', task.id)">
        <span class="visually-hidden">Редактировать задачу</span>
        <svg class="button__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z M13.5 6.5l4 4" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <button :id="`${prefix}-delete`" type="button" class="button button--icon button--danger"
        :aria-labelledby="`${prefix}-delete ${prefix}-title`" @click="$emit('delete', task.id)">
        <span class="visually-hidden">Удалить задачу</span>
        <svg class="button__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </li>
</template>
