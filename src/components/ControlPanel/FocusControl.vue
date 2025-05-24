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
              :value="formattedSpeed"
              @input="selectedSpeed = $event.target.value"
              @blur="validateSpeedValue"
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
              :value="formattedRangeValue"
              @input="rangeValue = $event.target.value"
              @blur="validateRangeValue"
              :step="rangeStep" 
              :min="rangeMin"
              :disabled="!isConnected || isFocusing"
            >
            <span class="unit-display">{{ displayUnit }}</span>
          </div>
        </div>
        
        <div class="control-item side-by-side">
          <label for="focus-step">对焦步进:</label>
          <div class="position-display-container">
            <input 
              type="number" 
              id="focus-step" 
              :value="formattedFocusStepValue"
              @input="focusStepValue = $event.target.value"
              @blur="validateFocusStepValue"
              :step="focusStepStep" 
              :min="focusStepMin"
              :disabled="!isConnected || isFocusing"
            >
            <span class="unit-display">{{ displayUnit }}</span>
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
          <ActionButton 
            v-if="!isFocusing"
            text="开始自动对焦"
            type="primary"
            iconClass="fas fa-crosshairs"
            :disabled="!isConnected || isFocusing"
            @click="startAutoFocus"
          />
          <ActionButton 
            v-else
            text="停止自动对焦"
            type="danger"
            iconClass="fas fa-stop-circle"
            :disabled="!isConnected || !isFocusing"
            @click="stopAutoFocus"
          />
          <ActionButton 
            v-if="!isFocusing"
            text="保存对焦位置"
            type="secondary"
            iconClass="fas fa-save"
            :disabled="!isConnected || isFocusing"
            @click="saveFocusPosition"
          />
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
  import { 
    formatByUnit, 
    validateNumericInput, 
    isAxisLimitReached, 
    adjustValuesByUnit 
  } from '../../utils/inputHelpers';
  import ZAxisSelector from './ZAxisSelector.vue';
  import ROIControl from './ROIControl.vue';
  import ValueInputControl from '../common/ValueInputControl.vue';
  import ActionButton from '../common/ActionButton.vue';
  
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
  
  // 使用通用格式化函数
  const formattedPosition = computed(() => {
    if (!isConnected.value) return '--';
    const value = displayUnit.value === 'mm' ? position.value : positionEncoder.value;
    return formatByUnit(Math.abs(value), displayUnit.value);
  });
  
  const formattedRangeValue = computed(() => formatByUnit(rangeValue.value, displayUnit.value));
  const formattedFocusStepValue = computed(() => formatByUnit(focusStepValue.value, displayUnit.value));
  const formattedSpeed = computed(() => formatByUnit(selectedSpeed.value, displayUnit.value));
  
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
  
  // 轴限制相关
  const axisLimits = computed(() => {
    return axisStore.axisLimits[selectedAxisName.value] || { min: 0, max: 100 };
  });
  
  const axisLimitsEncoder = computed(() => {
    return axisStore.axisLimitsEncoder[selectedAxisName.value] || { min: 0, max: 100000 };
  });
  
  // 使用工具函数计算轴限制
  const isMinLimitReached = computed(() => {
    const currentPos = displayUnit.value === 'mm' ? position.value : positionEncoder.value;
    const limits = displayUnit.value === 'mm' ? axisLimits.value : axisLimitsEncoder.value;
    return isAxisLimitReached(isConnected.value, currentPos, stepValue.value, limits, -1);
  });
  
  const isMaxLimitReached = computed(() => {
    const currentPos = displayUnit.value === 'mm' ? position.value : positionEncoder.value;
    const limits = displayUnit.value === 'mm' ? axisLimits.value : axisLimitsEncoder.value;
    return isAxisLimitReached(isConnected.value, currentPos, stepValue.value, limits, 1);
  });
  
  // 使用工具函数验证输入
  function validateRangeValue(event) {
    validateNumericInput(event, rangeValue, parseFloat(rangeMin.value));
  }
  
  function validateFocusStepValue(event) {
    validateNumericInput(event, focusStepValue, parseFloat(focusStepMin.value));
  }
  
  function validateSpeedValue(event) {
    validateNumericInput(event, selectedSpeed, parseFloat(speedMin.value));
  }
  
  // 方法  
  // 点动控制  
  async function performJog(direction) {    
    if (!isConnected.value) return;        
    
    // 获取当前位置和限制
    const currentPos = displayUnit.value === 'mm' ? position.value : positionEncoder.value;
    const limits = displayUnit.value === 'mm' ? axisLimits.value : axisLimitsEncoder.value;
    
    // 检查是否会超出限制
    if (isAxisLimitReached(isConnected.value, currentPos, stepValue.value, limits, direction)) {
      return;
    }
    
    // 执行点动，传递速度参数
    await axisStore.jogAxis(selectedAxisName.value, direction, stepValue.value, selectedSpeed.value);        
    
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

  // 监听单位变更，使用工具函数调整步进和范围值
  watch(() => axisStore.displayUnit, (newUnit) => {
    // 设置默认值
    const defaults = {
      stepValue: { mm: 0.1, um: 100 },
      rangeValue: { mm: 5.0, um: 5000 },
      focusStepValue: { mm: 0.5, um: 500 },
      selectedSpeed: { mm: 1.0, um: 1000 }
    };
    
    // 获取当前值
    const currentValues = {
      stepValue: stepValue.value,
      rangeValue: rangeValue.value,
      focusStepValue: focusStepValue.value,
      selectedSpeed: selectedSpeed.value
    };
    
    // 调整值
    const newValues = adjustValuesByUnit(currentValues, newUnit, defaults);
    
    // 更新各个值
    stepValue.value = newValues.stepValue;
    rangeValue.value = newValues.rangeValue;
    focusStepValue.value = newValues.focusStepValue;
    selectedSpeed.value = newValues.selectedSpeed;
  });
  </script>
  
  <style scoped>
  /* 这些样式已从全局样式表(styles.css)中提取，实现了组件样式的模块化 */

  /* 输入框文字左对齐 */
  input[type="number"] {
    text-align: left;
  }

  /* 焦点控制部分容器 */
  .focus-section-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;
  }

  /* 控制项行样式 */
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

  .control-item.side-by-side label {
    flex-shrink: 0;
    min-width: 80px;
    width: 80px;
    color: var(--text-medium);
    font-size: .9em;
    margin-bottom: 0;
    white-space: nowrap;
  }

  /* 轴位置控制相关样式 */
  .axis-position-control {
    display: flex;
    align-items: center;
    gap: 0 !important;
    flex: 1;
    height: 32px;
    background: none;
    border: none;
    margin-right: 8px;
  }

  .position-display-container {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    height: 32px;
    border-left: none;
    border-right: none;
  }

  .position-display-container input {
    width: 100%;
    height: 32px;
    padding: 0 30px 0 8px;
    text-align: left;
    background-color: var(--bg-medium);
    color: var(--text-light);
    border: 1px solid var(--border-dark);
    border-radius: 0;
    font-size: 13px;
    box-sizing: border-box;
  }

  .unit-display {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    color: #bbb;
    background-color: rgba(61, 61, 61, .8);
    border-radius: 3px;
    padding: 1px 4px;
    cursor: pointer;
    z-index: 1;
    user-select: none;
    transition: background 0.2s, color 0.2s;
  }

  .unit-display:hover {
    color: #fff;
    background-color: #555;
  }

  /* 点动按钮样式 */
  .jog-btn {
    width: 32px;
    height: 32px;
    border-radius: 0;
    border: 1px solid var(--border-dark);
    background-color: var(--bg-medium);
    color: var(--accent-blue);
    cursor: pointer;
    font-weight: bold;
    padding: 0;
    line-height: 30px;
    flex-shrink: 0;
    font-size: 16px;
    transition: background 0.15s, color 0.15s;
  }

  .jog-btn:hover:not(:disabled) {
    background-color: #4a4a4a;
    color: #fff;
  }

  .jog-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    color: var(--text-medium);
  }

  .jog-btn.plus {
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
    border-left: 1px solid var(--border-dark);
  }

  .jog-btn.minus {
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
    border-right: none;
  }

  /* 下拉选择框样式 */
  .compact-select {
    border: 1px solid var(--border-medium);
    border-radius: 3px;
    font-size: .9em;
    padding: 4px 8px;
    height: 32px;
    background-color: var(--bg-medium);
    color: var(--text-light);
    appearance: none;
    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23b0b0b0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E");
    background-position: right 4px center;
    background-repeat: no-repeat;
    background-size: .65em auto;
    margin-left: 8px;
  }

  /* 移除下拉框的左边距 */
  .position-display-container .compact-select {
    margin-left: 0;
  }

  /* 对焦控制按钮样式 */
  .focus-controls {
    display: flex;
    flex-direction: row !important;
    gap: 8px;
    margin-top: 8px;
  }

  .focus-controls button {
    align-items: center;
    border: none;
    border-radius: 4px;
    display: flex;
    flex: 1;
    font-weight: 400;
    height: 32px;
    justify-content: center;
    transition: all .2s ease;
  }

  .focus-controls button i {
    margin-right: 5px;
  }

  .focus-controls .primary-button {
    background-color: var(--accent-blue);
    color: #fff;
  }

  .focus-controls .secondary-button {
    background-color: #4a90e2;
    color: #fff;
  }

  .focus-controls .danger-button {
    background-color: var(--accent-red);
    color: #fff;
  }

  .focus-controls button:hover:not(:disabled) {
    box-shadow: 0 2px 4px rgba(0, 0, 0, .2);
    transform: translateY(-1px);
  }

  .focus-controls .primary-button:hover:not(:disabled),
  .focus-controls .secondary-button:hover:not(:disabled) {
    background-color: #3a80d2;
  }

  .focus-controls .danger-button:hover:not(:disabled) {
    background-color: #d94c4c;
  }

  /* 只读输入框样式 */
  input:read-only {
    background-color: #4a4a4a;
    cursor: default;
  }
  </style>