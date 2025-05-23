<!-- src/components/ControlPanel/FocusControl.vue -->
<template>
    <div class="panel-section requires-connection">
      <hr class="separator">
      <h4>Z轴控制 / 对焦</h4>
      <div class="focus-section-container">
        <ZAxisSelector 
          label="对焦轴选择" 
          v-model="selectedFocusAxisId" 
          :axes="availableFocusAxes" 
          selectId="focus-axis-select" 
        />
        
        <!-- 当前轴位置显示和点动控制 -->
        <div class="control-item side-by-side">
          <label for="focus-axis-position">Z轴位置:</label>
          <div class="axis-position-control">
            <button 
              class="jog-btn minus" 
              id="focus-jog-minus" 
              :disabled="!isConnected || isMinLimitReached"
              @click="performJog(-1)"
            >-</button>
            <div class="position-display-container">
              <input 
                type="text" 
                id="focus-axis-position" 
                :value="formattedPosition" 
                readonly
              >
              <span 
                id="unit-display" 
                class="unit-display" 
                title="点击切换单位"
                @click="toggleUnit"
              >{{ displayUnit }}</span>
            </div>
            <button 
              class="jog-btn plus" 
              id="focus-jog-plus" 
              :disabled="!isConnected || isMaxLimitReached"
              @click="performJog(1)"
            >+</button>
          </div>
          <select 
            id="focus-step-select" 
            class="compact-select"
            v-model="stepValue"
          >
            <option v-for="option in stepOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <!-- Z轴速度显示 -->
        <div class="control-item side-by-side">
          <label for="focus-axis-speed">Z轴速度:</label>
          <div class="position-display-container">
            <input 
              type="number" 
              id="focus-axis-speed" 
              v-model="selectedSpeed"
              :step="speedStep" 
              :min="speedMin"
              :disabled="!isConnected || isFocusing"
            >
            <span class="unit-display">{{ speedUnit }}</span>
          </div>
        </div>
        
        <!-- 搜索范围和对焦步进输入框 -->
        <div class="control-item side-by-side">
          <label for="focus-range">搜索范围:</label>
          <div class="position-display-container">
            <input 
              type="number" 
              id="focus-range" 
              v-model="rangeValue"
              :step="rangeStep" 
              :min="rangeMin"
            >
            <span class="unit-display" id="range-unit-display">{{ displayUnit }}</span>
          </div>
        </div>
        <div class="control-item side-by-side">
          <label for="focus-step">对焦步进:</label>
          <div class="position-display-container">
            <input 
              type="number" 
              id="focus-step" 
              v-model="focusStepValue"
              :step="focusStepStep" 
              :min="focusStepMin"
            >
            <span class="unit-display" id="step-unit-display">{{ displayUnit }}</span>
          </div>
        </div>
  
        <!-- Focus ROI Controls -->
        <ROIControl 
          title="对焦ROI区域"
          purpose="focus"
          :disabled="!isConnected || isFocusing"
          @visibility-toggle="handleRoiVisibilityToggle"
          @edit="handleRoiEdit"
          @clear="handleRoiClear"
          @shape-change="handleShapeChange"
          @confirm="handleRoiConfirm"
        />
  
        <div class="control-item focus-controls">
          <button 
            id="start-focus-btn" 
            class="primary-button"
            @click="startAutoFocus"
            :disabled="!isConnected || isFocusing"
            v-show="!isFocusing"
          >
            <i class="fas fa-crosshairs"></i> 开始自动对焦
          </button>
          <button 
            id="stop-focus-btn" 
            class="danger-button"
            @click="stopAutoFocus"
            :disabled="!isConnected || !isFocusing"
            v-show="isFocusing"
          >
            <i class="fas fa-stop-circle"></i> 停止自动对焦
          </button>
          <button 
            id="save-focus-position-btn" 
            class="secondary-button"
            @click="saveFocusPosition"
            :disabled="!isConnected || isFocusing"
            v-show="!isFocusing"
          >
            <i class="fas fa-save"></i> 保存对焦位置
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch } from 'vue';
  import { useCameraStore } from '../../stores/camera';
  import { useAxisStore } from '../../stores/axis';
  import { useFocusStore } from '../../stores/focus';
  import { useRoiStore } from '../../stores/roi';
  import { showMessage } from '../../utils/helpers';
  import ZAxisSelector from './ZAxisSelector.vue';
  import ROIControl from './ROIControl.vue';
  
  const cameraStore = useCameraStore();
  const axisStore = useAxisStore();
  const focusStore = useFocusStore();
  const roiStore = useRoiStore();
  
  // 本地状态
  const stepValue = ref(100); // 默认100um步进
  const rangeValue = ref(5000); // 默认5000um范围
  const focusStepValue = ref(500); // 默认500um步进
  const selectedSpeed = ref(1000); // 默认速度1000 um/s
  
  // 计算属性
  const isConnected = computed(() => cameraStore.isConnected);
  const isFocusing = computed(() => focusStore.isFocusing);
  const displayUnit = computed(() => axisStore.displayUnit);
  const isDrawingROI = computed(() => roiStore.isDrawingROI);
  const roiEnabled = computed(() => roiStore.roiEnabled);
  
  // 速度相关计算属性
  const speedUnit = computed(() => {
    return displayUnit.value === 'mm' ? 'mm/s' : 'um/s';
  });
  
  const speedStep = computed(() => displayUnit.value === 'mm' ? '0.1' : '100');
  const speedMin = computed(() => displayUnit.value === 'mm' ? '0.1' : '10');
  
  // Use a computed property to get and set the focus axis ID from the store
  const selectedFocusAxisId = computed({
    get: () => axisStore.selectedAxisId,
    set: (id) => {
      // Before setting, ensure it's not used by calibration axes
      const calibrationIds = Object.values(axisStore.assignedCalibrationAxesIds);
      if (id && calibrationIds.includes(id)) {
        // Potentially show a message or prevent selection
        showMessage('该轴已在标定模块中使用，请先解除绑定。', 'warning');
        return; 
      }
      axisStore.selectedAxisId = id;
    }
  });

  // Filtered axes for focus, excluding those used in calibration
  const availableFocusAxes = computed(() => {
    const calibrationIds = Object.values(axisStore.assignedCalibrationAxesIds).filter(id => id !== '');
    return axisStore.plcAxes.filter(axis => !calibrationIds.includes(axis.id));
  });
  
  // 轴位置相关
  const selectedAxisName = computed(() => {
    return axisStore.getAxisNameById(selectedFocusAxisId.value) || 'Z'; // Use selectedFocusAxisId
  });
  
  const position = computed(() => {
    return axisStore.positions[selectedAxisName.value] || 0;
  });
  
  const positionEncoder = computed(() => {
    return axisStore.positionsEncoder[selectedAxisName.value] || 0;
  });
  
  const formattedPosition = computed(() => {
    if (!isConnected.value) return '--';
    
    if (displayUnit.value === 'mm') {
      return Math.abs(position.value).toFixed(3);
    } else {
      return Math.abs(Math.round(positionEncoder.value));
    }
  });
  
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
  
  // 搜索范围和步进参数
  const rangeStep = computed(() => displayUnit.value === 'mm' ? '0.1' : '100');
  const rangeMin = computed(() => displayUnit.value === 'mm' ? '0.1' : '100');
  const focusStepStep = computed(() => displayUnit.value === 'mm' ? '0.01' : '10');
  const focusStepMin = computed(() => displayUnit.value === 'mm' ? '0.001' : '1');
  
  // 轴限制
  const axisLimits = computed(() => {
    return axisStore.axisLimits[selectedAxisName.value] || { min: 0, max: 100 };
  });
  
  const axisLimitsEncoder = computed(() => {
    return axisStore.axisLimitsEncoder[selectedAxisName.value] || { min: 0, max: 100000 };
  });
  
  const isMinLimitReached = computed(() => {
    if (!isConnected.value) return true;
    
    if (displayUnit.value === 'mm') {
      return position.value - stepValue.value < axisLimits.value.min;
    } else {
      return positionEncoder.value - stepValue.value < axisLimitsEncoder.value.min;
    }
  });
  
  const isMaxLimitReached = computed(() => {
    if (!isConnected.value) return true;
    
    if (displayUnit.value === 'mm') {
      return position.value + stepValue.value > axisLimits.value.max;
    } else {
      return positionEncoder.value + stepValue.value > axisLimitsEncoder.value.max;
    }
  });
  
  // 方法  
  // 点动控制  
  async function performJog(direction) {    
    if (!isConnected.value) return;        
    
    // 确保从DOM中获取最新选择的步进值    
    const stepSelect = document.getElementById('focus-step-select');    
    const step = stepSelect ? parseFloat(stepSelect.value) : stepValue.value;        
    
    // 检查是否会超出限制    
    if (direction < 0 && isMinLimitReached.value) return;    
    if (direction > 0 && isMaxLimitReached.value) return;        
    
    // 执行点动，传递速度参数
    await axisStore.jogAxis(selectedAxisName.value, direction, step, selectedSpeed.value);        
    
    // 更新清晰度    
    if (selectedAxisName.value === 'Z') {      
      const isEncoder = displayUnit.value === 'um';      
      const z = isEncoder ? positionEncoder.value : position.value;      
      focusStore.clarity = focusStore.calculateClarity(z, isEncoder);    
    }  
  }
  
  // 切换单位
  function toggleUnit() {
    axisStore.toggleUnit();
  }
  
  // 开始自动对焦
  async function startAutoFocus() {
    if (!isConnected.value || isFocusing.value) return;
    
    const range = parseFloat(rangeValue.value);
    const step = parseFloat(focusStepValue.value);
    
    if (isNaN(range) || range <= 0) {
      showMessage('搜索范围必须大于0', 'error');
      return;
    }
    
    if (isNaN(step) || step <= 0) {
      showMessage('对焦步进必须大于0', 'error');
      return;
    }
    
    showMessage('自动对焦开始', 'info');
    
    // 创建一次性的watch来监听对焦状态
    const unwatch = watch(() => focusStore.focusCompleted, (newVal, oldVal) => {
      if (newVal && !oldVal) {
        // 对焦完成时
        showMessage('自动对焦已完成', 'success');
        unwatch(); // 移除监听器
      }
    });

    const result = await focusStore.startAutoFocus(range, step);
    
    if (!result) {
      showMessage('无法开始自动对焦', 'error');
      unwatch(); // 如果无法开始，也要移除监听器
    }
  }
  
  // 停止自动对焦
  async function stopAutoFocus() {
    if (!isConnected.value || !isFocusing.value) return;
    
    const result = await focusStore.stopAutoFocus();
    
    if (result) {
      showMessage('自动对焦已停止', 'warning');
    }
  }
  
  // 保存对焦位置
  async function saveFocusPosition() {
    if (!isConnected.value || isFocusing.value) return;
    
    const result = await focusStore.saveFocusPosition();
    
    if (result) {
      showMessage('对焦位置已保存', 'success');
    }
  }
  
  // ROI相关操作
  function handleRoiEdit(isDrawing) {
    if (!isConnected.value || isFocusing.value) return;
    // 消息显示已在ROIControl组件中处理
  }

  function handleRoiClear() {
    if (!isConnected.value || isFocusing.value) return;
    // 消息显示已在ROIControl组件中处理
  }

  function handleRoiVisibilityToggle(isVisible) {
    if (!isConnected.value || isFocusing.value) return;
    // 消息显示已在ROIControl组件中处理
  }

  function handleShapeChange(tool) {
    if (!isConnected.value || isFocusing.value) return;
    showMessage(`已切换ROI形状工具: ${tool}`, 'info');
  }

  function handleRoiConfirm() {
    if (!isConnected.value || isFocusing.value) return;
    showMessage('ROI区域已确认', 'success');
  }

  // 监听单位变更，调整步进和范围值
  watch(() => axisStore.displayUnit, (newUnit) => {
    if (newUnit === 'mm') {
      // 从um转到mm
      stepValue.value = 0.1;
      rangeValue.value = Number((parseFloat(rangeValue.value) / 1000).toFixed(3));
      focusStepValue.value = Number((parseFloat(focusStepValue.value) / 1000).toFixed(3));
      selectedSpeed.value = Number((parseFloat(selectedSpeed.value) / 1000).toFixed(3));
    } else {
      // 从mm转到um
      stepValue.value = 100;
      rangeValue.value = Math.round(parseFloat(rangeValue.value) * 1000);
      focusStepValue.value = Math.round(parseFloat(focusStepValue.value) * 1000);
      selectedSpeed.value = Math.round(parseFloat(selectedSpeed.value) * 1000);
    }
  });
  </script>
  
  <style scoped>
  /* 输入框文字左对齐 */
  input[type="number"] {
    text-align: left;
  }

  /* 移除下拉框的左边距 */
  .position-display-container .compact-select {
    margin-left: 0;
  }

  /* 使加减号按钮更贴近数字查看框 */
  .axis-position-control {
    gap: 0 !important;
  }

  .axis-position-control .jog-btn {
    border-radius: 0;
  }

  .axis-position-control .jog-btn.minus {
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
    border-right: none;
  }

  .axis-position-control .jog-btn.plus {
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
    border-left: none;
  }

  .axis-position-control .position-display-container {
    border-left: none;
    border-right: none;
  }

  /* 去掉输入框的圆角 */
  .axis-position-control .position-display-container input {
    border-radius: 0;
  }
  </style>