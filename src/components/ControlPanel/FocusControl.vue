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
          placeholder="请选择"
        />
        
        <!-- 使用新组件进行Z轴位置控制 -->
        <AxisPositionControl
          axisName="Z"
          :formattedPosition="formattedPosition"
          :unitDisplay="displayUnit"
          :isConnected="isConnected"
          :isMinLimitReached="isMinLimitReached"
          :isMaxLimitReached="isMaxLimitReached"
          :stepValue="stepValue"
          :stepOptions="stepOptions"
          @jog="performJog"
          @toggle-unit="toggleUnit"
          @update:stepValue="stepValue = $event"
        />

        <!-- 使用新组件进行Z轴速度控制 -->
        <AxisSpeedControl
          axisName="Z"
          :formattedSpeed="formattedSpeed"
          :unitDisplay="speedUnit"
          :stepValue="speedStep"
          :minValue="speedMin"
          :disabled="!isConnected || isFocusing"
          @update:speed="selectedSpeed = $event"
          @validate-speed="validateSpeedValue"
        />
        
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
  import AxisPositionControl from '../common/AxisPositionControl.vue';
  import AxisSpeedControl from '../common/AxisSpeedControl.vue';
  
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
  
  // Axis limits and positions
  const selectedAxisName = computed(() => {
    return axisStore.selectedAxisId ? axisStore.getAxisNameById(axisStore.selectedAxisId) : '';
  });
  
  const axisPosition = computed(() => {
    if (!selectedAxisName.value) return 0;
    return axisStore.positions[selectedAxisName.value] || 0;
  });
  
  const axisPositionEncoder = computed(() => {
    if (!selectedAxisName.value) return 0;
    return axisStore.positionsEncoder[selectedAxisName.value] || 0;
  });
  
  const formattedPosition = computed(() => {
    if (!isConnected.value || !selectedAxisName.value) return '--';
    
    const value = displayUnit.value === 'mm' ? axisPosition.value : axisPositionEncoder.value;
    return formatByUnit(value, displayUnit.value);
  });
  
  const formattedSpeed = computed(() => {
    return formatByUnit(selectedSpeed.value, displayUnit.value === 'mm' ? 'mm' : 'um');
  });
  
  const formattedRangeValue = computed(() => {
    return formatByUnit(rangeValue.value, displayUnit.value);
  });
  
  const formattedFocusStepValue = computed(() => {
    return formatByUnit(focusStepValue.value, displayUnit.value);
  });
  
  // Range and focus step min/step values
  const rangeMin = computed(() => displayUnit.value === 'mm' ? 0.1 : 100);
  const rangeStep = computed(() => displayUnit.value === 'mm' ? 0.1 : 100);
  const focusStepMin = computed(() => displayUnit.value === 'mm' ? 0.01 : 10);
  const focusStepStep = computed(() => displayUnit.value === 'mm' ? 0.01 : 10);
  
  // Axis limits
  const axisLimits = computed(() => {
    if (!selectedAxisName.value) return { min: 0, max: 100 };
    return axisStore.axisLimits[selectedAxisName.value] || { min: 0, max: 100 };
  });
  
  const axisLimitsEncoder = computed(() => {
    if (!selectedAxisName.value) return { min: 0, max: 100000 };
    return axisStore.axisLimitsEncoder[selectedAxisName.value] || { min: 0, max: 100000 };
  });
  
  const isMinLimitReached = computed(() => {
    if (!isConnected.value || !selectedAxisName.value) return true;
    
    if (displayUnit.value === 'mm') {
      return axisPosition.value - stepValue.value < axisLimits.value.min;
    } else {
      return axisPositionEncoder.value - stepValue.value < axisLimitsEncoder.value.min;
    }
  });
  
  const isMaxLimitReached = computed(() => {
    if (!isConnected.value || !selectedAxisName.value) return true;
    
    if (displayUnit.value === 'mm') {
      return axisPosition.value + stepValue.value > axisLimits.value.max;
    } else {
      return axisPositionEncoder.value + stepValue.value > axisLimitsEncoder.value.max;
    }
  });
  
  const availableFocusAxes = computed(() => {
    const calibrationIds = Object.values(axisStore.assignedCalibrationAxesIds);
    return axisStore.plcAxes.filter(axis => !calibrationIds.includes(axis.id));
  });
  
  // 方法
  async function performJog(direction) {
    if (!isConnected.value || !selectedAxisName.value) return;
    
    // 检查是否达到限位
    if ((direction < 0 && isMinLimitReached.value) || 
        (direction > 0 && isMaxLimitReached.value)) {
      return;
    }
    
    await axisStore.jogAxis(selectedAxisName.value, direction, stepValue.value, selectedSpeed.value);
  }
  
  // 验证速度输入
  function validateSpeedValue(event) {
    validateNumericInput(event, selectedSpeed, parseFloat(speedMin.value));
  }
  
  // 验证搜索范围输入
  function validateRangeValue(event) {
    validateNumericInput(event, rangeValue, parseFloat(rangeMin.value));
  }
  
  // 验证对焦步进输入
  function validateFocusStepValue(event) {
    validateNumericInput(event, focusStepValue, parseFloat(focusStepMin.value));
  }
  
  // 切换单位
  function toggleUnit() {
    axisStore.toggleUnit();
  }
  
  // 监听单位变更
  watch(() => axisStore.displayUnit, (newUnit, oldUnit) => {
    if (newUnit === oldUnit) return;
    
    // 当单位切换时，自动调整步进和速度值
    const oldStepValue = stepValue.value;
    const oldRangeValue = rangeValue.value;
    const oldFocusStepValue = focusStepValue.value;
    const oldSpeedValue = selectedSpeed.value;
    
    if (newUnit === 'mm') {
      // 从um到mm，除以1000
      stepValue.value = oldStepValue * 0.001;
      rangeValue.value = oldRangeValue * 0.001;
      focusStepValue.value = oldFocusStepValue * 0.001;
      selectedSpeed.value = oldSpeedValue * 0.001;
    } else {
      // 从mm到um，乘以1000
      stepValue.value = oldStepValue * 1000;
      rangeValue.value = oldRangeValue * 1000;
      focusStepValue.value = oldFocusStepValue * 1000;
      selectedSpeed.value = oldSpeedValue * 1000;
    }
  });
  
  // ROI相关方法
  function handleRoiVisibilityToggle() {
    roiStore.toggleRoiVisibility();
  }
  
  function handleRoiEdit() {
    if (isFocusing.value) {
      showMessage('正在对焦，无法编辑ROI', 'warning');
      return;
    }
    roiStore.startRoiSelection('focus');
  }
  
  function handleRoiClear() {
    if (isFocusing.value) {
      showMessage('正在对焦，无法清除ROI', 'warning');
      return;
    }
    roiStore.clearROI();
  }
  
  function handleShapeChange(shape) {
    roiStore.setRoiShape(shape);
  }
  
  function handleRoiConfirm() {
    if (roiStore.isDrawingROI) {
      roiStore.confirmROI();
    }
  }
  
  // 自动对焦相关方法
  async function startAutoFocus() {
    if (!isConnected.value || isFocusing.value || !selectedAxisName.value) return;
    
    const focusParams = {
      axisName: selectedAxisName.value,
      range: rangeValue.value,
      stepSize: focusStepValue.value,
      speed: selectedSpeed.value,
      unit: displayUnit.value
    };
    
    try {
      const result = await focusStore.startAutoFocus(focusParams);
      if (result) {
        showMessage('自动对焦开始', 'success');
      } else {
        showMessage('开始自动对焦失败', 'error');
      }
    } catch (error) {
      showMessage(`自动对焦错误: ${error.message}`, 'error');
    }
  }
  
  async function stopAutoFocus() {
    if (!isConnected.value || !isFocusing.value) return;
    
    try {
      const result = await focusStore.stopAutoFocus();
      if (result) {
        showMessage('自动对焦已停止', 'warning');
      } else {
        showMessage('停止自动对焦失败', 'error');
      }
    } catch (error) {
      showMessage(`停止自动对焦错误: ${error.message}`, 'error');
    }
  }
  
  async function saveFocusPosition() {
    if (!isConnected.value || isFocusing.value || !selectedAxisName.value) return;
    
    try {
      const result = await focusStore.saveFocusPosition(selectedAxisName.value);
      if (result) {
        showMessage(`对焦位置已保存: ${formattedPosition.value} ${displayUnit.value}`, 'success');
      } else {
        showMessage('保存对焦位置失败', 'error');
      }
    } catch (error) {
      showMessage(`保存对焦位置错误: ${error.message}`, 'error');
    }
  }
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