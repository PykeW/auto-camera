<template>
  <div :class="['value-input-control', { 'with-label': !!label }]">
    <LabeledInputRow v-if="label" :label="label">
      <div class="value-input-container">
        <button 
          v-if="showButtons" 
          class="value-btn minus" 
          :disabled="isMinReached || readonly || disabled"
          @click="decreaseValue"
        >-</button>
        <div class="input-display-container">
          <input 
            :type="type"
            :value="displayValue"
            :readonly="readonly"
            :disabled="disabled"
            @input="updateValue($event.target.value)"
            @blur="validateOnBlur"
          >
          <span v-if="unit" class="unit-display">{{ unit }}</span>
        </div>
        <button 
          v-if="showButtons" 
          class="value-btn plus" 
          :disabled="isMaxReached || readonly || disabled"
          @click="increaseValue"
        >+</button>
      </div>
    </LabeledInputRow>
    <div v-else class="value-input-container">
      <button 
        v-if="showButtons" 
        class="value-btn minus" 
        :disabled="isMinReached || readonly || disabled"
        @click="decreaseValue"
      >-</button>
      <div class="input-display-container">
        <input 
          :type="type"
          :value="displayValue"
          :readonly="readonly"
          :disabled="disabled"
          @input="updateValue($event.target.value)"
          @blur="validateOnBlur"
        >
        <span v-if="unit" class="unit-display">{{ unit }}</span>
      </div>
      <button 
        v-if="showButtons" 
        class="value-btn plus" 
        :disabled="isMaxReached || readonly || disabled"
        @click="increaseValue"
      >+</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import LabeledInputRow from './LabeledInputRow.vue';

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  unit: {
    type: String,
    default: ''
  },
  min: {
    type: Number,
    default: -Infinity
  },
  max: {
    type: Number,
    default: Infinity
  },
  step: {
    type: Number,
    default: 1
  },
  readonly: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  showButtons: {
    type: Boolean,
    default: true
  },
  type: {
    type: String,
    default: 'number'
  },
  precision: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['update:modelValue']);

// 计算属性
const displayValue = computed(() => {
  if (props.precision > 0) {
    return props.modelValue.toFixed(props.precision);
  }
  return String(props.modelValue);
});

const isMinReached = computed(() => props.modelValue <= props.min);
const isMaxReached = computed(() => props.modelValue >= props.max);

// 方法
function updateValue(value) {
  let newValue = props.type === 'number' ? parseFloat(value) : Number(value);
  
  if (isNaN(newValue)) {
    return;
  }
  
  newValue = Math.max(props.min, Math.min(props.max, newValue));
  emit('update:modelValue', newValue);
}

function validateOnBlur(event) {
  let value = event.target.value;
  let newValue = props.type === 'number' ? parseFloat(value) : Number(value);
  
  if (isNaN(newValue)) {
    newValue = props.modelValue;
  } else {
    newValue = Math.max(props.min, Math.min(props.max, newValue));
  }
  
  emit('update:modelValue', newValue);
}

function increaseValue() {
  if (props.readonly || props.disabled || isMaxReached.value) return;
  
  let newValue = props.modelValue + props.step;
  newValue = Math.min(props.max, newValue);
  emit('update:modelValue', newValue);
}

function decreaseValue() {
  if (props.readonly || props.disabled || isMinReached.value) return;
  
  let newValue = props.modelValue - props.step;
  newValue = Math.max(props.min, newValue);
  emit('update:modelValue', newValue);
}
</script>

<style scoped>
.value-input-control {
  display: flex;
  flex-direction: column;
}

.value-input-container {
  display: flex;
  align-items: center;
  height: 32px;
}

.input-display-container {
  position: relative;
  flex: 1;
  height: 100%;
}

.input-display-container input {
  width: 100%;
  height: 100%;
  padding: 0 24px 0 8px;
  background-color: var(--bg-medium);
  color: var(--text-light);
  border: 1px solid var(--border-dark);
  border-radius: 0;
  text-align: right;
}

.unit-display {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-medium);
  font-size: 12px;
  pointer-events: none;
}

.value-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-medium);
  border: 1px solid var(--border-dark);
  color: var(--text-light);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0;
}

.value-btn.minus {
  border-radius: var(--border-radius) 0 0 var(--border-radius);
  border-right: none;
}

.value-btn.plus {
  border-radius: 0 var(--border-radius) var(--border-radius) 0;
  border-left: none;
}

.value-btn:hover:not(:disabled) {
  background-color: var(--bg-light-hover);
}

.value-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 当有标签时的样式 */
.with-label {
  width: 100%;
}
</style> 