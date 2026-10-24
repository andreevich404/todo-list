<script setup>
import { nextTick, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import ThemeToggle from './components/ThemeToggle.vue';
import { useUserStore } from './stores/user.js';
import { saveTheme } from './utils/theme.js';

const users = useUserStore();
const route = useRoute();
const router = useRouter();

const dark = ref(document.documentElement.getAttribute('data-theme') === 'dark');
const main = ref(null);

// Побочный эффект: смена темы применяется к <html> и запоминается
watch(dark, (value) => {
  if (value) document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  saveTheme(value);
});

// При переходе между страницами переводим фокус на содержимое: клавиатурный пользователь
// и скринридер не остаются на ссылке меню предыдущей страницы
watch(() => route.name, async (_, previous) => {
  if (!previous) return;
  await nextTick();
  main.value?.focus();
});

function logout() {
  users.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <a class="skip-link" href="#main" @click.prevent="main.focus()">К содержимому</a>

  <header class="header">
    <div class="container header__inner">
      <RouterLink class="header__brand" :to="{ name: 'todo' }">To-Do</RouterLink>

      <nav class="nav" aria-label="Основная навигация">
        <ul class="nav__list">
          <li v-if="users.isAuthenticated"><RouterLink class="nav__link" :to="{ name: 'todo' }">Задачи</RouterLink></li>
          <li><RouterLink class="nav__link" :to="{ name: 'about' }">О приложении</RouterLink></li>
          <template v-if="!users.isAuthenticated">
            <li><RouterLink class="nav__link" :to="{ name: 'login' }">Вход</RouterLink></li>
            <li><RouterLink class="nav__link" :to="{ name: 'register' }">Регистрация</RouterLink></li>
          </template>
        </ul>
      </nav>

      <div class="header__actions">
        <template v-if="users.isAuthenticated">
          <span class="header__user" :title="users.currentUser.email">{{ users.currentUser.email }}</span>
          <button type="button" class="button button--ghost button--compact" @click="logout">Выйти</button>
        </template>
        <ThemeToggle :dark="dark" @toggle="dark = !dark" />
      </div>
    </div>
  </header>

  <main id="main" ref="main" class="main" tabindex="-1">
    <div class="container">
      <RouterView />
    </div>
  </main>
</template>
