<script setup>
defineProps({ modelValue: { type: String, default: '' } });
defineEmits(['update:modelValue']);
</script>

<template>
  <div class="search toolbar__search">
    <label for="search" class="visually-hidden">Поиск задач</label>
    <svg class="search__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M20 20l-3.5-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
    <input id="search" class="search__input" type="search" placeholder="Найти задачу..." autocomplete="off"
      :value="modelValue" @input="$emit('update:modelValue', $event.target.value)">
  </div>
</template>
