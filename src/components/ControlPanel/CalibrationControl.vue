<!-- src/components/ControlPanel/CalibrationControl.vue -->
<template>
    <div class="panel-section requires-connection">
      <hr class="separator">
      
      <!-- 相机标定模块 -->
      <h4 class="section-title"><i class="fas fa-camera-retro"></i> 相机标定</h4>
      
      <!-- 标定参数配置区域 -->
      <div class="control-group">
        <div class="axis-control-section">
          <!-- 轴选择区域 - 一行显示 -->
          <div class="axes-selection-row">
            <ZAxisSelector
              label="X轴选择"
              selectId="x-axis-select"
              :modelValue="assignedX"
              @update:modelValue="val => handleAxisSelection('x', val)"
              :axes="availableXAxes"
              :disabled="isCalibrating"
              placeholder="请选择"
            />
            <ZAxisSelector
              label="Y轴选择"
              selectId="y-axis-select"
              :modelValue="assignedY"
              @update:modelValue="val => handleAxisSelection('y', val)"
              :axes="availableYAxes"
              :disabled="isCalibrating"
              placeholder="请选择"
            />
            <ZAxisSelector
              label="U轴选择"
              selectId="u-axis-select"
              :modelValue="assignedU"
              @update:modelValue="val => handleAxisSelection('u', val)"
              :axes="availableUAxes"
              :disabled="isCalibrating"
              placeholder="无"
            />
          </div>
          
          <!-- 轴参数区域 -->
          <div class="axes-params-section">
            <!-- X轴参数区域 -->
            <div v-if="assignedX" class="axis-params">
              <!-- 使用新组件进行X轴位置控制 -->
              <AxisPositionControl
                axisName="X"
                :formattedPosition="formattedXPosition"
                :unitDisplay="displayUnit"
                :isConnected="isConnected"
                :isMinLimitReached="isXMinLimitReached"
                :isMaxLimitReached="isXMaxLimitReached"
                :stepValue="xStepValue"
                :stepOptions="stepOptions"
                @jog="performXJog"
                @toggle-unit="toggleDisplayUnit"
                @update:stepValue="xStepValue = $event"
              />
              
              <!-- 使用新组件进行X轴速度控制 -->
              <AxisSpeedControl
                axisName="X"
                :formattedSpeed="formattedXSpeed"
                :unitDisplay="speedUnit"
                :stepValue="speedStep"
                :minValue="speedMin"
                :disabled="!isConnected || isCalibrating"
                @update:speed="xSpeed = $event"
                @validate-speed="validateXSpeedValue"
              />
            </div>
            
            <!-- Y轴参数区域 -->
            <div v-if="assignedY" class="axis-params">
              <!-- 使用新组件进行Y轴位置控制 -->
              <AxisPositionControl
                axisName="Y"
                :formattedPosition="formattedYPosition"
                :unitDisplay="displayUnit"
                :isConnected="isConnected"
                :isMinLimitReached="isYMinLimitReached"
                :isMaxLimitReached="isYMaxLimitReached"
                :stepValue="yStepValue"
                :stepOptions="stepOptions"
                @jog="performYJog"
                @toggle-unit="toggleDisplayUnit"
                @update:stepValue="yStepValue = $event"
              />
              
              <!-- 使用新组件进行Y轴速度控制 -->
              <AxisSpeedControl
                axisName="Y"
                :formattedSpeed="formattedYSpeed"
                :unitDisplay="speedUnit"
                :stepValue="speedStep"
                :minValue="speedMin"
                :disabled="!isConnected || isCalibrating"
                @update:speed="ySpeed = $event"
                @validate-speed="validateYSpeedValue"
              />
            </div>
            
            <!-- U轴参数区域 -->
            <div v-if="assignedU" class="axis-params">
              <!-- 使用新组件进行U轴位置控制 -->
              <AxisPositionControl
                axisName="U"
                :formattedPosition="formattedUPosition"
                :unitDisplay="uDisplayUnit"
                :isConnected="isConnected"
                :isMinLimitReached="isUMinLimitReached"
                :isMaxLimitReached="isUMaxLimitReached"
                :stepValue="uStepValue"
                :stepOptions="uStepOptions"
                @jog="performUJog"
                @toggle-unit="toggleUDisplayUnit"
                @update:stepValue="uStepValue = $event"
              />
              
              <!-- 使用新组件进行U轴速度控制 -->
              <AxisSpeedControl
                axisName="U"
                :formattedSpeed="formattedUSpeed"
                :unitDisplay="uSpeedUnit"
                :stepValue="uSpeedStep"
                :minValue="uSpeedMin"
                :disabled="!isConnected || isCalibrating"
                @update:speed="uSpeed = $event"
                @validate-speed="validateUSpeedValue"
              />
            </div>
          </div>
        </div>
        
        <div class="control-item side-by-side">
          <label for="matrix-size">矩阵大小:</label>
          <div class="position-display-container">
            <select id="matrix-size" class="compact-select" v-model="matrixSize">
              <option value="3" selected>3×3</option>
              <option value="5">5×5</option>
              <option value="7">7×7</option>
              <option value="9">9×9</option>
            </select>
          </div>
        </div>
        <div class="control-item side-by-side">
          <label for="point-offset">点位偏移(mm):</label>
          <div class="position-display-container">
            <input type="number" id="point-offset" v-model="pointOffset" step="0.1" min="0.1" class="standard-input">
          </div>
        </div>
        
        <!-- Mark点方式选择和参数 -->
        <div class="control-item side-by-side" v-if="assignedX && assignedY">
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
        <div v-if="calibrationStore.markMethod === 'template' && assignedX && assignedY" class="parameters-group control-group">
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
        <div v-if="calibrationStore.markMethod === 'contourExtraction' && assignedX && assignedY" class="parameters-group control-group">
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
      
      <!-- 结果操作按钮 -->
      <div class="result-actions-row">
        <!-- 只保留保存矩阵按钮 -->
      </div>
  
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
  import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
  import { useCameraStore } from '../../stores/camera';
  import { useFocusStore } from '../../stores/focus';
  import { useCalibrationStore } from '../../stores/calibration';
  import { useAxisStore } from '../../stores/axis';
  import { useRoiStore } from '../../stores/roi'; // Import ROI store
  import { showMessage } from '../../utils/helpers';
  import { 
    formatByUnit, 
    validateNumericInput, 
    isAxisLimitReached 
  } from '../../utils/inputHelpers';
  import ZAxisSelector from './ZAxisSelector.vue'; // Import the ZAxisSelector component
  import AxisPositionControl from '../common/AxisPositionControl.vue';
  import AxisSpeedControl from '../common/AxisSpeedControl.vue';
  
  const cameraStore = useCameraStore();
  const focusStore = useFocusStore();
  const calibrationStore = useCalibrationStore();
  const axisStore = useAxisStore();
  const roiStore = useRoiStore(); // Initialize ROI store
  
  // 计算属性
  const isConnected = computed(() => cameraStore.isConnected);
  const isFocusing = computed(() => focusStore.isFocusing);
  const isCalibrating = computed(() => calibrationStore.isCalibrating);
  const markDetected = computed(() => calibrationStore.markDetected);
  const markCentered = computed(() => calibrationStore.markCentered);
  const calibrationProgress = computed(() => calibrationStore.calibrationProgress);
  const hasCalibrationResult = computed(() => !!calibrationStore.calibrationResult);
  const plcAxes = computed(() => axisStore.plcAxes);
  const displayUnit = computed(() => axisStore.displayUnit);
  
  // Get assigned axes from store for readability
  const assignedX = computed(() => axisStore.assignedCalibrationAxesIds.x);
  const assignedY = computed(() => axisStore.assignedCalibrationAxesIds.y);
  const assignedU = computed(() => axisStore.assignedCalibrationAxesIds.u);

  // Handler for axis selection
  function handleAxisSelection(role, axisId) {
    // Prevent assigning an ID that is the current focus axis
    if (axisId && axisId === axisStore.selectedAxisId) {
      showMessage('该轴已在对焦模块中使用，请先解除绑定。', 'warning');
      // Revert to previous value if possible or handle appropriately
      // This might require the ZAxisSelector to emit old value or for us to temporarily store it
      return;
    }
    axisStore.setAssignedCalibrationAxis(role, axisId);
  }
  
  // 绘制模板按钮文字
  const drawTemplateButtonText = computed(() => {
    return roiStore.isDrawingTemplateOnOverlay && 
           roiStore.templateDataUrlForOverlay === templateMatchingParams.value.templateImage 
           ? '隐藏模板' : '绘制模板';
  });
  
  // U轴单位控制（度/弧度）
  const uUnitMode = ref('deg'); // 'deg' 或 'rad'
  const uDisplayUnit = computed(() => uUnitMode.value === 'deg' ? '°' : 'rad');
  
  // 切换X、Y轴显示单位
  function toggleDisplayUnit() {
    axisStore.toggleUnit();
  }
  
  // 切换U轴显示单位
  function toggleUDisplayUnit() {
    uUnitMode.value = uUnitMode.value === 'deg' ? 'rad' : 'deg';
  }
  
  // 速度相关计算属性
  const speedUnit = computed(() => {
    return displayUnit.value === 'mm' ? 'mm/s' : 'um/s';
  });
  
  const speedStep = computed(() => displayUnit.value === 'mm' ? 0.1 : 100);
  const speedMin = computed(() => displayUnit.value === 'mm' ? 0.1 : 10);
  
  // U轴速度相关计算属性
  const uSpeedUnit = computed(() => {
    return uUnitMode.value === 'deg' ? '°/s' : 'rad/s';
  });
  
  const uSpeedStep = computed(() => uUnitMode.value === 'deg' ? 0.1 : 0.01);
  const uSpeedMin = computed(() => uUnitMode.value === 'deg' ? 0.1 : 0.01);
  
  // --- Start of MarkPointControl related script ---
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
    
    // 添加模板状态检查和恢复工具
    window._debug_template = {
      // 检查模板状态
      check: () => {
        console.log('=== 模板状态检查 ===');
        console.log('本地模板:', !!templateMatchingParams.value.templateImage);
        console.log('ROI存储模板:', !!roiStore.capturedTemplateDataUrl);
        console.log('ROI显示模板:', !!roiStore.templateDataUrlForOverlay);
        console.log('标定存储模板:', !!calibrationStore.templateMatchingParams?.templateImageSrc);
        console.log('模板显示状态:', roiStore.isDrawingTemplateOnOverlay);
        return {
          localTemplate: !!templateMatchingParams.value.templateImage,
          roiTemplate: !!roiStore.capturedTemplateDataUrl,
          overlayTemplate: !!roiStore.templateDataUrlForOverlay,
          calibTemplate: !!calibrationStore.templateMatchingParams?.templateImageSrc,
          isShowing: roiStore.isDrawingTemplateOnOverlay
        };
      },
      
      // 同步模板状态 - 从任一来源同步到所有地方
      sync: () => {
        console.log('=== 同步模板数据 ===');
        // 从任一可用源获取模板
        let templateSource = templateMatchingParams.value.templateImage ||
                            roiStore.capturedTemplateDataUrl ||
                            roiStore.templateDataUrlForOverlay ||
                            calibrationStore.templateMatchingParams?.templateImageSrc;
        
        if (!templateSource) {
          console.log('没有可用的模板数据源');
          return false;
        }
        
        console.log('找到模板数据，长度:', templateSource.length);
        
        // 同步到所有位置
        templateMatchingParams.value.templateImage = templateSource;
        roiStore.capturedTemplateDataUrl = templateSource;
        
        if (calibrationStore.templateMatchingParams) {
          calibrationStore.templateMatchingParams.templateImageSrc = templateSource;
        } else {
          calibrationStore.templateMatchingParams = {
            templateImageSrc: templateSource,
            threshold: 0.7
          };
        }
        
        console.log('模板数据已同步到所有存储位置');
        return true;
      },
      
      // 显示/隐藏模板
      toggle: () => {
        if (!roiStore.templateDataUrlForOverlay && !roiStore.isDrawingTemplateOnOverlay) {
          // 尝试从可用源显示
          let source = templateMatchingParams.value.templateImage || 
                      roiStore.capturedTemplateDataUrl ||
                      calibrationStore.templateMatchingParams?.templateImageSrc;
                      
          if (source) {
            roiStore.toggleTemplateDrawingOnOverlay(source);
            return true;
          }
          return false;
        } else {
          // 已显示则隐藏
          roiStore.toggleTemplateDrawingOnOverlay(null);
          return true;
        }
      }
    };
    
    // 添加重新显示模板的调试方法
    window._debug_showTemplate = () => {
      console.log('模板检查 - templateMatchingParams:', !!templateMatchingParams.value.templateImage);
      console.log('模板检查 - roiStore模板:', !!roiStore.capturedTemplateDataUrl);
    };
  });
  
  // 组件卸载时清理
  onUnmounted(() => {
    // 移除事件监听器
    window.removeEventListener('template-captured', () => {
      console.log('移除template-captured事件监听器');
    });
  });

  function handleTemplateImageUpload(event) {
    // This function is now obsolete for ROI capture, but kept for reference or future file input needs.
    // For ROI capture, templateImage will be set directly with a data URL.
    const file = event.target.files[0];
    if (file) {
      templateMatchingParams.value.templateImage = URL.createObjectURL(file);
      showMessage(`已选择模板图片: ${file.name}`, 'info');
    }
  }

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

  // Watch for the template image data URL from the roiStore
  // This assumes roiStore will have a property like `capturedTemplateDataUrl`
  // which is set when an ROI is confirmed for template capture.
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
      
      // 额外的检查和调试信息
      setTimeout(() => {
        console.log('确认模板数据同步状态:');
        console.log('- 本地模板:', !!templateMatchingParams.value.templateImage);
        console.log('- calibrationStore模板:', !!calibrationStore.templateMatchingParams?.templateImageSrc);
      }, 100);
    }
  }, { immediate: true });

  async function detectMarkWithTemplate() {
    if (!templateMatchingParams.value.templateImage) {
      showMessage('请先截取模板图片。', 'warn');
      return;
    }
    if (!cameraStore.isConnected && !(assignedX.value && assignedY.value)) {
      showMessage('相机未连接，无法执行模板匹配检测。如果标定X和Y轴，请确保已选择它们以使用静态图像。', 'error');
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
  // --- End of MarkPointControl related script ---

  // 步进选项
  const stepOptions = computed(() => {
    if (displayUnit.value === 'mm') {
      return [
        { value: 0.001, label: '0.001' },
        { value: 0.01, label: '0.01' },
        { value: 0.1, label: '0.1' },
        { value: 0.5, label: '0.5' },
        { value: 1.0, label: '1.0' }
      ];
    } else {
      return [
        { value: 1, label: '1' },
        { value: 10, label: '10' },
        { value: 100, label: '100' },
        { value: 500, label: '500' },
        { value: 1000, label: '1000' }
      ];
    }
  });
  
  // U轴步进选项
  const uStepOptions = computed(() => {
    if (uUnitMode.value === 'deg') {
      return [
        { value: 0.01, label: '0.01' },
        { value: 0.1, label: '0.1' },
        { value: 1.0, label: '1.0' },
        { value: 5.0, label: '5.0' },
        { value: 10.0, label: '10.0' }
      ];
    } else {
      return [
        { value: 0.001, label: '0.001' },
        { value: 0.01, label: '0.01' },
        { value: 0.1, label: '0.1' },
        { value: 0.2, label: '0.2' }
      ];
    }
  });
  
  // 可用的轴选择（确保不重复选择）
  const availableXAxes = computed(() => {
    const otherSelectedCalibrationAxes = [assignedY.value, assignedU.value].filter(id => id !== '');
    const focusAxisId = axisStore.selectedAxisId;
    return plcAxes.value.filter(axis => 
      axis.id !== focusAxisId && 
      !otherSelectedCalibrationAxes.includes(axis.id)
    );
  });
  
  const availableYAxes = computed(() => {
    const otherSelectedCalibrationAxes = [assignedX.value, assignedU.value].filter(id => id !== '');
    const focusAxisId = axisStore.selectedAxisId;
    return plcAxes.value.filter(axis => 
      axis.id !== focusAxisId && 
      !otherSelectedCalibrationAxes.includes(axis.id)
    );
  });
  
  const availableUAxes = computed(() => {
    const otherSelectedCalibrationAxes = [assignedX.value, assignedY.value].filter(id => id !== '');
    const focusAxisId = axisStore.selectedAxisId;
    return plcAxes.value.filter(axis => 
      axis.id !== focusAxisId && 
      !otherSelectedCalibrationAxes.includes(axis.id)
    );
  });
  
  // 步进和速度参数
  const xStepValue = ref(axisStore.displayUnit === 'mm' ? 0.1 : 100);
  const yStepValue = ref(axisStore.displayUnit === 'mm' ? 0.1 : 100);
  const uStepValue = ref(0.1); // 默认0.1度
  const xSpeed = ref(axisStore.displayUnit === 'mm' ? 1.0 : 1000);
  const ySpeed = ref(axisStore.displayUnit === 'mm' ? 1.0 : 1000);
  const uSpeed = ref(5.0); // 默认5度/秒
  
  // X轴相关计算属性
  const xAxisName = computed(() => {
    return assignedX.value ? axisStore.getAxisNameById(assignedX.value) : '';
  });
  
  const xPosition = computed(() => {
    if (!xAxisName.value) return 0;
    return axisStore.positions[xAxisName.value] || 0;
  });
  
  const xPositionEncoder = computed(() => {
    if (!xAxisName.value) return 0;
    return axisStore.positionsEncoder[xAxisName.value] || 0;
  });
  
  const formattedXPosition = computed(() => {
    if (!isConnected.value || !xAxisName.value) return '--';
    
    const value = displayUnit.value === 'mm' ? xPosition.value : xPositionEncoder.value;
    return formatByUnit(Math.abs(value), displayUnit.value);
  });
  
  const xAxisLimits = computed(() => {
    if (!xAxisName.value) return { min: 0, max: 100 };
    return axisStore.axisLimits[xAxisName.value] || { min: 0, max: 100 };
  });
  
  const xAxisLimitsEncoder = computed(() => {
    if (!xAxisName.value) return { min: 0, max: 100000 };
    return axisStore.axisLimitsEncoder[xAxisName.value] || { min: 0, max: 100000 };
  });
  
  const isXMinLimitReached = computed(() => {
    if (!isConnected.value || !xAxisName.value) return true;
    
    if (displayUnit.value === 'mm') {
      return xPosition.value - xStepValue.value < xAxisLimits.value.min;
    } else {
      return xPositionEncoder.value - xStepValue.value < xAxisLimitsEncoder.value.min;
    }
  });
  
  const isXMaxLimitReached = computed(() => {
    if (!isConnected.value || !xAxisName.value) return true;
    
    if (displayUnit.value === 'mm') {
      return xPosition.value + xStepValue.value > xAxisLimits.value.max;
    } else {
      return xPositionEncoder.value + xStepValue.value > xAxisLimitsEncoder.value.max;
    }
  });
  
  // Y轴相关计算属性
  const yAxisName = computed(() => {
    return assignedY.value ? axisStore.getAxisNameById(assignedY.value) : '';
  });
  
  const yPosition = computed(() => {
    if (!yAxisName.value) return 0;
    return axisStore.positions[yAxisName.value] || 0;
  });
  
  const yPositionEncoder = computed(() => {
    if (!yAxisName.value) return 0;
    return axisStore.positionsEncoder[yAxisName.value] || 0;
  });
  
  const formattedYPosition = computed(() => {
    if (!isConnected.value || !yAxisName.value) return '--';
    
    const value = displayUnit.value === 'mm' ? yPosition.value : yPositionEncoder.value;
    return formatByUnit(Math.abs(value), displayUnit.value);
  });
  
  const yAxisLimits = computed(() => {
    if (!yAxisName.value) return { min: 0, max: 100 };
    return axisStore.axisLimits[yAxisName.value] || { min: 0, max: 100 };
  });
  
  const yAxisLimitsEncoder = computed(() => {
    if (!yAxisName.value) return { min: 0, max: 100000 };
    return axisStore.axisLimitsEncoder[yAxisName.value] || { min: 0, max: 100000 };
  });
  
  const isYMinLimitReached = computed(() => {
    if (!isConnected.value || !yAxisName.value) return true;
    
    if (displayUnit.value === 'mm') {
      return yPosition.value - yStepValue.value < yAxisLimits.value.min;
    } else {
      return yPositionEncoder.value - yStepValue.value < yAxisLimitsEncoder.value.min;
    }
  });
  
  const isYMaxLimitReached = computed(() => {
    if (!isConnected.value || !yAxisName.value) return true;
    
    if (displayUnit.value === 'mm') {
      return yPosition.value + yStepValue.value > yAxisLimits.value.max;
    } else {
      return yPositionEncoder.value + yStepValue.value > yAxisLimitsEncoder.value.max;
    }
  });
  
  // U轴相关计算属性
  const uAxisName = computed(() => {
    return assignedU.value ? axisStore.getAxisNameById(assignedU.value) : '';
  });
  
  const uPosition = computed(() => {
    if (!uAxisName.value) return 0;
    return axisStore.positions[uAxisName.value] || 0;
  });
  
  const uPositionEncoder = computed(() => {
    if (!uAxisName.value) return 0;
    return axisStore.positionsEncoder[uAxisName.value] || 0;
  });
  
  const formattedUPosition = computed(() => {
    if (!isConnected.value || !uAxisName.value) return '--';
    
    const value = displayUnit.value === 'mm' ? uPosition.value : uPositionEncoder.value;
    return formatByUnit(Math.abs(value), displayUnit.value);
  });
  
  const uAxisLimits = computed(() => {
    if (!uAxisName.value) return { min: 0, max: 100 };
    return axisStore.axisLimits[uAxisName.value] || { min: 0, max: 100 };
  });
  
  const uAxisLimitsEncoder = computed(() => {
    if (!uAxisName.value) return { min: 0, max: 100000 };
    return axisStore.axisLimitsEncoder[uAxisName.value] || { min: 0, max: 100000 };
  });
  
  const isUMinLimitReached = computed(() => {
    if (!isConnected.value || !uAxisName.value) return true;
    
    if (displayUnit.value === 'mm') {
      return uPosition.value - uStepValue.value < uAxisLimits.value.min;
    } else {
      return uPositionEncoder.value - uStepValue.value < uAxisLimitsEncoder.value.min;
    }
  });
  
  const isUMaxLimitReached = computed(() => {
    if (!isConnected.value || !uAxisName.value) return true;
    
    if (displayUnit.value === 'mm') {
      return uPosition.value + uStepValue.value > uAxisLimits.value.max;
    } else {
      return uPositionEncoder.value + uStepValue.value > uAxisLimitsEncoder.value.max;
    }
  });
  
  const canStartCalibration = computed(() => {
    // 至少需要选择X和Y轴，且不能选择相同的轴
    return assignedX.value && assignedY.value && assignedX.value !== assignedY.value &&
           (!assignedU.value || (assignedU.value !== assignedX.value && assignedU.value !== assignedY.value));
  });
  
  // 监听轴选择变化
  watch(() => [assignedX.value, assignedY.value, assignedU.value], () => {
    const axes = [];
    if (assignedX.value) axes.push('X');
    if (assignedY.value) axes.push('Y');
    if (assignedU.value) axes.push('U');
    calibrationStore.setSelectedAxes(axes);
  });
  
  // 监听单位变更，调整步进和速度值
  watch(() => axisStore.displayUnit, (newUnit) => {
    if (newUnit === 'mm') {
      // 从um转到mm
      xStepValue.value = 0.1;
      yStepValue.value = 0.1;
      xSpeed.value = Number((parseFloat(xSpeed.value) / 1000).toFixed(3));
      ySpeed.value = Number((parseFloat(ySpeed.value) / 1000).toFixed(3));
    } else {
      // 从mm转到um
      xStepValue.value = 100;
      yStepValue.value = 100;
      xSpeed.value = Math.round(parseFloat(xSpeed.value) * 1000);
      ySpeed.value = Math.round(parseFloat(ySpeed.value) * 1000);
    }
  });
  
  // 监听U轴单位变更
  watch(() => uUnitMode.value, (newMode) => {
    if (newMode === 'rad') {
      // 从度转到弧度
      uStepValue.value = 0.01;
      uSpeed.value = Number((parseFloat(uSpeed.value) * Math.PI / 180).toFixed(4));
    } else {
      // 从弧度转到度
      uStepValue.value = 0.1;
      uSpeed.value = Number((parseFloat(uSpeed.value) * 180 / Math.PI).toFixed(2));
    }
  });
  
  const matrixSize = computed({
    get: () => calibrationStore.matrixSize,
    set: (value) => calibrationStore.matrixSize = parseInt(value)
  });
  
  const pointOffset = computed({
    get: () => calibrationStore.pointOffset,
    set: (value) => calibrationStore.pointOffset = parseFloat(value)
  });
  
  const markMethod = ref('template');
  const markPreviewImg = computed(() => {
    // 这里只用一张图片做示例，实际可根据markMethod切换不同图片
    return '/9dian/12_161825.png';
  });
  
  const squareSize = computed({
    get: () => calibrationStore.squareSize,
    set: (value) => calibrationStore.squareSize = parseFloat(value)
  });
  
  const calibrationStatus = computed(() => {
    if (!canStartCalibration.value) return '请选择至少X和Y轴';
    if (isCalibrating.value) return '标定中';
    if (hasCalibrationResult.value) return '已完成';
    return '未开始';
  });
  
  const currentPointText = computed(() => {
    const point = calibrationStore.currentPoint;
    if (!point) return '--';
    return `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
  });
  
  const calibrationRatioText = computed(() => {
    const result = calibrationStore.calibrationResult;
    if (!result || !result.ratio) return '-- px/mm';
    return `${result.ratio.toFixed(2)} px/mm`;
  });
  
  // 格式化X轴速度
  const formattedXSpeed = computed(() => formatByUnit(xSpeed.value, displayUnit.value));
  
  // 格式化Y轴速度
  const formattedYSpeed = computed(() => formatByUnit(ySpeed.value, displayUnit.value));
  
  // 格式化U轴速度
  const formattedUSpeed = computed(() => formatByUnit(uSpeed.value, uUnitMode.value === 'deg' ? 'deg' : 'rad'));

  // 验证X轴速度输入
  function validateXSpeedValue(event) {
    validateNumericInput(event, xSpeed, parseFloat(speedMin.value));
  }
  
  // 验证Y轴速度输入
  function validateYSpeedValue(event) {
    validateNumericInput(event, ySpeed, parseFloat(speedMin.value));
  }
  
  // 验证U轴速度输入
  function validateUSpeedValue(event) {
    validateNumericInput(event, uSpeed, parseFloat(uSpeedMin.value));
  }
  
  // 通用轴点动控制函数
  async function performAxisJog(axisRole, direction) {
    // 根据轴角色确定轴名称、步进值和速度
    let axisName, stepValue, speed;
    let isMinLimitReached = false;
    let isMaxLimitReached = false;
    
    if (axisRole === 'x') {
      if (!isConnected.value || !xAxisName.value) return;
      axisName = xAxisName.value;
      stepValue = xStepValue.value;
      speed = xSpeed.value;
      isMinLimitReached = isXMinLimitReached.value;
      isMaxLimitReached = isXMaxLimitReached.value;
    } else if (axisRole === 'y') {
      if (!isConnected.value || !yAxisName.value) return;
      axisName = yAxisName.value;
      stepValue = yStepValue.value;
      speed = ySpeed.value;
      isMinLimitReached = isYMinLimitReached.value;
      isMaxLimitReached = isYMaxLimitReached.value;
    } else if (axisRole === 'u') {
      if (!isConnected.value || !uAxisName.value) return;
      axisName = uAxisName.value;
      stepValue = uStepValue.value;
      speed = uSpeed.value;
      isMinLimitReached = isUMinLimitReached.value;
      isMaxLimitReached = isUMaxLimitReached.value;
    } else {
      return; // 未知轴类型
    }
    
    // 检查是否会超出限制
    if (direction < 0 && isMinLimitReached) return;
    if (direction > 0 && isMaxLimitReached) return;
    
    // 获取DOM中的步进值（如有必要）
    const stepSelectId = `${axisRole}-step-select`;
    const stepSelect = document.getElementById(stepSelectId);
    if (stepSelect) {
      stepValue = parseFloat(stepSelect.value);
    }
    
    // 执行点动，对U轴特殊处理
    if (axisRole === 'u') {
      await axisStore.jogAxis(axisName, direction, stepValue, speed, uUnitMode.value);
    } else {
      await axisStore.jogAxis(axisName, direction, stepValue, speed);
    }
  }
  
  // X轴点动控制 - 调用通用函数
  async function performXJog(direction) {
    performAxisJog('x', direction);
  }
  
  // Y轴点动控制 - 调用通用函数
  async function performYJog(direction) {
    performAxisJog('y', direction);
  }
  
  // U轴点动控制 - 调用通用函数
  async function performUJog(direction) {
    performAxisJog('u', direction);
  }

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
        templateImageSrc: null,
        threshold: 0.7
      };
    }
    
    // 设置选中的轴和对应的ID
    const axisMapping = {
      X: assignedX.value,
      Y: assignedY.value,
      U: assignedU.value
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
  
  // Mark点方式变更处理
  function onMarkMethodChange(e) {
    calibrationStore.setMarkMethod(e.target.value);
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

  // 重置标定结果
  function resetCalibration() {
    if (!isConnected.value || isCalibrating.value) return;
    
    calibrationStore.resetCalibration();
    showMessage('标定结果已重置', 'info');
  }

  const showSaveMatrixDialog = ref(false);
  const matrixName = ref('');

  function openSaveMatrixDialog() {
    matrixName.value = '';
    showSaveMatrixDialog.value = true;
  }
  function closeSaveMatrixDialog() {
    showSaveMatrixDialog.value = false;
  }
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
  .panel-section {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
  }
  
  .control-group {
    width: 100%;
    max-width: 100%;
  }
  
  .axis-control-section {
    width: 100%;
    margin: 0;
    padding: 0;
  }
  
  .axes-selection-row {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-bottom: 10px;
    gap: 8px;
  }
  
  .axes-params-section {
    width: 100%;
    margin-bottom: 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .axis-params {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
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
  
  /* 步进选择器 - 使用更高特异性和!important覆盖全局样式 */
  .control-item.side-by-side .step-select,
  .axis-position-control + .step-select {
    width: 45px !important;
    min-width: 45px !important;
    max-width: 45px !important;
    padding-right: 15px !important;
    background-position: right 2px center !important;
    margin-left: 8px !important;
    font-size: 12px !important;
  }
  
  /* 轴位置控制 */
  .axis-position-control {
    display: flex;
    align-items: center;
    gap: 5px;
    flex: 1;
    height: 28px;
  }
  
  /* 按钮样式 */
.jog-btn {
  width: 28px;
  height: 28px;
  border-radius: 3px;
  border: 1px solid #444;
  background-color: #313335;
  color: var(--accent-blue, #1890ff);
  cursor: pointer;
  font-weight: bold;
  padding: 0;
  line-height: 26px;
  flex-shrink: 0;
  font-size: 16px;
}

.jog-btn:hover:not(:disabled) {
  background-color: #4c4c4c;
}

.jog-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
  
  /* 位置显示容器 */
  .position-display-container {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
  }
  
  /* 速度显示容器 */
  .speed-display-container {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
  }
  
  .position-display-container input {
    width: 100%;
    height: 28px;
    padding: 0 35px 0 5px;
    text-align: right;
    background-color: #2b2b2b;
    color: #fff;
    border: 1px solid #444;
    border-radius: 3px;
  }
  
  .unit-display {
    position: absolute;
    right: 8px;
    font-size: 12px;
    color: #bbb;
    cursor: pointer;
    z-index: 1;
  }
  
  /* 速度单位显示 */
  .speed-unit {
    right: 8px;
    pointer-events: none;
  }
  
  .unit-display:hover {
    color: #fff;
  }
  
  /* 数字输入框 */
  input[type="number"] {
    height: 28px;
    padding: 0 35px 0 5px;
    text-align: left;
    background-color: #2b2b2b;
    color: #fff;
    border: 1px solid #444;
    border-radius: 3px;
    flex: 1;
  }
  
  /* 速度输入 */
  .speed-input {
    width: 100%;
  }
  
  /* 标定矩阵和其他控件 */
  .calibration-buttons-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
    width: 100%;
  }
  
  .status-container {
    width: 100%;
    margin-bottom: 10px;
  }
  
  .result-actions-row {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
    width: 100%;
  }
  
  /* 按钮样式统一 */
  button {
    border: 1px solid #444;
    border-radius: 3px;
    padding: 5px 10px;
    cursor: pointer;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* 确保分隔线占据全宽 */
  .separator {
    width: 100%;
    margin: 10px 0;
    border: none;
    border-top: 1px solid #444;
  }

  /* Styles from MarkPointControl, adapted */
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

.calibration-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  margin-top: 10px;
  align-items: center;
}

.standard-input {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  text-align: left;
  background-color: var(--bg-medium);
  color: var(--text-light);
  border: 1px solid var(--border-dark);
  border-radius: var(--border-radius);
  font-size: 13px;
}

/* 数字输入框 */
input[type="number"].standard-input {
  -moz-appearance: textfield; /* Firefox */
  appearance: textfield; /* 标准属性 */
}

input[type="number"].standard-input::-webkit-inner-spin-button, 
input[type="number"].standard-input::-webkit-outer-spin-button { 
  -webkit-appearance: none;
  margin: 0;
}
  </style>