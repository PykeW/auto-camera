<template>
  <button 
    :class="[
      `size-${size}`, 
      `variant-${variant}`,
      { 'disabled': disabled }
    ]"
    :disabled="disabled"
    :title="tooltip"
    @click="$emit('click', $event)"
  >
    <i :class="iconClass"></i>
  </button>
</template>

<script setup>
const props = defineProps({
  iconClass: {
    type: String,
    required: true
  },
  tooltip: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'outline', 'ghost'].includes(value)
  }
});

const emit = defineEmits(['click']);
</script>

<style scoped>
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: none;
  border-radius: var(--border-radius);
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.2s ease;
}

button:hover:not(:disabled),
button:focus:not(:disabled) {
  background-color: var(--bg-light-hover);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Size variants */
.size-small {
  width: 24px;
  height: 24px;
  font-size: 12px;
}

.size-medium {
  width: 32px;
  height: 32px;
  font-size: 14px;
}

.size-large {
  width: 40px;
  height: 40px;
  font-size: 16px;
}

/* Style variants */
/* variant-default类使用的是button元素上定义的默认样式，无需额外样式定义 */

.variant-outline {
  border: 1px solid var(--border-medium);
}

.variant-ghost {
  opacity: 0.7;
}

.variant-ghost:hover:not(:disabled) {
  opacity: 1;
  background-color: var(--bg-light-hover);
}
</style> 