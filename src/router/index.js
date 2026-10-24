import { createRouter, createWebHashHistory } from 'vue-router';
import LoginPage from '../pages/LoginPage.vue';
import RegisterPage from '../pages/RegisterPage.vue';
import TodoPage from '../pages/TodoPage.vue';
import AboutPage from '../pages/AboutPage.vue';
import { useUserStore } from '../stores/user.js';

export const routes = [
  { path: '/', redirect: { name: 'todo' } },
  { path: '/login', name: 'login', component: LoginPage, meta: { title: 'Вход', guestOnly: true } },
  { path: '/register', name: 'register', component: RegisterPage, meta: { title: 'Регистрация', guestOnly: true } },
  { path: '/todo', name: 'todo', component: TodoPage, meta: { title: 'Задачи', requiresAuth: true } },
  { path: '/about', name: 'about', component: AboutPage, meta: { title: 'О приложении' } },
  { path: '/:pathMatch(.*)*', redirect: { name: 'todo' } },
];

// Hash-режим не требует настройки сервера: GitHub Pages отдаёт только index.html,
// а прямая ссылка вида /#/todo открывается без 404.
export function createAppRouter(history = createWebHashHistory()) {
  const router = createRouter({ history, routes });

  // Guard читает стор в момент навигации, поэтому Pinia к этому времени уже установлена
  router.beforeEach((to) => {
    const user = useUserStore();
    if (to.meta.requiresAuth && !user.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }
    if (to.meta.guestOnly && user.isAuthenticated) {
      return { name: 'todo' };
    }
  });

  router.afterEach((to) => {
    document.title = `${to.meta.title ?? 'To-Do'} — To-Do List`;
  });

  return router;
}

export default createAppRouter();
