<template>
  <div class="select-control">
    <select 
      :value="modelValue" 
      @change="$emit('update:modelValue', $event.target.value)"
      :disabled="disabled"
      class="custom-select"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option 
        v-for="option in options" 
        :key="option.value" 
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean, Object],
    required: true
  },
  options: {
    type: Array,
    required: true,
    validator: (options) => {
      return options.every(option => 
        typeof option === 'object' && 
        'value' in option && 
        'label' in option
      );
    }
  },
  placeholder: {
    type: String,
    default: '请选择'
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);
</script>

<style scoped>
.select-control {
  position: relative;
  width: 100%;
}

.custom-select {
  width: 100%;
  height: 32px;
  padding: 0 24px 0 8px;
  background-color: var(--bg-medium);
  color: var(--text-light);
  border: 1px solid var(--border-dark);
  border-radius: var(--border-radius);
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23b0b0b0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 10px;
  cursor: pointer;
}

.custom-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.custom-select:focus {
  outline: none;
  border-color: var(--accent-blue);
}
</style> 