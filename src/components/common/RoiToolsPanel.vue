<!-- src/components/common/RoiToolsPanel.vue -->
<template>
  <div class="roi-tools-panel" v-if="isDrawingROI">
    <!-- 隐藏标题 -->
    <!-- <div class="tools-header">ROI工具</div> -->
    <div class="shape-tools">
      <div class="shape-tools-header">选择形状工具:</div>
      <div class="shape-buttons">
        <button 
          class="shape-button" 
          :class="{ active: activeShapeTool === 'rect' }"
          @click="switchShapeTool('rect')"
          title="矩形"
        >
          <i class="fas fa-square"></i>
        </button>
        <button 
          class="shape-button" 
          :class="{ active: activeShapeTool === 'ellipse' }"
          @click="switchShapeTool('ellipse')"
          title="椭圆"
        >
          <i class="fas fa-circle"></i>
        </button>
        <button 
          class="shape-button" 
          :class="{ active: activeShapeTool === 'polygon' }"
          @click="switchShapeTool('polygon')"
          title="多边形"
        >
          <i class="fas fa-draw-polygon"></i>
        </button>
      </div>
    </div>
    <button 
      class="confirm-button"
      @click="confirmRoi"
      title="确认"
    >
      <i class="fas fa-check"></i> 确认
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoiStore } from '../../stores/roi';

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['shape-change', 'confirm']);

const roiStore = useRoiStore();

const isDrawingROI = computed(() => roiStore.isDrawingROI);
const activeShapeTool = computed(() => roiStore.activeShapeTool);

function switchShapeTool(tool) {
  if (props.disabled || !isDrawingROI.value) return;
  
  roiStore.switchROITool(tool);
  emit('shape-change', tool);
}

function confirmRoi() {
  if (props.disabled || !isDrawingROI.value) return;
  
  roiStore.confirmROI();
  emit('confirm');
}
</script>

<style scoped>
.roi-tools-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(30, 30, 30, 0.8);
  border-radius: 4px;
  padding: 8px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shape-tools {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shape-tools-header {
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 4px;
}

.shape-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
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
}

.confirm-button:hover:not(:disabled) {
  background-color: var(--accent-green-hover, #45a049);
}

.confirm-button i {
  font-size: 12px;
}
</style>