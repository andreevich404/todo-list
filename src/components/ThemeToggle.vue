<script setup>
defineProps({ dark: { type: Boolean, required: true } });
defineEmits(['toggle']);
</script>

<template>
  <button type="button" class="theme-toggle" :aria-pressed="dark" title="Тёмная тема" @click="$emit('toggle')">
    <svg class="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </svg>
    <span class="visually-hidden">Тёмная тема</span>
  </button>
</template>
