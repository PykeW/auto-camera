<!-- src/components/ControlPanel/CalibrationControl.vue -->
<template>
    <div class="panel-section requires-connection">
      <hr class="separator">
      
      <!-- 相机标定模块 -->
      <h4 class="section-title"><i class="fas fa-camera-retro"></i> 相机标定</h4>
      
      <!-- 标定参数配置区域 -->
      <div class="control-group">
        <div class="control-item side-by-side">
          <label for="matrix-size">矩阵大小:</label>
          <select id="matrix-size" class="compact-select" v-model="matrixSize">
            <option value="3" selected>3×3</option>
            <option value="5">5×5</option>
            <option value="7">7×7</option>
            <option value="9">9×9</option>
          </select>
        </div>
        <div class="control-item side-by-side">
          <label for="point-offset">点位偏移(mm):</label>
          <input type="number" id="point-offset" v-model="pointOffset" step="0.1" min="0.1">
        </div>
        <div class="control-item side-by-side">
          <label for="mark-size">Mark点尺寸(mm):</label>
          <input type="number" id="mark-size" v-model="markSize" step="0.1" min="0.1">
        </div>
      </div>
      
      <!-- 标定操作按钮区域 -->
      <div class="calibration-buttons-group">
        <button 
          id="detect-mark-btn" 
          class="primary-button"
          @click="detectMarkPoint"
          :disabled="!isConnected || isCalibrating"
        >
          <i class="fas fa-crosshairs"></i> 检测Mark点
        </button>
        <button 
          id="center-mark-btn" 
          class="primary-button"
          @click="centerMarkPoint"
          :disabled="!isConnected || isCalibrating || !markDetected"
        >
          <i class="fas fa-compress-arrows-alt"></i> 居中Mark点
        </button>
        <button 
          id="start-calib-btn" 
          class="primary-button"
          @click="startCalibration"
          :disabled="!isConnected || isCalibrating || !markCentered"
        >
          <i class="fas fa-play-circle"></i> 开始标定
        </button>
        <button 
          id="stop-calib-btn" 
          class="danger-button"
          @click="stopCalibration"
          :disabled="!isConnected || !isCalibrating"
        >
          <i class="fas fa-stop-circle"></i> 停止标定
        </button>
      </div>
      
      <!-- 标定进度与状态区域 -->
      <div class="status-container">
        <div class="status-row">
          <label>标定状态:</label>
          <span id="calibration-status" class="status-chip">{{ calibrationStatus }}</span>
        </div>
        <div class="status-row">
          <label>当前点位:</label>
          <span id="current-point" class="status-chip">{{ currentPointText }}</span>
        </div>
        <div class="progress-row">
          <label>进度:</label>
          <div class="progress-bar">
            <div 
              id="calibration-progress" 
              class="progress" 
              :style="{ width: calibrationProgress + '%' }"
            >{{ calibrationProgress }}%</div>
          </div>
        </div>
      </div>
      
      <!-- 结果操作按钮 -->
      <div class="result-actions-row">
        <button 
          id="export-matrix-btn" 
          class="secondary-button"
          :disabled="!hasCalibrationResult"
        >
          <i class="fas fa-file-export"></i> 导出矩阵
        </button>
        <button 
          id="view-results-btn" 
          class="secondary-button"
          :disabled="!hasCalibrationResult"
        >
          <i class="fas fa-search"></i> 查看详细结果
        </button>
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
      <div class="control-item">
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
  import { computed } from 'vue';
  import { useCameraStore } from '../../stores/camera';
  import { useFocusStore } from '../../stores/focus';
  import { useCalibrationStore } from '../../stores/calibration';
  import { showMessage } from '../../utils/helpers';
  
  const cameraStore = useCameraStore();
  const focusStore = useFocusStore();
  const calibrationStore = useCalibrationStore();
  
  // 计算属性
  const isConnected = computed(() => cameraStore.isConnected);
  const isFocusing = computed(() => focusStore.isFocusing);
  const isCalibrating = computed(() => calibrationStore.isCalibrating);
  const markDetected = computed(() => calibrationStore.markDetected);
  const markCentered = computed(() => calibrationStore.markCentered);
  const calibrationProgress = computed(() => calibrationStore.calibrationProgress);
  const hasCalibrationResult = computed(() => !!calibrationStore.calibrationResult);
  
  const matrixSize = computed({
    get: () => calibrationStore.matrixSize,
    set: (value) => calibrationStore.matrixSize = parseInt(value)
  });
  
  const pointOffset = computed({
    get: () => calibrationStore.pointOffset,
    set: (value) => calibrationStore.pointOffset = parseFloat(value)
  });
  
  const markSize = computed({
    get: () => calibrationStore.markSize,
    set: (value) => calibrationStore.markSize = parseFloat(value)
  });
  
  const squareSize = computed({
    get: () => calibrationStore.squareSize,
    set: (value) => calibrationStore.squareSize = parseFloat(value)
  });
  
  const calibrationStatus = computed(() => {
    if (isCalibrating.value) return '标定中';
    if (hasCalibrationResult.value) return '已完成';
    if (markCentered.value) return '已居中Mark点';
    if (markDetected.value) return '已检测Mark点';
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
  
  // 方法
  // 检测Mark点
  async function detectMarkPoint() {
    if (!isConnected.value || isCalibrating.value) return;
    
    showMessage('正在检测Mark点...', 'info');
    
    const result = await calibrationStore.detectMarkPoint();
    
    if (result) {
      showMessage('Mark点检测成功', 'success');
    } else {
      showMessage('Mark点检测失败', 'error');
    }
  }
  
  // 居中Mark点
  async function centerMarkPoint() {
    if (!isConnected.value || !markDetected.value || isCalibrating.value) return;
    
    showMessage('正在居中Mark点...', 'info');
    
    const result = await calibrationStore.centerMarkPoint();
    
    if (result) {
      showMessage('Mark点已居中', 'success');
    } else {
      showMessage('居中Mark点失败', 'error');
    }
  }
  
  // 开始标定
  async function startCalibration() {
    if (!isConnected.value || !markCentered.value || isCalibrating.value) return;
    
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
  </script>