<!-- src/components/ControlPanel/AxisParameters.vue -->
<template>
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
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useAxisStore } from '../../stores/axis';
import { useCameraStore } from '../../stores/camera';
import { formatByUnit, validateNumericInput } from '../../utils/inputHelpers';
import AxisPositionControl from '../common/AxisPositionControl.vue';
import AxisSpeedControl from '../common/AxisSpeedControl.vue';

const props = defineProps({
  assignedX: {
    type: String,
    default: ''
  },
  assignedY: {
    type: String,
    default: ''
  },
  assignedU: {
    type: String,
    default: ''
  },
  isCalibrating: {
    type: Boolean,
    default: false
  }
});

const cameraStore = useCameraStore();
const axisStore = useAxisStore();

// 基础状态
const isConnected = computed(() => cameraStore.isConnected);
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

// 步进和速度参数
const xStepValue = ref(axisStore.displayUnit === 'mm' ? 0.1 : 100);
const yStepValue = ref(axisStore.displayUnit === 'mm' ? 0.1 : 100);
const uStepValue = ref(0.1); // 默认0.1度
const xSpeed = ref(axisStore.displayUnit === 'mm' ? 1.0 : 1000);
const ySpeed = ref(axisStore.displayUnit === 'mm' ? 1.0 : 1000);
const uSpeed = ref(5.0); // 默认5度/秒

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

// X轴相关计算属性
const xAxisName = computed(() => {
  return props.assignedX ? axisStore.getAxisNameById(props.assignedX) : '';
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
  return props.assignedY ? axisStore.getAxisNameById(props.assignedY) : '';
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
  return props.assignedU ? axisStore.getAxisNameById(props.assignedU) : '';
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
</script>

<style scoped>
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
</style> 