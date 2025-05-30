<!-- src/components/CalibrationPanel/MarkPointControl.vue -->
<template>
  <div>
    <!-- Mark点方式选择和参数 -->
    <div v-if="hasAxes">
      <SelectDropdown
        label="Mark点方式"
        selectId="mark-method"
        :modelValue="calibrationStore.markMethod"
        @update:modelValue="onMarkMethodChange"
        :options="markMethodOptions"
      />

      <!-- Template Matching Controls - 使用RoiControlHeader -->
      <RoiControlHeader 
        v-if="calibrationStore.markMethod === 'template'"
        title="模板区域ROI"
        purpose="template"
        :disabled="false"
        @visibility-toggle="handleRoiVisibilityToggle"
        @edit="handleRoiEdit"
        @clear="handleRoiClear"
        class="normal-font-heading"
      />
      
      <!-- 添加匹配阈值控件 -->
      <div v-if="calibrationStore.markMethod === 'template'" class="dropdown-selector-like">
        <div class="control-item side-by-side">
          <label for="match-threshold" style="min-width: 80px;">匹配阈值:</label>
          <div class="position-display-container">
            <input 
              type="number" 
              id="match-threshold" 
              class="compact-input" 
              v-model="templateMatchingParams.threshold" 
              min="0" 
              max="1" 
              step="0.01"
              @wheel.prevent="handleWheel($event, templateMatchingParams, 'threshold', 0.01, 0, 1)"
            >
            <span class="unit-display"></span>
          </div>
        </div>
      </div>

      <!-- 轮廓提取参数控件 -->
      <div v-if="calibrationStore.markMethod === 'contourExtraction'" class="dropdown-selector-like">
        <div class="control-item side-by-side">
          <label for="binary-threshold" style="min-width: 80px;">二值阈值:</label>
          <div class="position-display-container">
            <input 
              type="number" 
              id="binary-threshold" 
              class="compact-input" 
              v-model="contourExtractionParams.binaryThreshold" 
              min="0" 
              max="255" 
              step="1"
              @wheel.prevent="handleWheel($event, contourExtractionParams, 'binaryThreshold', 1, 0, 255)"
              @focus="showBinaryPreview = true; updateBinaryPreview()"
            >
            <button 
              class="preview-toggle-button" 
              @click="toggleBinaryPreview"
              :class="{ active: showBinaryPreview }"
              title="预览二值化效果"
            >
              <i :class="[showBinaryPreview ? 'fas fa-eye-slash' : 'fas fa-eye']"></i>
            </button>
            <span class="unit-display"></span>
          </div>
        </div>
        
        <!-- 二值化预览区域 -->
        <div 
          v-if="showBinaryPreview" 
          class="binary-preview-container"
        >
          <div class="binary-image-container">
            <canvas ref="binaryPreviewCanvas" class="binary-canvas"></canvas>
            <div v-if="isBinaryProcessing" class="processing-indicator">
              <span>处理中...</span>
            </div>
          </div>
        </div>

        <div class="control-item side-by-side">
          <label for="area-range" style="min-width: 80px;">面积范围:</label>
          <div class="position-display-container" style="display: flex; gap: 8px;">
            <input 
              type="number" 
              id="contour-min-area" 
              class="compact-input" 
              v-model="contourExtractionParams.minArea"
              placeholder="最小"
              min="0"
              @wheel.prevent="handleWheel($event, contourExtractionParams, 'minArea', 10, 0)"
            >
            <span style="color: #888;">-</span>
            <input 
              type="number" 
              id="contour-max-area" 
              class="compact-input" 
              v-model="contourExtractionParams.maxArea"
              placeholder="最大"
              min="0"
              @wheel.prevent="handleWheel($event, contourExtractionParams, 'maxArea', 10, 0)"
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useCalibrationStore } from '../../stores/calibration';
import { useRoiStore } from '../../stores/roi';
import { useCameraStore } from '../../stores/camera';
import { showMessage } from '../../utils/helpers';
import SelectDropdown from '../common/SelectDropdown.vue';
import RoiControlHeader from '../common/RoiControlHeader.vue';

