<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  open: { type: Boolean, required: true },
  // задача для редактирования; null — создание новой
  task: { type: Object, default: null },
});
const emit = defineEmits(['save', 'close']);

const dialog = ref(null);
const titleInput = ref(null);
const title = ref('');
const error = ref('');

// Нативный <dialog> сохраняет ловушку фокуса и Esc, поэтому состояние
// open синхронизируется с ним через showModal()/close(), а не через v-if.
watch(() => props.open, (open) => {
  if (open) {
    title.value = props.task ? props.task.title : '';
    error.value = '';
    dialog.value.showModal();
  } else if (dialog.value.open) {
    dialog.value.close();
  }
});

function submit() {
  const value = title.value.trim();
  if (!value) {
    error.value = 'Введите название задачи';
    titleInput.value.focus();
    return;
  }
  emit('save', value);
  dialog.value.close();
}

function onBackdropClick(event) {
  if (event.target === dialog.value) dialog.value.close();
}
</script>

<template>
  <dialog ref="dialog" class="modal" aria-labelledby="task-dialog-title" @click="onBackdropClick"
    @close="emit('close')">
    <form class="modal__form" novalidate @submit.prevent="submit">
      <h2 id="task-dialog-title" class="modal__title">{{ task ? 'Редактировать задачу' : 'Новая задача' }}</h2>
      <div class="field">
        <label class="field__label" for="task-title">Название</label>
        <input id="task-title" ref="titleInput" v-model="title" class="field__input" name="title" type="text"
          maxlength="200" required autofocus autocomplete="off" placeholder="Например, купить молоко"
          :aria-invalid="error ? 'true' : null" :aria-describedby="error ? 'task-title-error' : null"
          @input="error = ''">
        <p v-if="error" id="task-title-error" class="field__error" role="alert">{{ error }}</p>
      </div>
      <div class="modal__actions">
        <button type="button" class="button button--ghost" @click="dialog.close()">Отмена</button>
        <button type="submit" class="button button--primary">Сохранить</button>
      </div>
    </form>
  </dialog>
</template>
