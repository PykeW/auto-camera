<template>
  <div class="simple-input-control">
    <input 
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :readonly="readonly"
      :disabled="disabled"
      @input="$emit('update:modelValue', $event.target.value)"
      @change="$emit('change', $event.target.value)"
    >
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  readonly: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);
</script>

<style scoped>
.simple-input-control {
  width: 100%;
}

input {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  background-color: var(--bg-medium);
  color: var(--text-light);
  border: 1px solid var(--border-dark);
  border-radius: var(--border-radius);
}

input:focus {
  outline: none;
  border-color: var(--accent-blue);
}

input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

input::placeholder {
  color: var(--text-medium);
  opacity: 0.6;
}

input[readonly] {
  background-color: var(--bg-dark);
  cursor: default;
}
</style> 