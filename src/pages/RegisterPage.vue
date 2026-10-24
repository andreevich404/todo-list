<script setup>
import { reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useUserStore } from '../stores/user.js';

const users = useUserStore();
const router = useRouter();

const form = reactive({ email: '', password: '', confirm: '' });
const errors = ref({});
const formError = ref('');
const submitting = ref(false);

const fields = ['email', 'password', 'confirm'];

async function submit() {
  if (submitting.value) return;
  submitting.value = true;
  formError.value = '';
  let result;
  try {
    result = await users.register({ ...form });
  } catch {
    result = { ok: false, errors: {}, formError: 'Не удалось зарегистрироваться. Попробуйте ещё раз.' };
  } finally {
    submitting.value = false;
  }
  if (result.ok) {
    router.push({ name: 'login', query: { registered: '1' } });
    return;
  }
  errors.value = result.errors;
  formError.value = result.formError ?? '';
  // фокус на первое поле с ошибкой
  const first = fields.find((name) => result.errors[name]);
  if (first) document.getElementById(`register-${first}`)?.focus();
}

function clear(name) {
  if (errors.value[name]) errors.value = { ...errors.value, [name]: undefined };
}
</script>

<template>
  <h1 class="page-title">Регистрация</h1>

  <div class="card auth">
    <p v-if="formError" class="notice notice--error" role="alert">{{ formError }}</p>

    <form class="auth__form" novalidate @submit.prevent="submit">
      <div class="field">
        <label class="field__label" for="register-email">Email</label>
        <input id="register-email" v-model="form.email" class="field__input" type="email" name="email"
          autocomplete="username" required :aria-invalid="errors.email ? 'true' : null"
          :aria-describedby="errors.email ? 'register-email-error' : null" @input="clear('email')">
        <p v-if="errors.email" id="register-email-error" class="field__error" role="alert">{{ errors.email }}</p>
      </div>
      <div class="field">
        <label class="field__label" for="register-password">Пароль</label>
        <input id="register-password" v-model="form.password" class="field__input" type="password" name="password"
          autocomplete="new-password" required :aria-invalid="errors.password ? 'true' : null"
          :aria-describedby="errors.password ? 'register-password-error' : 'register-password-hint'"
          @input="clear('password')">
        <p id="register-password-hint" class="field__hint">Не короче 6 символов</p>
        <p v-if="errors.password" id="register-password-error" class="field__error" role="alert">{{ errors.password }}</p>
      </div>
      <div class="field">
        <label class="field__label" for="register-confirm">Подтверждение пароля</label>
        <input id="register-confirm" v-model="form.confirm" class="field__input" type="password" name="confirm"
          autocomplete="new-password" required :aria-invalid="errors.confirm ? 'true' : null"
          :aria-describedby="errors.confirm ? 'register-confirm-error' : null" @input="clear('confirm')">
        <p v-if="errors.confirm" id="register-confirm-error" class="field__error" role="alert">{{ errors.confirm }}</p>
      </div>
      <button type="submit" class="button button--primary" :disabled="submitting">
        {{ submitting ? 'Создаём аккаунт…' : 'Зарегистрироваться' }}
      </button>
    </form>

    <p class="auth__hint">Уже есть аккаунт? <RouterLink :to="{ name: 'login' }">Войти</RouterLink></p>
    <p class="auth__hint">Авторизация учебная, без сервера. Используйте вымышленные данные и пароль, который нигде больше не применяете.</p>
  </div>
</template>
