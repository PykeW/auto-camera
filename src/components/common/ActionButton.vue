<template>
  <button 
    :class="[
      type === 'primary' ? 'primary-button' : 
      type === 'secondary' ? 'secondary-button' : 
      type === 'danger' ? 'danger-button' : 
      'default-button',
      { 'disabled': disabled }
    ]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <i v-if="iconClass" :class="iconClass"></i>
    {{ text }}
  </button>
</template>

<script setup>
const props = defineProps({
  text: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'primary', 'secondary', 'danger'].includes(value)
  },
  iconClass: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click']);
</script>

<style scoped>
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-small) var(--spacing-medium);
  height: 32px;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-dark);
  background-color: transparent;
  color: var(--text-light);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

button:hover:not(:disabled) {
  background-color: #4a4a4a;
  border-color: var(--border-medium);
  box-shadow: 0 2px 4px rgba(0, 0, 0, .2);
  transform: translateY(-1px);
}

.primary-button {
  background-color: var(--accent-blue);
  border-color: var(--accent-blue);
  color: #fff;
}

.primary-button:hover:not(:disabled) {
  background-color: #157acf;
  border-color: #157acf;
}

.secondary-button {
  background-color: #4a90e2;
  border-color: #4a90e2;
  color: #fff;
}

.secondary-button:hover:not(:disabled) {
  background-color: #3a80d2;
  border-color: #3a80d2;
}

.danger-button {
  background-color: var(--accent-red);
  border-color: var(--accent-red);
  color: #fff;
}

.danger-button:hover:not(:disabled) {
  background-color: #d9363e;
  border-color: #d9363e;
}

button:disabled {
  opacity: .7;
  cursor: not-allowed;
  background-color: #4a4a4a;
  border-color: var(--border-dark);
  color: var(--text-medium);
  transform: none;
  box-shadow: none;
}

i {
  margin-right: var(--spacing-small);
}
</style> 