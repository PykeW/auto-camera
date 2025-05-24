<!-- src/components/ControlPanel/CalibrationRatioCalculator.vue -->
<template>
  <div>
    <hr class="separator">

    <!-- 当量计算 -->
    <h4>当量计算</h4>
    <div class="control-item side-by-side">
      <label for="calib-square-size">方格尺寸(mm):</label>
      <input type="number" id="calib-square-size" v-model="squareSize" step="0.1" min="0.1">
    </div>
    <div class="control-item side-by-side">
      <label>计算结果:</label>
      <span id="calibration-result-value">{{ calibrationRatioText }}</span>
    </div>
    
    <!-- 当量校准按钮 -->
    <div class="control-item calibration-controls">
      <button 
        id="debug-calib-btn" 
        class="primary-button"
        @click="calibrateRatio"
        :disabled="!isConnected || isFocusing"
      >
        <i class="fas fa-ruler-combined"></i> 当量校准
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCameraStore } from '../../stores/camera';
import { useFocusStore } from '../../stores/focus';
import { useCalibrationStore } from '../../stores/calibration';
import { showMessage } from '../../utils/helpers';

const cameraStore = useCameraStore();
const focusStore = useFocusStore();
const calibrationStore = useCalibrationStore();

const isConnected = computed(() => cameraStore.isConnected);
const isFocusing = computed(() => focusStore.isFocusing);

// 校准相关计算属性
const squareSize = computed({
  get: () => calibrationStore.squareSize,
  set: (value) => calibrationStore.squareSize = parseFloat(value)
});

const calibrationRatioText = computed(() => {
  const result = calibrationStore.calibrationResult;
  if (!result || !result.ratio) return '-- px/mm';
  return `${result.ratio.toFixed(2)} px/mm`;
});

// 执行当量计算
async function calibrateRatio() {
  if (!isConnected.value || isFocusing.value) return;
  
  // 检查方格尺寸
  if (squareSize.value <= 0) {
    showMessage('方格尺寸必须大于0', 'error');
    return;
  }
  
  showMessage('开始执行当量计算...', 'info');
  
  const result = await calibrationStore.calibrateRatio();
  
  if (result) {
    showMessage('当量计算完成', 'success');
  } else {
    showMessage('当量计算失败', 'error');
  }
}
</script>

<style scoped>
.separator {
  width: 100%;
  margin: 10px 0;
  border: none;
  border-top: 1px solid #444;
}

.calibration-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  margin-top: 10px;
  align-items: center;
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

.control-item.side-by-side label {
  min-width: 80px;
  width: 80px;
  white-space: nowrap;
}
</style> 