const props = defineProps({
  assignedX: {
    type: String,
    default: ''
  },
  assignedY: {
    type: String,
    default: ''
  },
  isCalibrating: {
    type: Boolean,
    default: false
  }
});

const calibrationStore = useCalibrationStore();
const roiStore = useRoiStore();
const cameraStore = useCameraStore();

// 计算是否有必要的轴
const hasAxes = computed(() => props.assignedX && props.assignedY);

// Mark点方法相关参数
const templateMatchingParams = ref({
  templateImage: null, // Will store data URL of the captured ROI
  threshold: 0.8,
});

const contourExtractionParams = ref({
  minArea: 100,
  maxArea: 1000,
  binaryThreshold: 127,
});

// Mark点方法选项
const markMethodOptions = [
  { id: 'template', name: '模板匹配' },
  { id: 'contourExtraction', name: '轮廓提取' },
  // { id: 'circle', name: '圆形检测' },
  // { id: 'cross', name: '十字检测' },
];

// 鼠标滚轮调整数值功能
function handleWheel(event, obj, prop, step = 1, min = null, max = null) {
  // 确保元素具有焦点
  if (document.activeElement !== event.target) return;
  
  // 根据滚轮方向调整值
  const delta = event.deltaY > 0 ? -1 : 1;
  const currentValue = parseFloat(obj[prop]);
  let newValue = currentValue + (delta * step);
  
  // 应用最小值/最大值限制
  if (min !== null && newValue < min) newValue = min;
  if (max !== null && newValue > max) newValue = max;
  
  // 更新数值
  obj[prop] = newValue;
  
  // 防止页面滚动
  event.preventDefault();
}

// 组件挂载后初始化函数
onMounted(() => {
  // 初始化时同步模板参数
  console.log('组件挂载：同步模板参数');
  
  // 优先从roiStore获取模板
  if (roiStore.capturedTemplateDataUrl) {
    console.log('从roiStore获取模板数据');
    templateMatchingParams.value.templateImage = roiStore.capturedTemplateDataUrl;
    
    // 同时也更新calibrationStore的模板参数
    if (calibrationStore.templateMatchingParams) {
      calibrationStore.templateMatchingParams.templateImageSrc = roiStore.capturedTemplateDataUrl;
      calibrationStore.templateMatchingParams.threshold = templateMatchingParams.value.threshold;
    }
  }
  
  // 添加自定义事件监听器，接收模板捕获事件
  window.addEventListener('template-captured', (event) => {
    console.log('接收到template-captured事件');
    if (event.detail && event.detail.templateDataUrl) {
      console.log('从事件中获取模板数据');
      templateMatchingParams.value.templateImage = event.detail.templateDataUrl;
      
      // 同步到calibrationStore
      if (calibrationStore.templateMatchingParams) {
        calibrationStore.templateMatchingParams.templateImageSrc = event.detail.templateDataUrl;
        calibrationStore.templateMatchingParams.threshold = templateMatchingParams.value.threshold;
      }
    }
  });
});

// 组件卸载时清理
onUnmounted(() => {
  // 移除事件监听器
  window.removeEventListener('template-captured', () => {
    console.log('移除template-captured事件监听器');
  });
});

