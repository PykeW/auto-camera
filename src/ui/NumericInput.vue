<template>
    <div class="numeric-input" :class="{ disabled }">
      <button 
        class="decrement-button"
        :disabled="disabled || readonly || isAtMin"
        @click="decrement"
      >
        <span>-</span>
      </button>
      
      <input
        ref="input"
        type="text"
        :value="displayValue"
        :disabled="disabled"
        :readonly="readonly"
        @input="handleInput"
        @blur="handleBlur"
        @keydown.enter="handleEnter"
      />
      
      <button 
        class="increment-button"
        :disabled="disabled || readonly || isAtMax"
        @click="increment"
      >
        <span>+</span>
      </button>
      
      <span v-if="unit" class="unit-label">{{ unit }}</span>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch } from 'vue'
  
  const props = defineProps({
    modelValue: {
      type: Number,
      required: true
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
    precision: {
      type: Number,
      default: 0
    },
    disabled: {
      type: Boolean,
      default: false
    },
    readonly: {
      type: Boolean,
      default: false
    },
    unit: {
      type: String,
      default: ''
    }
  })
  
  const emit = defineEmits(['update:modelValue', 'change'])
  
  const input = ref(null)
  const displayValue = computed(() => {
    if (props.precision === 0) {
      return props.modelValue.toString()
    } else {
      return props.modelValue.toFixed(props.precision)
    }
  })
  
  const isAtMin = computed(() => {
    return props.modelValue <= props.min
  })
  
  const isAtMax = computed(() => {
    return props.modelValue >= props.max
  })
  
  function increment() {
    if (props.disabled || props.readonly || isAtMax.value) return
    
    const newValue = Math.min(props.max, props.modelValue + props.step)
    updateValue(newValue)
  }
  
  function decrement() {
    if (props.disabled || props.readonly || isAtMin.value) return
    
    const newValue = Math.max(props.min, props.modelValue - props.step)
    updateValue(newValue)
  }
  
  function handleInput(event) {
    const value = event.target.value
    
    // 允许输入数字、一个小数点和负号
    if (/^-?\d*\.?\d*$/.test(value)) {
      // 临时允许空值或者仅有负号或小数点的情况，它们会在 blur 事件中被处理
      if (value === '' || value === '-' || value === '.') {
        event.target.value = value
        return
      }
      
      const numValue = parseFloat(value)
      
      // 确保值在允许的范围内
      if (!isNaN(numValue)) {
        // 仅当输入框值变化且在范围内时更新模型值
        if (numValue >= props.min && numValue <= props.max) {
          updateValue(numValue)
        }
      }
    } else {
      // 如果输入的不是有效数字，回退到上一个有效值
      event.target.value = displayValue.value
    }
  }
  
  function handleBlur(event) {
    let value = event.target.value
    
    // 处理空值或无效值
    if (value === '' || value === '-' || value === '.' || isNaN(parseFloat(value))) {
      value = props.min < 0 ? '0' : props.min.toString()
    }
    
    const numValue = parseFloat(value)
    
    // 确保值在允许的范围内
    const clampedValue = Math.max(props.min, Math.min(props.max, numValue))
    
    updateValue(clampedValue)
    
    // 确保显示的值与模型值匹配
    event.target.value = displayValue.value
  }
  
  function handleEnter(event) {
    handleBlur(event)
    input.value.blur()
  }
  
  function updateValue(newValue) {
    // 应用精度
    if (props.precision > 0) {
      const factor = Math.pow(10, props.precision)
      newValue = Math.round(newValue * factor) / factor
    } else {
      newValue = Math.round(newValue)
    }
    
    // 更新模型值
    if (newValue !== props.modelValue) {
      emit('update:modelValue', newValue)
      emit('change', newValue)
    }
  }
  
  // 监听modelValue变化，更新input显示
  watch(() => props.modelValue, (newValue) => {
    if (input.value && input.value !== document.activeElement) {
      input.value.value = displayValue.value
    }
  })
  </script>
  
  <style scoped>
  .numeric-input {
    display: flex;
    align-items: center;
    height: 32px;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .numeric-input.disabled {
    opacity: 0.7;
    background-color: #f5f5f5;
  }
  
  .decrement-button, .increment-button {
    width: 28px;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    color: #555;
    font-size: 16px;
    transition: background-color 0.2s;
  }
  
  .decrement-button:hover:not(:disabled), .increment-button:hover:not(:disabled) {
    background-color: #f0f0f0;
  }
  
  .decrement-button:disabled, .increment-button:disabled {
    color: #ccc;
    cursor: not-allowed;
  }
  
  input {
    flex: 1;
    height: 100%;
    border: none;
    text-align: center;
    font-family: monospace;
    padding: 0 5px;
    min-width: 50px;
    background: none;
  }
  
  input:disabled {
    background-color: transparent;
    cursor: not-allowed;
  }
  
  input:focus {
    outline: none;
  }
  
  .unit-label {
    padding: 0 8px 0 4px;
    color: #666;
    font-size: 12px;
  }
  </style>