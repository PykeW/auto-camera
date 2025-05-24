<template>
  <div class="labeled-input-row">
    <label>{{ label }}</label>
    <slot></slot>
  </div>
</template>

<script setup>
const props = defineProps({
  label: {
    type: String,
    required: true
  }
});
</script>

<style scoped>
.labeled-input-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  width: 100%;
}

label {
  min-width: 80px;
  flex-shrink: 0;
  margin-right: var(--spacing-medium);
  margin-bottom: 0;
  text-align: left;
  white-space: nowrap;
  color: var(--text-light);
}
</style> 