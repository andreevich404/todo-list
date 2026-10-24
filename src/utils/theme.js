export const THEME_KEY = 'theme';

export function saveTheme(dark, storage = globalThis.localStorage) {
  try {
    storage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  } catch {
    console.error('Storage is not available');
  }
}
