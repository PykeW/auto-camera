<template>
  <div class="roi-control-panel">
    <RoiControlHeader 
      :title="title"
      :purpose="purpose"
      :disabled="disabled"
      @visibility-toggle="handleRoiVisibilityToggle"
      @edit="handleRoiEdit"
      @clear="handleRoiClear"
    />
    
    <!-- 隐藏ROI信息面板 -->
    <!-- <div v-if="showInfo" class="roi-info">
      <div v-if="roiCoords" class="roi-coords">
        <div class="roi-coord-item">
          <span class="roi-coord-label">左:</span>
          <span class="roi-coord-value">{{ Math.round(roiCoords.l) }}</span>
        </div>
        <div class="roi-coord-item">
          <span class="roi-coord-label">上:</span>
          <span class="roi-coord-value">{{ Math.round(roiCoords.t) }}</span>
        </div>
        <div class="roi-coord-item">
          <span class="roi-coord-label">宽:</span>
          <span class="roi-coord-value">{{ Math.round(roiCoords.r - roiCoords.l) }}</span>
        </div>
        <div class="roi-coord-item">
          <span class="roi-coord-label">高:</span>
          <span class="roi-coord-value">{{ Math.round(roiCoords.b - roiCoords.t) }}</span>
        </div>
      </div>
    </div> -->
    
    <slot></slot>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoiStore } from '../../stores/roi';
import { showMessage } from '../../utils/helpers';
import RoiControlHeader from '../common/RoiControlHeader.vue';

const props = defineProps({
  title: {
    type: String,
    default: 'ROI区域'
  },
  purpose: {
    type: String,
    default: 'focus' // 可以是'focus', 'template', 'measurement'等
  },
  disabled: {
    type: Boolean,
    default: false
  },
  showShapeTools: {
    type: Boolean,
    default: true
  },
  showInfo: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['visibility-toggle', 'edit', 'clear', 'shape-change', 'confirm']);

const roiStore = useRoiStore();

const isDrawingROI = computed(() => roiStore.isDrawingROI);
const roiEnabled = computed(() => roiStore.roiEnabled);
const roiCoords = computed(() => roiStore.roiCoords);
const activeShapeTool = computed(() => roiStore.activeShapeTool);

function handleRoiVisibilityToggle(isVisible) {
  emit('visibility-toggle', isVisible);
  showMessage(`ROI区域已${isVisible ? '显示' : '隐藏'}`, 'info');
}

function handleRoiEdit(isDrawing) {
  emit('edit', isDrawing);
  showMessage(`ROI编辑模式${isDrawing ? '已开启' : '已关闭'}`, 'info');
}

function handleRoiClear() {
  emit('clear');
  showMessage('ROI区域已删除', 'info');
}

function switchShapeTool(tool) {
  if (props.disabled || !isDrawingROI.value) return;
  
  roiStore.switchROITool(tool);
  emit('shape-change', tool);
}

function confirmRoi() {
  if (props.disabled || !isDrawingROI.value) return;
  
  roiStore.confirmROI();
  emit('confirm');
  showMessage('ROI已确认', 'success');
}
</script>

<style scoped>
.roi-control-panel {
  margin-bottom: 16px;
}

.shape-tools {
  margin-top: 8px;
  padding: 8px;
  background-color: var(--bg-dark);
  border-radius: 4px;
  border: 1px solid var(--border-dark);
}

.shape-tools-header {
  font-size: 12px;
  margin-bottom: 4px;
  color: var(--text-medium);
}

.shape-buttons {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.shape-button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-medium);
  border: 1px solid var(--border-dark);
  color: var(--text-light);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.shape-button:hover:not(:disabled) {
  background-color: var(--bg-light-hover);
}

.shape-button.active {
  background-color: var(--accent-blue);
  color: white;
}

.confirm-button {
  background-color: var(--accent-green, #4caf50);
  border: none;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
  width: 100%;
  margin-top: 8px;
}

.confirm-button:hover:not(:disabled) {
  background-color: var(--accent-green-hover, #45a049);
}

.confirm-button i {
  font-size: 12px;
}

.roi-info {
  margin-top: 8px;
  padding: 8px;
  background-color: var(--bg-dark);
  border-radius: 4px;
  border: 1px solid var(--border-dark);
}

.roi-coords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.roi-coord-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.roi-coord-label {
  font-size: 12px;
  color: var(--text-medium);
}

.roi-coord-value {
  font-size: 12px;
  color: var(--text-light);
  font-weight: 600;
}
</style> 