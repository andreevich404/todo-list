<script setup>
import { ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useUserStore } from '../stores/user.js';

const users = useUserStore();
const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const error = ref('');
const submitting = ref(false);
const emailInput = ref(null);

const registered = route.query.registered === '1';

// Переходим только на внутренние адреса приложения, чужой redirect игнорируем
function safeRedirect() {
  const target = route.query.redirect;
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : { name: 'todo' };
}

async function submit() {
  if (submitting.value) return;
  submitting.value = true;
  error.value = '';
  let result;
  try {
    result = await users.login({ email: email.value, password: password.value });
  } catch {
    result = { ok: false, error: 'Не удалось выполнить вход. Попробуйте ещё раз.' };
  } finally {
    submitting.value = false;
  }
  if (result.ok) {
    router.push(safeRedirect());
  } else {
    error.value = result.error;
    emailInput.value.focus();
  }
}
</script>

<template>
  <h1 class="page-title">Вход</h1>

  <div class="card auth">
    <p v-if="registered" class="notice" role="status">Регистрация прошла успешно. Теперь войдите.</p>
    <p v-if="error" id="login-error" class="notice notice--error" role="alert">{{ error }}</p>

    <form class="auth__form" novalidate @submit.prevent="submit">
      <div class="field">
        <label class="field__label" for="login-email">Email</label>
        <input id="login-email" ref="emailInput" v-model="email" class="field__input" type="email" name="email"
          autocomplete="username" required :aria-invalid="error ? 'true' : null"
          :aria-describedby="error ? 'login-error' : null">
      </div>
      <div class="field">
        <label class="field__label" for="login-password">Пароль</label>
        <input id="login-password" v-model="password" class="field__input" type="password" name="password"
          autocomplete="current-password" required :aria-invalid="error ? 'true' : null">
      </div>
      <button type="submit" class="button button--primary" :disabled="submitting">
        {{ submitting ? 'Проверяем…' : 'Войти' }}
      </button>
    </form>

    <p class="auth__hint">Нет аккаунта? <RouterLink :to="{ name: 'register' }">Зарегистрироваться</RouterLink></p>
    <p class="auth__hint">Авторизация учебная, без сервера. Используйте вымышленные данные.</p>
  </div>
</template>
