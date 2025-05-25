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
        style="margin-top: 8px;"
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
        style="margin-top: 8px;"
        class="normal-font-heading"
      />
      <div v-if="calibrationStore.markMethod === 'template' && templateMatchingParams.templateImage" class="control-item side-by-side template-preview-container">
        <label>模板预览:</label>
        <img :src="templateMatchingParams.templateImage" alt="模板预览" class="template-preview-img">
      </div>

      <!-- Parameters for Contour Extraction -->
      <div v-if="calibrationStore.markMethod === 'contourExtraction'" class="parameters-group control-group">
        <h5 class="parameters-title">轮廓提取参数</h5>
        <div class="control-item side-by-side">
          <label for="contour-min-area">最小面积:</label>
          <input type="number" id="contour-min-area" class="compact-input" v-model="contourExtractionParams.minArea">
        </div>
        <div class="control-item side-by-side">
          <label for="contour-max-area">最大面积:</label>
          <input type="number" id="contour-max-area" class="compact-input" v-model="contourExtractionParams.maxArea">
        </div>
        <!-- Add detect button for contour if needed -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useCalibrationStore } from '../../stores/calibration';
import { useRoiStore } from '../../stores/roi';
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
});

// Mark点方法选项
const markMethodOptions = [
  { id: 'template', name: '模板匹配' },
  { id: 'contourExtraction', name: '轮廓提取' },
  // { id: 'circle', name: '圆形检测' },
  // { id: 'cross', name: '十字检测' },
];

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

.template-preview-container {
  display: flex;
  align-items: center;
  margin-top: 5px;
  margin-bottom: 5px;
}

.template-preview-container label {
  margin-right: 8px; /* Adjust as needed */
  min-width: 70px; /* Ensure label alignment */
}

.template-preview-img {
  max-width: 100px; /* Adjust as needed */
  max-height: 50px; /* Adjust as needed */
  border: 1px solid #555;
  border-radius: 3px;
  object-fit: contain;
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

/* 覆盖RoiControlHeader中的标题样式 */
.normal-font-heading :deep(.roi-heading) {
  font-weight: normal;
  font-size: 0.9em;
  color: var(--text-medium);
  margin: 0;
  padding: 0;
  white-space: nowrap;
}
</style> 