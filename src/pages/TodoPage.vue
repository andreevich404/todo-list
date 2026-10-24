<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import SearchBar from '../components/SearchBar.vue';
import TodoList from '../components/TodoList.vue';
import AddTodoModal from '../components/AddTodoModal.vue';
import { useTodoStore } from '../stores/todo.js';
import { useUserStore } from '../stores/user.js';

const SEARCH_ANNOUNCE_DELAY = 700;

const todos = useTodoStore();
const users = useUserStore();

const query = ref('');
const modalOpen = ref(false);
const editingId = ref(null);
const liveMessage = ref('');
const addButton = ref(null);

// Страница закрыта guard'ом для гостей, но при выходе она ещё миг остаётся на экране
// до перехода на /login, поэтому currentUser может быть null
const userId = computed(() => users.currentUser?.id ?? null);
const ownTasks = computed(() => todos.forUser(userId.value));

const visibleTasks = computed(() => {
  const q = query.value.trim().toLowerCase();
  return q ? ownTasks.value.filter((t) => t.title.toLowerCase().includes(q)) : ownTasks.value;
});

const editingTask = computed(() => ownTasks.value.find((t) => t.id === editingId.value) ?? null);

// Побочный эффект: озвучиваем число найденных задач с задержкой, чтобы не засыпать скринридер
let searchTimer = null;
let lastAnnouncedCount = null;
watch(query, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (!query.value.trim()) {
      lastAnnouncedCount = null;
      return;
    }
    const count = visibleTasks.value.length;
    if (count !== lastAnnouncedCount) {
      lastAnnouncedCount = count;
      announce(`Найдено задач: ${count}`);
    }
  }, SEARCH_ANNOUNCE_DELAY);
});

function announce(message) {
  liveMessage.value = '';
  setTimeout(() => { liveMessage.value = message; }, 50);
}

function focusById(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.focus();
  return true;
}

function openModal(id = null) {
  editingId.value = id;
  modalOpen.value = true;
}

function saveTask(title) {
  if (editingTask.value) {
    todos.rename(editingId.value, userId.value, title);
    announce('Задача изменена');
  } else {
    todos.add(userId.value, title);
    announce('Задача добавлена');
  }
}

// Возвращаем фокус на кнопку-инициатор (в том числе при закрытии по Esc)
async function onModalClose() {
  const id = editingId.value;
  modalOpen.value = false;
  editingId.value = null;
  await nextTick();
  if (id === null || !focusById(`task-${id}-edit`)) addButton.value?.focus();
}

async function toggleTask(id) {
  todos.toggle(id, userId.value);
  await nextTick();
  focusById(`task-${id}-done`);
}

async function deleteTask(id) {
  const list = visibleTasks.value;
  const index = list.findIndex((t) => t.id === id);
  const neighbour = list[index + 1] ?? list[index - 1] ?? null;

  todos.remove(id, userId.value);
  announce('Задача удалена');

  await nextTick();
  if (!neighbour || !focusById(`task-${neighbour.id}-done`)) addButton.value?.focus();
}
</script>

<template>
  <h1 class="page-title">Мои задачи</h1>

  <div class="toolbar">
    <SearchBar v-model="query" />
    <button ref="addButton" type="button" class="button button--primary toolbar__add" @click="openModal()">
      Добавить задачу
    </button>
  </div>

  <TodoList :tasks="visibleTasks" :total="ownTasks.length" @toggle="toggleTask" @edit="openModal"
    @delete="deleteTask" />

  <div class="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{{ liveMessage }}</div>

  <AddTodoModal :open="modalOpen" :task="editingTask" @save="saveTask" @close="onModalClose" />
</template>
