<!-- src/components/common/RoiControlHeader.vue -->
<template>
  <div class="roi-header-line">
    <h4 class="roi-heading">{{ title }}</h4>
    <div class="roi-button-group">
      <button 
        class="roi-button icon-button" 
        :title="visibilityTitle"
        @click="toggleVisibility"
        :disabled="disabled"
      >
        <i :class="[roiEnabled ? 'fas fa-eye-slash' : 'fas fa-eye']"></i>
      </button>
      <button 
        class="roi-button icon-button" 
        title="编辑"
        @click="editRoi"
        :disabled="disabled"
        :class="{ active: isDrawingROI }"
      >
        <i class="fas fa-edit"></i>
      </button>
      <button 
        class="roi-button icon-button danger-icon" 
        title="删除"
        @click="clearRoi"
        :disabled="disabled"
      >
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoiStore } from '../../stores/roi';

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
  }
});

const emit = defineEmits(['visibility-toggle', 'edit', 'clear']);

const roiStore = useRoiStore();

const isDrawingROI = computed(() => roiStore.isDrawingROI);
const roiEnabled = computed(() => roiStore.roiEnabled);

const visibilityTitle = computed(() => {
  return roiEnabled.value ? '隐藏' : '显示';
});

function toggleVisibility() {
  if (props.disabled) return;
  
  roiStore.toggleROIVisibility();
  emit('visibility-toggle', roiEnabled.value);
}

function editRoi() {
  if (props.disabled) return;
  
  if (roiStore.isDrawingROI) {
    roiStore.stopDrawingROI();
  } else {
    roiStore.startRoiSelection(props.purpose);
  }
  emit('edit', isDrawingROI.value);
}

function clearRoi() {
  if (props.disabled) return;
  
  roiStore.clearROI();
  emit('clear');
}
</script>

<style scoped>
.roi-header-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.roi-heading {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-light);
}

.roi-button-group {
  display: flex;
  gap: 4px;
}

.roi-button {
  background-color: var(--bg-medium);
  border: 1px solid var(--border-dark);
  color: var(--text-light);
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.roi-button:hover:not(:disabled) {
  background-color: var(--bg-light-hover);
}

.roi-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-button {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.danger-icon {
  color: var(--accent-red);
}

.active {
  background-color: var(--accent-blue);
  color: white;
}
</style> 