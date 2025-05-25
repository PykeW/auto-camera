<!-- src/components/common/RoiControlHeader.vue -->
<template>
  <div class="roi-header-line">
    <h4 class="roi-heading">{{ title }}</h4>
    <div class="roi-button-group">
      <button 
        class="roi-button icon-button" 
        :title="visibilityTitle"
        @click="toggleVisibility"
        :disabled="disabled || (!roiEnabled && !hasTemplate) || isDrawingROI"
      >
        <i :class="[roiEnabled || isTemplateVisible ? 'fas fa-eye-slash' : 'fas fa-eye']"></i>
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
        :title="deleteTitle"
        @click="clearContent"
        :disabled="disabled || (purpose === 'template' && !hasTemplate && !roiEnabled) || isDrawingROI"
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
const hasTemplate = computed(() => roiStore.capturedTemplateDataUrl !== null);
const isTemplateVisible = computed(() => roiStore.isDrawingTemplateOnOverlay);

const visibilityTitle = computed(() => {
  if (props.purpose === 'template' && hasTemplate.value) {
    return isTemplateVisible.value ? '隐藏模板' : '显示模板';
  }
  return roiEnabled.value ? '隐藏ROI' : '显示ROI';
});

const deleteTitle = computed(() => {
  if (props.purpose === 'template' && hasTemplate.value) {
    return '删除模板';
  }
  return '删除ROI';
});

function toggleVisibility() {
  if (props.disabled || isDrawingROI.value) return;
  
  if (props.purpose === 'template' && hasTemplate.value) {
    roiStore.toggleTemplateDrawingOnOverlay();
    emit('visibility-toggle', isTemplateVisible.value);
  } else {
    roiStore.toggleROIVisibility();
    emit('visibility-toggle', roiEnabled.value);
  }
}

function editRoi() {
  if (props.disabled) return;
  
  if (isDrawingROI.value) {
    roiStore.stopDrawingROI();
  } else {
    if (props.purpose === 'template' && isTemplateVisible.value) {
      roiStore.toggleTemplateDrawingOnOverlay();
    }
    
    const wasShowingTemplate = isTemplateVisible.value;
    const templateDataUrl = roiStore.capturedTemplateDataUrl;
    
    roiStore.startRoiSelection(props.purpose);
  }
  
  emit('edit', isDrawingROI.value);
}

function clearContent() {
  if (props.disabled || isDrawingROI.value) return;
  
  if (props.purpose === 'template' && hasTemplate.value) {
    if (confirm('确定要删除当前模板吗？')) {
      roiStore.clearCapturedTemplateDataUrl();
      emit('clear', 'template');
    }
  } else {
    if (confirm('确定要删除当前ROI吗？')) {
      roiStore.clearROI();
      emit('clear', 'roi');
    }
  }
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