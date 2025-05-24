<!-- src/components/ControlPanel/MatrixConfig.vue -->
<template>
  <div>
    <ZAxisSelector
      label="矩阵大小"
      selectId="matrix-size"
      :modelValue="matrixSize.toString()"
      @update:modelValue="val => matrixSize = parseInt(val)"
      :axes="matrixSizeOptions"
      :disabled="isCalibrating"
    />
    
    <!-- 创建一个输入控件包装点位偏移 -->
    <div class="z-axis-selector-like">
      <div class="control-item side-by-side">
        <label for="point-offset" style="min-width: 80px;">点位偏移:</label>
        <div class="position-display-container">
          <input 
            type="number" 
            id="point-offset" 
            v-model="pointOffset" 
            step="0.1" 
            min="0.1" 
            :disabled="isCalibrating"
            class="compact-input"
          >
          <span class="unit-display">mm</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCalibrationStore } from '../../stores/calibration';
import ZAxisSelector from './ZAxisSelector.vue';

const props = defineProps({
  isCalibrating: {
    type: Boolean,
    default: false
  }
});

const calibrationStore = useCalibrationStore();

// 矩阵大小选项
const matrixSizeOptions = computed(() => [
  { id: '3', name: '3×3' },
  { id: '5', name: '5×5' },
  { id: '7', name: '7×7' },
  { id: '9', name: '9×9' }
]);

// 矩阵大小双向绑定
const matrixSize = computed({
  get: () => calibrationStore.matrixSize,
  set: (value) => calibrationStore.matrixSize = parseInt(value)
});

// 点位偏移双向绑定
const pointOffset = computed({
  get: () => calibrationStore.pointOffset,
  set: (value) => calibrationStore.pointOffset = parseFloat(value)
});
</script>

<style scoped>
/* 为点位偏移添加ZAxisSelector样式 */
.z-axis-selector-like {
  margin-bottom: 8px;
  margin-top: 8px;
}
.z-axis-selector-like .control-item.side-by-side label {
  min-width: 80px;
  flex-shrink: 0;
  margin-bottom: 0;
  text-align: left;
  white-space: nowrap;
}
.z-axis-selector-like .position-display-container {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
}
.z-axis-selector-like .compact-input {
  margin-left: 0;
  width: 65px;
  height: 28px;
}

/* 侧边并排控件 */
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

.position-display-container {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
}

.unit-display {
  position: absolute;
  right: 8px;
  font-size: 12px;
  color: #bbb;
  cursor: pointer;
  z-index: 1;
}
</style> 