import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory } from 'vue-router';
import { createAppRouter } from './index.js';
import { useUserStore } from '../stores/user.js';

describe('router guard', () => {
  let router;
  let user;
  beforeEach(async () => {
    setActivePinia(createPinia());
    user = useUserStore();
    router = createAppRouter(createMemoryHistory());
    await user.register({ email: 'a@example.com', password: 'secret1', confirm: 'secret1' });
  });

  it('гостя с /todo отправляет на вход и запоминает адрес', async () => {
    await router.push('/todo');
    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe('/todo');
  });

  it('пускает вошедшего пользователя на /todo', async () => {
    await user.login({ email: 'a@example.com', password: 'secret1' });
    await router.push('/todo');
    expect(router.currentRoute.value.name).toBe('todo');
  });

  it('вошедшего пользователя не пускает на вход и регистрацию', async () => {
    await user.login({ email: 'a@example.com', password: 'secret1' });
    await router.push('/login');
    expect(router.currentRoute.value.name).toBe('todo');
    await router.push('/register');
    expect(router.currentRoute.value.name).toBe('todo');
  });

  it('страница About открыта для гостя', async () => {
    await router.push('/about');
    expect(router.currentRoute.value.name).toBe('about');
  });

  it('после выхода /todo снова закрыта', async () => {
    await user.login({ email: 'a@example.com', password: 'secret1' });
    user.logout();
    await router.push('/todo');
    expect(router.currentRoute.value.name).toBe('login');
  });
});
