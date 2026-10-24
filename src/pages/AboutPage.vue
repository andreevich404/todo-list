<script setup>
import { computed } from 'vue';
import { useTodoStore } from '../stores/todo.js';
import { useUserStore } from '../stores/user.js';

const todos = useTodoStore();
const users = useUserStore();

// Живая статистика прямо из сторов: меняется вместе с данными
const stats = computed(() => [
  { value: users.users.length, label: 'аккаунтов в этом браузере' },
  { value: todos.tasks.length, label: 'задач создано' },
  { value: todos.tasks.filter((t) => t.done).length, label: 'задач выполнено' },
]);

const history = [
  { tag: 'Лаба 4', text: 'Статичная страница на Sass и vanilla JS: нативный <dialog>, две темы, доступность A1–A7.' },
  { tag: 'Лаба 6', text: 'Переезд на Vue 3 и Vite: компоненты, props и emit, публикация на GitHub Pages.' },
  { tag: 'Лаба 7', text: 'Pinia, Vue Router и учебная авторизация: у каждого пользователя свой список.' },
];

const stack = ['Vue 3', 'Vite', 'Pinia', 'Vue Router', 'Sass', 'Vitest'];
</script>

<template>
  <h1 class="page-title">О приложении</h1>

  <section class="card about about__hero" aria-labelledby="about-what">
    <h2 id="about-what" class="about__heading">Что это</h2>
    <p>
      To-Do List, который вырос из одной HTML-страницы в небольшое приложение: задачи, поиск, тёмная тема,
      личные списки и вход. Всё работает в браузере и хранится в <code>localStorage</code>.
    </p>
  </section>

  <section class="about" aria-labelledby="about-stats">
    <h2 id="about-stats" class="about__heading">Статистика</h2>
    <ul class="about__stats">
      <li v-for="item in stats" :key="item.label" class="card about__stat">
        <span class="about__value">{{ item.value }}</span>
        <span class="about__label">{{ item.label }}</span>
      </li>
    </ul>
  </section>

  <section class="about" aria-labelledby="about-history">
    <h2 id="about-history" class="about__heading">История разработки</h2>
    <ol class="about__timeline">
      <li v-for="item in history" :key="item.tag" class="about__step">
        <span class="about__tag">{{ item.tag }}</span>
        <p>{{ item.text }}</p>
      </li>
    </ol>
  </section>

  <section class="about" aria-labelledby="about-stack">
    <h2 id="about-stack" class="about__heading">Из чего сделано</h2>
    <ul class="about__chips">
      <li v-for="item in stack" :key="item" class="about__chip">{{ item }}</li>
    </ul>
  </section>

  <section class="card about about__note" aria-labelledby="about-note">
    <h2 id="about-note" class="about__heading">Честное предупреждение</h2>
    <p>
      Вход здесь — учебный макет. Сервера нет, аккаунты лежат в вашем браузере, а любой, кто откроет DevTools,
      увидит их данные. Настоящая авторизация проверяет пароль на сервере. Поэтому вводите только
      вымышленные адреса и пароли, которые нигде больше не используете.
    </p>
  </section>
</template>
