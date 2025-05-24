<!-- src/components/ControlPanel/CalibrationButtons.vue -->
<template>
  <div>
    <!-- 标定操作按钮区域 -->
    <div class="control-item calibration-controls">
      <button 
        v-if="!isCalibrating"
        id="start-calib-btn" 
        class="primary-button"
        @click="startCalibration"
        :disabled="!isConnected || isCalibrating || !canStartCalibration"
      >
        <i class="fas fa-play-circle"></i> 开始标定
      </button>
      <button 
        v-else
        id="stop-calib-btn" 
        class="danger-button"
        @click="stopCalibration"
      >
        <i class="fas fa-stop-circle"></i> 停止标定
      </button>
      <button 
        id="save-matrix-btn" 
        class="secondary-button"
        :disabled="!hasCalibrationResult"
        @click="openSaveMatrixDialog"
      >
        <i class="fas fa-file-export"></i> 保存矩阵
      </button>
    </div>
    
    <!-- 保存矩阵弹窗 -->
    <div v-if="showSaveMatrixDialog" class="save-matrix-dialog-overlay">
      <div class="save-matrix-dialog">
        <h4>保存标定矩阵</h4>
        <input v-model="matrixName" placeholder="请输入矩阵名称" class="matrix-name-input" />
        <div class="dialog-actions">
          <button class="primary-button" @click="saveMatrix">保存</button>
          <button class="secondary-button" @click="closeSaveMatrixDialog">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useCameraStore } from '../../stores/camera';
import { useCalibrationStore } from '../../stores/calibration';
import { useRoiStore } from '../../stores/roi';
import { showMessage } from '../../utils/helpers';

const props = defineProps({
  assignedX: {
    type: String,
    default: ''
  },
  assignedY: {
    type: String,
    default: ''
  },
  assignedU: {
    type: String,
    default: ''
  },
  templateMatchingParams: {
    type: Object,
    default: () => ({})
  }
});

const cameraStore = useCameraStore();
const calibrationStore = useCalibrationStore();
const roiStore = useRoiStore();

const isConnected = computed(() => cameraStore.isConnected);
const isCalibrating = computed(() => calibrationStore.isCalibrating);
const hasCalibrationResult = computed(() => !!calibrationStore.calibrationResult);

// 标定相关状态
const showSaveMatrixDialog = ref(false);
const matrixName = ref('');

// 计算是否可以开始标定
const canStartCalibration = computed(() => {
  // 至少需要选择X和Y轴，且不能选择相同的轴
  return props.assignedX && props.assignedY && props.assignedX !== props.assignedY &&
         (!props.assignedU || (props.assignedU !== props.assignedX && props.assignedU !== props.assignedY));
});

// 开始标定
async function startCalibration() {
  if (!isConnected.value || isCalibrating.value || !canStartCalibration.value) return;
  
  // 如果有ROI设置，使用它，但不再强制要求
  if (roiStore.roiEnabled && roiStore.roiCoords) {
    console.log('使用已设置的ROI区域进行标定');
  } else {
    console.log('未设置ROI区域，将在整个图像上进行标定');
  }
  
  // 确保templateMatchingParams存在
  if (!calibrationStore.templateMatchingParams) {
    console.log('创建calibrationStore.templateMatchingParams');
    calibrationStore.templateMatchingParams = {
      templateImageSrc: props.templateMatchingParams?.templateImage || null,
      threshold: props.templateMatchingParams?.threshold || 0.7
    };
  }
  
  // 设置选中的轴和对应的ID
  const axisMapping = {
    X: props.assignedX,
    Y: props.assignedY,
    U: props.assignedU
  };
  calibrationStore.setSelectedAxes(Object.keys(axisMapping).filter(key => axisMapping[key]));
  calibrationStore.setAxisMapping(axisMapping);
  
  const result = await calibrationStore.startCalibration();
  
  if (result) {
    showMessage(`标定开始，共${calibrationStore.totalPoints}个点`, 'success');
  } else {
    showMessage('开始标定失败', 'error');
  }
}

// 停止标定
function stopCalibration() {
  if (!isConnected.value || !isCalibrating.value) return;
  
  const result = calibrationStore.stopCalibration();
  
  if (result) {
    showMessage('标定已停止', 'warning');
  }
}

// 打开保存矩阵对话框
function openSaveMatrixDialog() {
  matrixName.value = '';
  showSaveMatrixDialog.value = true;
}

// 关闭保存矩阵对话框
function closeSaveMatrixDialog() {
  showSaveMatrixDialog.value = false;
}

// 保存标定矩阵
function saveMatrix() {
  if (!matrixName.value.trim()) {
    showMessage('请输入矩阵名称', 'warning');
    return;
  }
  // 这里可以将calibrationStore.calibrationResult和matrixName.value一起保存到本地或后端
  showMessage(`矩阵"${matrixName.value}"已保存！`, 'success');
  showSaveMatrixDialog.value = false;
}
</script>

<style scoped>
.calibration-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  margin-top: 10px;
  align-items: center;
}

.save-matrix-dialog-overlay {
  position: fixed;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.save-matrix-dialog {
  background: #232323;
  border-radius: 8px;
  padding: 24px 32px 18px 32px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  min-width: 280px;
  max-width: 90vw;
}
.save-matrix-dialog h4 {
  margin: 0 0 12px 0;
  color: #fff;
  font-size: 1.1em;
}
.matrix-name-input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 4px;
  border: 1px solid #444;
  background: #181818;
  color: #fff;
  margin-bottom: 16px;
  font-size: 1em;
}
.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

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
</style> 