// Watch for the template image data URL from the roiStore
watch(() => roiStore.capturedTemplateDataUrl, (newDataUrl) => {
  if (newDataUrl) {
    console.log('ROI模板捕获 - 接收到新的模板数据URL，长度:', newDataUrl.length);
    
    // 更新本地模板数据
    templateMatchingParams.value.templateImage = newDataUrl;
    
    // 同步到calibrationStore
    if (calibrationStore.templateMatchingParams) {
      console.log('同步模板数据到calibrationStore');
      calibrationStore.templateMatchingParams.templateImageSrc = newDataUrl;
      calibrationStore.templateMatchingParams.threshold = templateMatchingParams.value.threshold;
    } else {
      console.log('初始化calibrationStore模板参数');
      calibrationStore.templateMatchingParams = {
        templateImageSrc: newDataUrl,
        threshold: templateMatchingParams.value.threshold
      };
    }
    
    showMessage('模板已从ROI截取成功。', 'success');
  }
}, { immediate: true });

// 监视匹配阈值的变化并同步到calibrationStore
watch(() => templateMatchingParams.value.threshold, (newThreshold) => {
  if (calibrationStore.templateMatchingParams) {
    console.log('同步匹配阈值到calibrationStore:', newThreshold);
    calibrationStore.templateMatchingParams.threshold = newThreshold;
  }
});

// 监视轮廓提取参数的变化并同步到calibrationStore
watch(() => contourExtractionParams.value, (newParams) => {
  console.log('同步轮廓提取参数到calibrationStore:', newParams);
  calibrationStore.contourExtractionParams.binaryThreshold = newParams.binaryThreshold;
  calibrationStore.contourExtractionParams.minArea = newParams.minArea;
  calibrationStore.contourExtractionParams.maxArea = newParams.maxArea;
}, { deep: true });

// Mark点方式变更处理
function onMarkMethodChange(value) {
  calibrationStore.setMarkMethod(value);
}

// ROI相关方法
function handleRoiVisibilityToggle(isVisible) {
  roiStore.toggleROIVisibility();
  showMessage(`模板ROI区域已${isVisible ? '显示' : '隐藏'}`, 'info');
}

function handleRoiEdit(isDrawing) {
  if (props.isCalibrating) {
    showMessage('正在标定，无法编辑ROI', 'warning');
    return;
  }
  roiStore.startRoiSelection('template');
  showMessage(`ROI编辑模式${isDrawing ? '已开启' : '已关闭'}`, 'info');
}

function handleRoiClear() {
  if (props.isCalibrating) {
    showMessage('正在标定，无法清除ROI', 'warning');
    return;
  }
  roiStore.clearROI();
  // 清除模板图像
  templateMatchingParams.value.templateImage = null;
  showMessage('模板ROI区域已删除', 'info');
}

// 导出模板参数，让父组件可以访问
defineExpose({
  templateMatchingParams,
  contourExtractionParams
});

// 新增
// 二值化图像预览相关
const binaryPreviewCanvas = ref(null);
const showBinaryPreview = ref(false);
const isBinaryProcessing = ref(false);
const lastPreviewTimeout = ref(null);

// 更新二值化预览函数
async function updateBinaryPreview() {
  if (!binaryPreviewCanvas.value) return;
  
  isBinaryProcessing.value = true;
  
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
    // 否则尝试使用相机图像
    else {
      imageSource = cameraStore.cameraImageUrl;
    }
    
    if (!imageSource) {
      console.warn('No image source available for binary preview');
      isBinaryProcessing.value = false;
      return;
    }
    
    // 加载图像
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // 设置画布大小与图像匹配
      const canvas = binaryPreviewCanvas.value;
      
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
        const binary = gray > contourExtractionParams.value.binaryThreshold ? 255 : 0;
        
        // 设置RGB值为二值化结果
        data[i] = binary;     // R
        data[i + 1] = binary; // G
        data[i + 2] = binary; // B
        // 保持Alpha不变
      }
      
      // 将处理后的数据放回画布
      ctx.putImageData(imageData, 0, 0);
      
      isBinaryProcessing.value = false;
    };
    
    img.onerror = () => {
      console.error('Error loading image for binary preview');
      isBinaryProcessing.value = false;
    };
    
    img.src = imageSource;
    
  } catch (error) {
    console.error('Error processing binary preview:', error);
    isBinaryProcessing.value = false;
  }
}

