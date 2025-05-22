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
            <div class="control-item side-by-side">
              <label for="x-axis-select">X轴选择:</label>
              <select id="x-axis-select" class="compact-select" v-model="selectedX" :disabled="isCalibrating">
                <option value="">请选择</option>
                <option v-for="axis in availableXAxes" :key="axis.id" :value="axis.id">{{ axis.name }}</option>
              </select>
            </div>
            
            <div class="control-item side-by-side">
              <label for="y-axis-select">Y轴选择:</label>
              <select id="y-axis-select" class="compact-select" v-model="selectedY" :disabled="isCalibrating">
                <option value="">请选择</option>
                <option v-for="axis in availableYAxes" :key="axis.id" :value="axis.id">{{ axis.name }}</option>
              </select>
            </div>
            
            <div class="control-item side-by-side">
              <label for="u-axis-select">U轴选择:</label>
              <select id="u-axis-select" class="compact-select" v-model="selectedU" :disabled="isCalibrating">
                <option value="">无</option>
                <option v-for="axis in availableUAxes" :key="axis.id" :value="axis.id">{{ axis.name }}</option>
              </select>
            </div>
          </div>
          
          <!-- 轴参数区域 -->
          <div class="axes-params-section">
            <!-- X轴参数区域 -->
            <div v-if="selectedX" class="axis-params">
              <!-- X轴位置显示、点动、步进选择合并一行 -->
              <div class="axis-control-row">
                <label for="x-axis-position">X轴位置:</label>
                <div class="axis-position-control">
                  <button 
                    class="jog-btn minus" 
                    id="x-jog-minus" 
                    :disabled="!isConnected || isXMinLimitReached"
                    @click="performXJog(-1)"
                  >-</button>
                  <div class="position-display-container">
                    <input 
                      type="text" 
                      id="x-axis-position" 
                      :value="formattedXPosition" 
                      readonly
                    >
                    <span class="unit-display" title="点击切换单位" @click="toggleDisplayUnit">{{ displayUnit }}</span>
                  </div>
                  <button 
                    class="jog-btn plus" 
                    id="x-jog-plus" 
                    :disabled="!isConnected || isXMaxLimitReached"
                    @click="performXJog(1)"
                  >+</button>
                  <select 
                    id="x-step-select" 
                    class="compact-select step-select"
                    v-model="xStepValue"
                  >
                    <option v-for="option in stepOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </div>
              </div>
              
              <!-- X轴速度显示 -->
              <div class="control-item side-by-side">
                <label for="x-axis-speed">X轴速度:</label>
                <div class="position-display-container">
                  <input 
                    type="number" 
                    id="x-axis-speed" 
                    v-model="xSpeed"
                    :step="speedStep" 
                    :min="speedMin"
                    :disabled="!isConnected || isCalibrating"
                    class="speed-input"
                  >
                  <span class="unit-display speed-unit">{{ speedUnit }}</span>
                </div>
              </div>
            </div>
            
            <!-- Y轴参数区域 -->
            <div v-if="selectedY" class="axis-params">
              <div class="axis-control-row">
                <label for="y-axis-position">Y轴位置:</label>
                <div class="axis-position-control">
                  <button 
                    class="jog-btn minus" 
                    id="y-jog-minus" 
                    :disabled="!isConnected || isYMinLimitReached"
                    @click="performYJog(-1)"
                  >-</button>
                  <div class="position-display-container">
                    <input 
                      type="text" 
                      id="y-axis-position" 
                      :value="formattedYPosition" 
                      readonly
                    >
                    <span class="unit-display" title="点击切换单位" @click="toggleDisplayUnit">{{ displayUnit }}</span>
                  </div>
                  <button 
                    class="jog-btn plus" 
                    id="y-jog-plus" 
                    :disabled="!isConnected || isYMaxLimitReached"
                    @click="performYJog(1)"
                  >+</button>
                  <select 
                    id="y-step-select" 
                    class="compact-select step-select"
                    v-model="yStepValue"
                  >
                    <option v-for="option in stepOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </div>
              </div>
              
              <!-- Y轴速度显示 -->
              <div class="control-item side-by-side">
                <label for="y-axis-speed">Y轴速度:</label>
                <div class="position-display-container">
                  <input 
                    type="number" 
                    id="y-axis-speed" 
                    v-model="ySpeed"
                    :step="speedStep" 
                    :min="speedMin"
                    :disabled="!isConnected || isCalibrating"
                    class="speed-input"
                  >
                  <span class="unit-display speed-unit">{{ speedUnit }}</span>
                </div>
              </div>
            </div>
            
            <!-- U轴参数区域 -->
            <div v-if="selectedU" class="axis-params">
              <div class="axis-control-row">
                <label for="u-axis-position">U轴位置:</label>
                <div class="axis-position-control">
                  <button 
                    class="jog-btn minus" 
                    id="u-jog-minus" 
                    :disabled="!isConnected || isUMinLimitReached"
                    @click="performUJog(-1)"
                  >-</button>
                  <div class="position-display-container">
                    <input 
                      type="text" 
                      id="u-axis-position" 
                      :value="formattedUPosition" 
                      readonly
                    >
                    <span class="unit-display" title="点击切换单位" @click="toggleUDisplayUnit">{{ uDisplayUnit }}</span>
                  </div>
                  <button 
                    class="jog-btn plus" 
                    id="u-jog-plus" 
                    :disabled="!isConnected || isUMaxLimitReached"
                    @click="performUJog(1)"
                  >+</button>
                  <select 
                    id="u-step-select" 
                    class="compact-select step-select"
                    v-model="uStepValue"
                  >
                    <option v-for="option in uStepOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </div>
              </div>
              
              <!-- U轴速度显示 -->
              <div class="control-item side-by-side">
                <label for="u-axis-speed">U轴速度:</label>
                <div class="position-display-container">
                  <input 
                    type="number" 
                    id="u-axis-speed" 
                    v-model="uSpeed"
                    :step="uSpeedStep" 
                    :min="uSpeedMin"
                    :disabled="!isConnected || isCalibrating"
                    class="speed-input"
                  >
                  <span class="unit-display speed-unit">{{ uSpeedUnit }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
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
        
        <!-- Mark点方式选择和图片显示 -->
        <div class="control-item side-by-side" v-if="selectedX && selectedY">
          <label for="mark-method">Mark点方式:</label>
          <select id="mark-method" class="compact-select" v-model="calibrationStore.markMethod" @change="onMarkMethodChange">
            <option value="template">模板匹配</option>
            <option value="circle">圆形检测</option>
            <option value="cross">十字检测</option>
          </select>
          <img v-if="calibrationStore.markPreviewImg" :src="calibrationStore.markPreviewImg" alt="Mark点示例" style="height:32px;margin-left:8px;border-radius:4px;" />
        </div>
      </div>
      
      <!-- 标定操作按钮区域 -->
      <div class="calibration-buttons-group">
        <button 
          id="detect-mark-btn" 
          class="primary-button"
          @click="detectMarkPoint"
          :disabled="!isConnected || isCalibrating || !canStartCalibration"
        >
          <i class="fas fa-crosshairs"></i> 检测Mark点
        </button>
        <button 
          id="center-mark-btn" 
          class="primary-button"
          @click="centerMarkPoint"
          :disabled="!isConnected || isCalibrating || !markDetected || !canStartCalibration"
        >
          <i class="fas fa-compress-arrows-alt"></i> 居中Mark点
        </button>
        <button 
          id="start-calib-btn" 
          class="primary-button"
          @click="startCalibration"
          :disabled="!isConnected || isCalibrating || !markCentered || !canStartCalibration"
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
  import { ref, computed, watch } from 'vue';
  import { useCameraStore } from '../../stores/camera';
  import { useFocusStore } from '../../stores/focus';
  import { useCalibrationStore } from '../../stores/calibration';
  import { useAxisStore } from '../../stores/axis';
  import { showMessage } from '../../utils/helpers';
  
  const cameraStore = useCameraStore();
  const focusStore = useFocusStore();
  const calibrationStore = useCalibrationStore();
  const axisStore = useAxisStore();
  
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
  
  // 本地状态
  const selectedX = ref('');
  const selectedY = ref('');
  const selectedU = ref('');
  
  // 可用的轴选择（确保不重复选择）
  const availableXAxes = computed(() => {
    return plcAxes.value.filter(axis => 
      axis.id !== selectedY.value && axis.id !== selectedU.value
    );
  });
  
  const availableYAxes = computed(() => {
    return plcAxes.value.filter(axis => 
      axis.id !== selectedX.value && axis.id !== selectedU.value
    );
  });
  
  const availableUAxes = computed(() => {
    return plcAxes.value.filter(axis => 
      axis.id !== selectedX.value && axis.id !== selectedY.value
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
    return selectedX.value ? axisStore.getAxisNameById(selectedX.value) : '';
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
    
    if (displayUnit.value === 'mm') {
      return Math.abs(xPosition.value).toFixed(3);
    } else {
      return Math.abs(Math.round(xPositionEncoder.value));
    }
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
    return selectedY.value ? axisStore.getAxisNameById(selectedY.value) : '';
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
    
    if (displayUnit.value === 'mm') {
      return Math.abs(yPosition.value).toFixed(3);
    } else {
      return Math.abs(Math.round(yPositionEncoder.value));
    }
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
    return selectedU.value ? axisStore.getAxisNameById(selectedU.value) : '';
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
    
    if (displayUnit.value === 'mm') {
      return Math.abs(uPosition.value).toFixed(3);
    } else {
      return Math.abs(Math.round(uPositionEncoder.value));
    }
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
    return selectedX.value && selectedY.value && selectedX.value !== selectedY.value &&
           (!selectedU.value || (selectedU.value !== selectedX.value && selectedU.value !== selectedY.value));
  });
  
  // 监听轴选择变化
  watch([selectedX, selectedY, selectedU], () => {
    const axes = [];
    if (selectedX.value) axes.push('X');
    if (selectedY.value) axes.push('Y');
    if (selectedU.value) axes.push('U');
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
  // X轴点动控制
  async function performXJog(direction) {
    if (!isConnected.value || !xAxisName.value) return;
    
    // 确保从DOM中获取最新选择的步进值
    const stepSelect = document.getElementById('x-step-select');
    const step = stepSelect ? parseFloat(stepSelect.value) : xStepValue.value;
    
    // 检查是否会超出限制
    if (direction < 0 && isXMinLimitReached.value) return;
    if (direction > 0 && isXMaxLimitReached.value) return;
    
    // 执行点动，传递速度参数
    await axisStore.jogAxis(xAxisName.value, direction, step, xSpeed.value);
  }
  
  // Y轴点动控制
  async function performYJog(direction) {
    if (!isConnected.value || !yAxisName.value) return;
    
    // 确保从DOM中获取最新选择的步进值
    const stepSelect = document.getElementById('y-step-select');
    const step = stepSelect ? parseFloat(stepSelect.value) : yStepValue.value;
    
    // 检查是否会超出限制
    if (direction < 0 && isYMinLimitReached.value) return;
    if (direction > 0 && isYMaxLimitReached.value) return;
    
    // 执行点动，传递速度参数
    await axisStore.jogAxis(yAxisName.value, direction, step, ySpeed.value);
  }
  
  // U轴点动控制
  async function performUJog(direction) {
    if (!isConnected.value || !uAxisName.value) return;
    
    // 确保从DOM中获取最新选择的步进值
    const stepSelect = document.getElementById('u-step-select');
    const step = stepSelect ? parseFloat(stepSelect.value) : uStepValue.value;
    
    // 检查是否会超出限制
    if (direction < 0 && isUMinLimitReached.value) return;
    if (direction > 0 && isUMaxLimitReached.value) return;
    
    // 执行点动，传递速度参数
    await axisStore.jogAxis(uAxisName.value, direction, step, uSpeed.value, uUnitMode.value);
  }
  
  // 检测Mark点
  async function detectMarkPoint() {
    if (!isConnected.value || isCalibrating.value || !canStartCalibration.value) return;
    
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
    if (!isConnected.value || !markDetected.value || isCalibrating.value || !canStartCalibration.value) return;
    
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
    if (!isConnected.value || !markCentered.value || isCalibrating.value || !canStartCalibration.value) return;
    
    // 设置选中的轴和对应的ID
    const axisMapping = {
      X: selectedX.value,
      Y: selectedY.value,
      U: selectedU.value
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
  </style>