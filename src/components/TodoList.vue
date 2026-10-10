<script setup>
import TodoItem from './TodoItem.vue';

defineProps({
  // задачи, уже отфильтрованные и упорядоченные родителем
  tasks: { type: Array, required: true },
  // всего задач без учёта поиска — отличает «пусто» от «ничего не найдено»
  total: { type: Number, required: true },
});
defineEmits(['toggle', 'edit', 'delete']);
</script>

<template>
  <section class="tasks" aria-labelledby="tasks-title">
    <h2 id="tasks-title" class="tasks__title">Мои задачи</h2>
    <div class="tasks__card">
      <ul v-if="tasks.length" class="task-list" aria-labelledby="tasks-title">
        <TodoItem v-for="task in tasks" :key="task.id" :task="task" @toggle="$emit('toggle', $event)"
          @edit="$emit('edit', $event)" @delete="$emit('delete', $event)" />
      </ul>
      <div v-else class="empty-state">
        <template v-if="total === 0">
          <p class="empty-state__title">Задач пока нет</p>
          <p class="empty-state__text">Нажмите «Добавить задачу», чтобы создать первую.</p>
        </template>
        <template v-else>
          <p class="empty-state__title">Ничего не найдено</p>
          <p class="empty-state__text">Попробуйте изменить поисковый запрос.</p>
        </template>
      </div>
    </div>
  </section>
</template>