// 监听二值化阈值变化，添加防抖功能
watch(() => contourExtractionParams.value.binaryThreshold, () => {
  // 只有当预览显示时才更新
  if (showBinaryPreview.value) {
    // 清除上一个定时器
    if (lastPreviewTimeout.value) {
      clearTimeout(lastPreviewTimeout.value);
    }
    
    // 设置新的防抖定时器，100ms后更新预览
    lastPreviewTimeout.value = setTimeout(() => {
      updateBinaryPreview();
    }, 100);
  }
});

// 切换二值化预览显示/隐藏
function toggleBinaryPreview() {
  showBinaryPreview.value = !showBinaryPreview.value;
  
  if (showBinaryPreview.value) {
    // 延迟一点以确保DOM已更新
    setTimeout(() => {
      updateBinaryPreview();
    }, 50);
  }
}
</script>

<style scoped>
.parameters-group {
  border: 1px solid #444;
  padding: 10px;
  margin-top: 10px;
  border-radius: 4px;
  background-color: #2e2e2e; /* Slightly different background for the group */
}

.parameters-title {
  font-size: 0.9em;
  color: #c5c5c5;
  margin-bottom: 8px;
  font-weight: bold;
}

.button-group-inline {
  display: flex;
  gap: 10px; /* Spacing between buttons */
  margin-top: 5px;
  justify-content: flex-start; /* Align buttons to the start */
}

.button-group-inline .secondary-button {
  padding: 6px 10px; /* Adjust padding for potentially smaller buttons */
  font-size: 0.85em;
}

/* Ensure compact-input style is applied if the button takes its place */
.compact-input {
  padding: 6px 8px;
  font-size: 0.9em;
  border-radius: 3px;
  background-color: #333;
  color: #ddd;
  border: 1px solid #555;
  flex-grow: 1; /* Allow input/button to take available space */
  min-width: 0; /* Prevent overflow in flex containers */
}

/* 侧边并排控件 - 与对焦部分完全匹配 */
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

.control-item.side-by-side:last-child {
  margin-bottom: 0;
}

.control-item.side-by-side label {
  min-width: 70px;
  width: 70px;
  white-space: nowrap;
}

/* 下拉菜单 */
.compact-select {
  width: 65px;
  height: 28px;
  padding: 0 2px;
  background-color: #2b2b2b;
  color: #fff;
  border: 1px solid #444;
  border-radius: 3px;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23b0b0b0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-position: right 5px center;
  background-repeat: no-repeat;
  background-size: .65em auto;
}

/* 位置显示容器 - 用于匹配阈值和其他输入框 */
.position-display-container {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  height: 32px;
}

/* 单位显示 */
.unit-display {
  position: absolute;
  right: 8px;
  color: #888;
  font-size: 12px;
  user-select: none;
  padding: 0 4px;
}

/* 覆盖RoiControlHeader中的标题样式 */
.normal-font-heading :deep(.roi-heading),
.normal-font-heading :deep(.contour-heading) {
  font-weight: normal;
  font-size: 0.9em;
  color: var(--text-medium);
  margin: 0;
  padding: 0;
  white-space: nowrap;
}

/* 添加下拉选择器样式 */
.dropdown-selector-like {
  margin-top: 8px;
  padding-left: 4px;
}

/* 二值化预览相关样式 */
.binary-preview-container {
  margin-top: 8px;
  margin-bottom: 8px;
  border: 1px solid #444;
  border-radius: 4px;
  background-color: #2e2e2e;
  width: 100%;
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

.preview-toggle-button {
  position: absolute;
  right: 24px;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  color: #9e9e9e;
  font-size: 14px;
  transition: color 0.2s;
}

.preview-toggle-button:hover {
  color: #ffd700;
}

.preview-toggle-button.active {
  color: #4caf50;
}
</style> 