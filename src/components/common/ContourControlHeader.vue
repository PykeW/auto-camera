<template>
  <div class="contour-header-line">
    <h4 class="contour-heading">{{ title }}</h4>
    <div class="contour-button-group">
      <button 
        class="contour-button icon-button" 
        :title="isPreviewVisible ? '隐藏预览' : '显示预览'"
        @click="togglePreview"
        :disabled="disabled"
      >
        <i :class="[isPreviewVisible ? 'fas fa-eye-slash' : 'fas fa-eye']"></i>
      </button>
      <button 
        class="contour-button icon-button" 
        title="调整轮廓区域"
        @click="editContourArea"
        :disabled="disabled"
        :class="{ active: isEditing }"
      >
        <i class="fas fa-crop-alt"></i>
      </button>
      <button 
        class="contour-button icon-button" 
        title="应用参数"
        @click="applySettings"
        :disabled="disabled"
      >
        <i class="fas fa-check"></i>
      </button>
    </div>
  </div>
  
  <!-- 二值化图像预览 -->
  <div 
    v-if="isPreviewVisible" 
    class="binary-preview-container"
  >
    <div class="binary-image-container">
      <canvas ref="binaryCanvas" class="binary-canvas"></canvas>
      <div v-if="isProcessing" class="processing-indicator">
        <span>处理中...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoiStore } from '../../stores/roi';
import { useCameraStore } from '../../stores/camera';
import { useCalibrationStore } from '../../stores/calibration';

const props = defineProps({
  title: {
    type: String,
    default: '轮廓区域'
  },
  threshold: {
    type: Number,
    default: 127
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['edit', 'preview-toggle', 'apply-settings']);

const roiStore = useRoiStore();
const cameraStore = useCameraStore();
const calibrationStore = useCalibrationStore();

const isPreviewVisible = ref(false);
const isEditing = ref(false);
const isProcessing = ref(false);
const binaryCanvas = ref(null);

// 显示/隐藏预览
function togglePreview() {
  if (props.disabled) return;
  
  isPreviewVisible.value = !isPreviewVisible.value;
  emit('preview-toggle', isPreviewVisible.value);
  
  // 如果显示预览，立即处理图像
  if (isPreviewVisible.value) {
    updateBinaryPreview();
  }
}

// 开始编辑轮廓区域
function editContourArea() {
  if (props.disabled) return;
  
  isEditing.value = !isEditing.value;
  emit('edit', isEditing.value);
  
  // 如果开始编辑，可以启用ROI绘制模式
  if (isEditing.value) {
    roiStore.startRoiSelection('contour');
  } else {
    roiStore.stopDrawingROI();
  }
}

// 应用当前设置
function applySettings() {
  if (props.disabled) return;
  
  emit('apply-settings');
}

// 更新二值化预览
async function updateBinaryPreview() {
  if (!binaryCanvas.value || !isPreviewVisible.value) return;
  
  isProcessing.value = true;
  
  try {
    // 获取当前图像
    let imageSource;
    
    // 如果在标定模式，使用当前标定图片
    if (calibrationStore.isCalibrating && calibrationStore.currentCalibrationImageUrl) {
      imageSource = calibrationStore.currentCalibrationImageUrl;
    }
    // 如果X和Y轴被选中，使用静态9点图像
    else if (calibrationStore.selectedAxes.includes('X') && calibrationStore.selectedAxes.includes('Y')) {
      imageSource = '/9dian/12_161833.png'; 
    }
    // 否则使用相机图像
    else {
      imageSource = cameraStore.cameraImageUrl;
    }
    
    if (!imageSource) {
      console.warn('No image source available for binary preview');
      isProcessing.value = false;
      return;
    }
    
    // 加载图像
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // 设置画布大小与图像匹配
      const canvas = binaryCanvas.value;
      
      // 调整画布尺寸以保持原始比例，但适合容器
      const container = canvas.parentElement;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const imageRatio = img.width / img.height;
      const containerRatio = containerWidth / containerHeight;
      
      let canvasWidth, canvasHeight;
      if (imageRatio > containerRatio) {
        // 图像较宽，以宽度为基准
        canvasWidth = containerWidth;
        canvasHeight = containerWidth / imageRatio;
      } else {
        // 图像较高，以高度为基准
        canvasHeight = containerHeight;
        canvasWidth = containerHeight * imageRatio;
      }
      
      // 设置画布显示尺寸（CSS尺寸）
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      
      // 设置画布内部尺寸（实际像素）- 使用原图尺寸以保持清晰度
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 先绘制原图
      ctx.drawImage(img, 0, 0);
      
      // 获取图像数据
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // 应用二值化处理
      for (let i = 0; i < data.length; i += 4) {
        // 计算灰度值 (0.299 * R + 0.587 * G + 0.114 * B)
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // 基于阈值将灰度转换为黑白
        const binary = gray > props.threshold ? 255 : 0;
        
        // 设置RGB值为二值化结果
        data[i] = binary;     // R
        data[i + 1] = binary; // G
        data[i + 2] = binary; // B
        // 保持Alpha不变
      }
      
      // 将处理后的数据放回画布
      ctx.putImageData(imageData, 0, 0);
      
      isProcessing.value = false;
      
      console.log(`二值化预览已更新，阈值: ${props.threshold}`);
    };
    
    img.onerror = () => {
      console.error('Error loading image for binary preview');
      isProcessing.value = false;
    };
    
    img.src = imageSource;
    
  } catch (error) {
    console.error('Error processing binary preview:', error);
    isProcessing.value = false;
  }
}

// 监听阈值变化，更新预览
watch(() => props.threshold, (newThreshold) => {
  if (isPreviewVisible.value) {
    updateBinaryPreview();
  }
});

// 组件挂载时的处理
onMounted(() => {
  // 如果有需要，可以在这里添加其他初始化逻辑
});
</script>

<style scoped>
.contour-header-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.contour-heading {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-light);
}

.contour-button-group {
  display: flex;
  gap: 4px;
}

.contour-button {
  background-color: var(--bg-medium);
  border: 1px solid var(--border-dark);
  color: var(--text-light);
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.contour-button:hover:not(:disabled) {
  background-color: var(--bg-light-hover);
}

.contour-button:disabled {
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

.active {
  background-color: var(--accent-blue);
  color: white;
}

.binary-preview-container {
  margin-top: 8px;
  margin-bottom: 8px;
  width: 100%;
  border: 1px solid var(--border-dark);
  border-radius: 4px;
  background-color: #1a1a1a;
  position: relative;
}

.binary-image-container {
  width: 100%;
  height: 150px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.binary-canvas {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.processing-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
</style> 