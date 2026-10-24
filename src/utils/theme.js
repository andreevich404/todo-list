export const TASKS_KEY = 'todo.tasks';
export const THEME_KEY = 'theme';

// Читает задачи из localStorage; пустое или повреждённое хранилище даёт []
export function loadTasks(storage = globalThis.localStorage) {
  let raw = null;
  try {
    raw = storage.getItem(TASKS_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const seen = new Set();
  const result = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    if (!Number.isSafeInteger(item.id) || item.id < 1 || seen.has(item.id)) continue;
    if (typeof item.title !== 'string') continue;
    const title = item.title.trim();
    if (!title) continue;
    seen.add(item.id);
    result.push({ id: item.id, title, done: item.done === true });
  }
  return result;
}

export function saveTasks(tasks, storage = globalThis.localStorage) {
  try {
    storage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch { /* хранилище недоступно — работаем без сохранения */ }
}

export function saveTheme(dark, storage = globalThis.localStorage) {
  try {
    storage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  } catch { /* см. выше */ }
}
