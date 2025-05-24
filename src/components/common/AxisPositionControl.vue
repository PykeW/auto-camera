<template>
  <div class="control-item side-by-side">
    <label :for="`${axisName.toLowerCase()}-axis-position`">{{ axisName }}轴位置:</label>
    <div class="control-group">
      <div class="axis-position-control">
        <button 
          class="jog-btn minus" 
          :id="`${axisName.toLowerCase()}-jog-minus`" 
          :disabled="!isConnected || isMinLimitReached"
          @click="$emit('jog', -1)"
        >-</button>
        <div class="position-display-container">
          <input 
            type="text" 
            :id="`${axisName.toLowerCase()}-axis-position`" 
            :value="formattedPosition" 
            readonly
          >
          <span 
            class="unit-display" 
            title="点击切换单位"
            @click="$emit('toggle-unit')"
          >{{ unitDisplay }}</span>
        </div>
        <button 
          class="jog-btn plus" 
          :id="`${axisName.toLowerCase()}-jog-plus`" 
          :disabled="!isConnected || isMaxLimitReached"
          @click="$emit('jog', 1)"
        >+</button>
      </div>
      <select 
        :id="`${axisName.toLowerCase()}-step-select`" 
        class="compact-select"
        v-model="stepValueModel"
      >
        <option v-for="option in stepOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  axisName: {
    type: String,
    required: true
  },
  formattedPosition: {
    type: String,
    required: true
  },
  unitDisplay: {
    type: String,
    required: true
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  isMinLimitReached: {
    type: Boolean,
    default: false
  },
  isMaxLimitReached: {
    type: Boolean,
    default: false
  },
  stepValue: {
    type: [String, Number],
    required: true
  },
  stepOptions: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['jog', 'toggle-unit', 'update:stepValue']);

// 使用计算属性创建双向绑定
const stepValueModel = computed({
  get: () => props.stepValue,
  set: (value) => emit('update:stepValue', value)
});
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

.control-group {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 1;
  width: 100%;
  justify-content: space-between;
}

.axis-position-control {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 1;
  height: 32px;
  background: none;
  border: none;
}

.position-display-container {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  height: 32px;
  border-left: none;
  border-right: none;
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
  cursor: pointer;
  z-index: 1;
  user-select: none;
  transition: background 0.2s, color 0.2s;
}

.unit-display:hover {
  color: #fff;
  background-color: #555;
}

.jog-btn {
  width: 32px;
  height: 32px;
  border-radius: 0;
  border: 1px solid var(--border-dark);
  background-color: var(--bg-medium);
  color: var(--accent-blue);
  cursor: pointer;
  font-weight: bold;
  padding: 0;
  line-height: 30px;
  flex-shrink: 0;
  font-size: 16px;
  transition: background 0.15s, color 0.15s;
}

.jog-btn:hover:not(:disabled) {
  background-color: #4a4a4a;
  color: #fff;
}

.jog-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: var(--text-medium);
}

.jog-btn.plus {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  border-left: 1px solid var(--border-dark);
}

.jog-btn.minus {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
  border-right: none;
}

.compact-select {
  border: 1px solid var(--border-medium);
  border-radius: 3px;
  font-size: .9em;
  padding: 4px 8px;
  height: 32px;
  width: 60px;
  min-width: 60px;
  max-width: 60px;
  background-color: var(--bg-medium);
  color: var(--text-light);
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23b0b0b0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-position: right 4px center;
  background-repeat: no-repeat;
  background-size: .65em auto;
  flex-shrink: 0;
  margin-left: auto;
}
</style> 