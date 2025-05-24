<template>
  <div class="control-item side-by-side">
    <label :for="`${axisName.toLowerCase()}-axis-speed`">{{ axisName }}轴速度:</label>
    <div class="position-display-container">
      <input 
        type="number" 
        :id="`${axisName.toLowerCase()}-axis-speed`" 
        :value="formattedSpeed"
        @input="$emit('update:speed', $event.target.value)"
        @blur="$emit('validate-speed', $event)"
        :step="stepValue" 
        :min="minValue"
        :disabled="disabled"
      >
      <span class="unit-display">{{ unitDisplay }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  axisName: {
    type: String,
    required: true
  },
  formattedSpeed: {
    type: String,
    required: true
  },
  unitDisplay: {
    type: String,
    required: true
  },
  stepValue: {
    type: [String, Number],
    required: true
  },
  minValue: {
    type: [String, Number],
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

defineEmits(['update:speed', 'validate-speed']);
</script>

<style scoped>
/* 复用现有的样式 */
.control-item.side-by-side {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  margin-bottom: 8px;
  width: 100%;
  flex-wrap: nowrap;
  overflow: visible;
}

.control-item.side-by-side label {
  flex-shrink: 0;
  min-width: 80px;
  width: 80px;
  color: var(--text-medium);
  font-size: .9em;
  margin-bottom: 0;
  white-space: nowrap;
}

.position-display-container {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  height: 32px;
}

.position-display-container input {
  width: 100%;
  height: 32px;
  padding: 0 30px 0 8px;
  text-align: left;
  background-color: var(--bg-medium);
  color: var(--text-light);
  border: 1px solid var(--border-dark);
  border-radius: 0;
  font-size: 13px;
  box-sizing: border-box;
}

.unit-display {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #bbb;
  background-color: rgba(61, 61, 61, .8);
  border-radius: 3px;
  padding: 1px 4px;
  z-index: 1;
  user-select: none;
}

/* 数字输入框样式 */
input[type="number"] {
  -moz-appearance: textfield; /* Firefox */
  appearance: textfield; /* 标准属性 */
}

input[type="number"]::-webkit-inner-spin-button, 
input[type="number"]::-webkit-outer-spin-button { 
  -webkit-appearance: none;
  margin: 0;
}

input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 