<!-- src/components/ControlPanel/AxisSelector.vue -->
<template>
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
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAxisStore } from '../../stores/axis';
import { showMessage } from '../../utils/helpers';
import ZAxisSelector from './ZAxisSelector.vue';

const props = defineProps({
  isCalibrating: {
    type: Boolean,
    default: false
  }
});

const axisStore = useAxisStore();

// Get assigned axes from store for readability
const assignedX = computed(() => axisStore.assignedCalibrationAxesIds.x);
const assignedY = computed(() => axisStore.assignedCalibrationAxesIds.y);
const assignedU = computed(() => axisStore.assignedCalibrationAxesIds.u);

// Handler for axis selection
function handleAxisSelection(role, axisId) {
  // Prevent assigning an ID that is the current focus axis
  if (axisId && axisId === axisStore.selectedAxisId) {
    showMessage('该轴已在对焦模块中使用，请先解除绑定。', 'warning');
    return;
  }
  axisStore.setAssignedCalibrationAxis(role, axisId);
}

// 可用的轴选择（确保不重复选择）
const availableXAxes = computed(() => {
  const otherSelectedCalibrationAxes = [assignedY.value, assignedU.value].filter(id => id !== '');
  const focusAxisId = axisStore.selectedAxisId;
  return axisStore.plcAxes.filter(axis => 
    axis.id !== focusAxisId && 
    !otherSelectedCalibrationAxes.includes(axis.id)
  );
});

const availableYAxes = computed(() => {
  const otherSelectedCalibrationAxes = [assignedX.value, assignedU.value].filter(id => id !== '');
  const focusAxisId = axisStore.selectedAxisId;
  return axisStore.plcAxes.filter(axis => 
    axis.id !== focusAxisId && 
    !otherSelectedCalibrationAxes.includes(axis.id)
  );
});

const availableUAxes = computed(() => {
  const otherSelectedCalibrationAxes = [assignedX.value, assignedY.value].filter(id => id !== '');
  const focusAxisId = axisStore.selectedAxisId;
  return axisStore.plcAxes.filter(axis => 
    axis.id !== focusAxisId && 
    !otherSelectedCalibrationAxes.includes(axis.id)
  );
});

// 导出变量使父组件可访问
defineExpose({
  assignedX,
  assignedY,
  assignedU
});
</script>

<style scoped>
.axes-selection-row {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 8px;
  gap: 8px;
}
</style> 