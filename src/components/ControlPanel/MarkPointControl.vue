<!-- src/components/ControlPanel/MarkPointControl.vue -->
<template>
  <div>
    <!-- Mark点方式选择和参数 -->
    <div class="control-item side-by-side" v-if="hasAxes" style="margin-top: 8px;">
      <label for="mark-method">Mark点方式:</label>
      <select id="mark-method" class="compact-select" v-model="calibrationStore.markMethod" @change="onMarkMethodChange">
        <option value="template">模板匹配</option>
        <option value="contourExtraction">轮廓提取</option>
        <!-- <option value="circle">圆形检测</option> -->
        <!-- <option value="cross">十字检测</option> -->
      </select>
      <img v-if="calibrationStore.markPreviewImg" :src="calibrationStore.markPreviewImg" alt="Mark点示例" style="height:32px;margin-left:8px;border-radius:4px;" />
    </div>

    <!-- Parameters for Template Matching -->
    <div v-if="calibrationStore.markMethod === 'template' && hasAxes" class="parameters-group control-group">
      <h5 class="parameters-title">模板匹配参数</h5>
      <div class="control-item side-by-side">
        <label for="capture-template-roi-btn">模板图片:</label>
        <button id="capture-template-roi-btn" class="secondary-button compact-input" @click="captureTemplateFromROI">
          <i class="fas fa-crop-alt"></i> 截取模板ROI
        </button>
      </div>
      <div v-if="templateMatchingParams.templateImage" class="control-item side-by-side template-preview-container">
        <label>模板预览:</label>
        <img :src="templateMatchingParams.templateImage" alt="模板预览" class="template-preview-img">
      </div>
      <div class="control-item side-by-side">
        <label for="matching-threshold">匹配阈值:</label>
        <input type="number" id="matching-threshold" class="compact-input" v-model="templateMatchingParams.threshold" min="0" max="1" step="0.01">
      </div>
      <div class="control-item button-group-inline">
        <button class="secondary-button" @click="drawTemplate" :disabled="!templateMatchingParams.templateImage">
          <i :class="roiStore.isDrawingTemplateOnOverlay && roiStore.templateDataUrlForOverlay === templateMatchingParams.templateImage ? 'fas fa-eye-slash' : 'fas fa-paint-brush'"></i> 
          {{ drawTemplateButtonText }}
        </button>
        <button class="secondary-button" @click="detectMarkWithTemplate" :disabled="!templateMatchingParams.templateImage">
          <i class="fas fa-search-location"></i> 检测
        </button>
      </div>
    </div>

    <!-- Parameters for Contour Extraction -->
    <div v-if="calibrationStore.markMethod === 'contourExtraction' && hasAxes" class="parameters-group control-group">
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
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
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
  isCalibrating: {
    type: Boolean,
    default: false
  }
});

const calibrationStore = useCalibrationStore();
const roiStore = useRoiStore();

// 计算是否有必要的轴
const hasAxes = computed(() => props.assignedX && props.assignedY);

// 绘制模板按钮文字
const drawTemplateButtonText = computed(() => {
  return roiStore.isDrawingTemplateOnOverlay && 
         roiStore.templateDataUrlForOverlay === templateMatchingParams.value.templateImage 
         ? '隐藏模板' : '绘制模板';
});

// Mark点方法相关参数
const templateMatchingParams = ref({
  templateImage: null, // Will store data URL of the captured ROI
  threshold: 0.8,
});

const contourExtractionParams = ref({
  minArea: 100,
  maxArea: 1000,
});

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
function onMarkMethodChange(e) {
  calibrationStore.setMarkMethod(e.target.value);
}

// 截取模板ROI
async function captureTemplateFromROI() {
  showMessage('请在相机画面中绘制模板区域 (ROI)。', 'info');
  try {
    // 备份现有模板数据（如果有）
    const existingTemplate = templateMatchingParams.value.templateImage;
    
    // 清除现有ROI
    if (roiStore.roiEnabled) {
      roiStore.clearROI();
      await new Promise(resolve => setTimeout(resolve, 100)); // 短暂延迟确保UI更新
    }
    
    // 如果清除ROI后，模板被意外清除，恢复它
    if (existingTemplate && !templateMatchingParams.value.templateImage) {
      console.log('恢复备份的模板数据');
      templateMatchingParams.value.templateImage = existingTemplate;
    }
    
    // 启动ROI选择模式，指定用途为"template"
    roiStore.startRoiSelection('template');
    
    console.log('已启动模板ROI选择模式');
  } catch (error) {
    showMessage(`截取模板ROI失败: ${error.message}`, 'error');
    console.error('启动模板ROI截取时出错:', error);
    roiStore.stopDrawingROI(); // 确保退出ROI绘制模式
  }
}

// 绘制/隐藏模板
function drawTemplate() {
  if (!templateMatchingParams.value.templateImage) {
    showMessage('没有可用的模板图片。', 'warn');
    return;
  }

  // 切换模板的显示/隐藏状态
  try {
    // 如果当前正在显示此模板，则隐藏它；否则显示它
    if (roiStore.isDrawingTemplateOnOverlay && 
        roiStore.templateDataUrlForOverlay === templateMatchingParams.value.templateImage) {
      roiStore.toggleTemplateDrawingOnOverlay(null); // 传null来关闭显示
      showMessage('模板已隐藏。', 'info');
    } else {
      roiStore.toggleTemplateDrawingOnOverlay(templateMatchingParams.value.templateImage);
      showMessage('模板已绘制在ROI区域上。', 'info');
    }
  } catch (error) {
    showMessage(`模板绘制出错: ${error.message}`, 'error');
    console.error('Error toggling template drawing:', error);
  }
}

// 使用模板进行Mark点检测
async function detectMarkWithTemplate() {
  if (!templateMatchingParams.value.templateImage) {
    showMessage('请先截取模板图片。', 'warn');
    return;
  }
  if (!hasAxes.value) {
    showMessage('请先选择X和Y轴。', 'error');
    return;
  }

  showMessage('开始模板匹配检测...', 'info');
  try {
    const success = await calibrationStore.detectMarkWithTemplateMatching({
      templateImageSrc: templateMatchingParams.value.templateImage,
      threshold: templateMatchingParams.value.threshold,
    });
    if (success && calibrationStore.detectedTemplatedMarks.length > 0) {
      showMessage(`模板匹配成功，检测到 ${calibrationStore.detectedTemplatedMarks.length} 个标记。`, 'success');
    } else if (success) {
      showMessage('模板匹配完成，但未检测到标记。', 'warn');
    } else {
      showMessage('模板匹配检测失败。请检查控制台获取更多信息。', 'error');
    }
  } catch (error) {
    showMessage(`模板匹配检测出错: ${error.message}`, 'error');
    console.error('Error in detectMarkWithTemplate:', error);
  }
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
</style> 