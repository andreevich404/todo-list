<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import ThemeToggle from './components/ThemeToggle.vue';
import SearchBar from './components/SearchBar.vue';
import TodoList from './components/TodoList.vue';
import AddTodoModal from './components/AddTodoModal.vue';
import { loadTasks, saveTasks, saveTheme } from './utils/storage.js';

const SEARCH_ANNOUNCE_DELAY = 700;

const tasks = ref(loadTasks());
let nextId = tasks.value.reduce((max, t) => Math.max(max, t.id), 0) + 1;

const query = ref('');
const dark = ref(document.documentElement.getAttribute('data-theme') === 'dark');
const modalOpen = ref(false);
const editingId = ref(null);
const liveMessage = ref('');
const addButton = ref(null);

// невыполненные сверху, выполненные внизу
const orderedTasks = computed(() => [
  ...tasks.value.filter((t) => !t.done),
  ...tasks.value.filter((t) => t.done),
]);

const visibleTasks = computed(() => {
  const q = query.value.trim().toLowerCase();
  return q ? orderedTasks.value.filter((t) => t.title.toLowerCase().includes(q)) : orderedTasks.value;
});

const editingTask = computed(() => tasks.value.find((t) => t.id === editingId.value) ?? null);

// Побочный эффект: любое изменение списка (в том числе вложенных полей) сохраняется в localStorage
watch(tasks, (value) => saveTasks(value), { deep: true });

// Побочный эффект: смена темы применяется к <html> и запоминается
watch(dark, (value) => {
  if (value) document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  saveTheme(value);
});

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
    editingTask.value.title = title;
    announce('Задача изменена');
  } else {
    tasks.value.push({ id: nextId++, title, done: false });
    announce('Задача добавлена');
  }
}

// Возвращаем фокус на кнопку-инициатор (в том числе при закрытии по Esc)
async function onModalClose() {
  const id = editingId.value;
  modalOpen.value = false;
  editingId.value = null;
  await nextTick();
  if (id === null || !focusById(`task-${id}-edit`)) addButton.value.focus();
}

async function toggleTask(id) {
  const task = tasks.value.find((t) => t.id === id);
  if (!task) return;
  task.done = !task.done;
  await nextTick();
  focusById(`task-${id}-done`);
}

async function deleteTask(id) {
  const list = visibleTasks.value;
  const index = list.findIndex((t) => t.id === id);
  const neighbour = list[index + 1] ?? list[index - 1] ?? null;

  tasks.value = tasks.value.filter((t) => t.id !== id);
  announce('Задача удалена');

  await nextTick();
  if (!neighbour || !focusById(`task-${neighbour.id}-done`)) addButton.value.focus();
}
</script>

<template>
  <header class="header">
    <div class="container header__inner">
      <h1 class="header__title">Задачи</h1>
      <ThemeToggle :dark="dark" @toggle="dark = !dark" />
    </div>
  </header>

  <main class="main">
    <div class="container">
      <div class="toolbar">
        <SearchBar v-model="query" />
        <button ref="addButton" type="button" class="button button--primary toolbar__add" @click="openModal()">
          Добавить задачу
        </button>
      </div>

      <TodoList :tasks="visibleTasks" :total="tasks.length" @toggle="toggleTask" @edit="openModal"
        @delete="deleteTask" />
    </div>
  </main>

  <div class="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{{ liveMessage }}</div>

  <AddTodoModal :open="modalOpen" :task="editingTask" @save="saveTask" @close="onModalClose" />
</template>
