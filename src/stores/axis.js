// src/stores/axis.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useCameraStore } from './camera';

export const useAxisStore = defineStore('axis', () => {
  // 状态
  const positions = ref({
    X: 0.0,
    Y: 0.0,
    Z: 0.0,
    U: 0.0
  });
  
  const positionsEncoder = ref({
    X: 0,
    Y: 0,
    Z: 0,
    U: 0
  });
  
  const axisLimits = ref({
    X: { min: 0.0, max: 200.0 },
    Y: { min: 0.0, max: 200.0 },
    Z: { min: 0.0, max: 50.0 },
    U: { min: 0.0, max: 360.0 }
  });
  
  const axisLimitsEncoder = ref({
    X: { min: 0, max: 200000 },
    Y: { min: 0, max: 200000 },
    Z: { min: 0, max: 50000 },
    U: { min: 0, max: 360000 }
  });
  
  const axisMapping = ref({
    '1': 'X',
    '2': 'Y',
    '3': 'Z',
    '4': 'U'
  });
  
  const plcAxes = ref([
    { id: '1', name: '轴1', range_min: 0.0, range_max: 200.0 },
    { id: '2', name: '轴2', range_min: 0.0, range_max: 200.0 },
    { id: '3', name: '轴3', range_min: 0.0, range_max: 50.0 },
    { id: '4', name: '轴4', range_min: 0.0, range_max: 360.0 }
  ]);
  
  const selectedAxisId = ref('3'); // 默认选择Z轴
  const displayUnit = ref('um'); // 默认单位为微米
  const currentUnitScale = ref(1); // 1表示um, 1000表示mm
  
  // 计算属性
  const selectedAxisName = computed(() => {
    return axisMapping.value[selectedAxisId.value] || 'Z';
  });
  
  // 方法
  function initializePositions() {
    // 初始化轴位置（毫米值）
    positions.value.X = 5.0; // 5000um
    positions.value.Y = 6.0; // 6000um
    positions.value.Z = 7.0; // 7000um
    positions.value.U = 7.0; // 7000um（如需角度可再调整）
    
    // 初始化编码器值
    updateEncoderPositions();
  }
  
  function updateEncoderPositions() {
    for (const axis of ['X', 'Y', 'Z', 'U']) {
      positionsEncoder.value[axis] = Math.round(positions.value[axis] * 1000);
    }
  }
  
  function randomPosition(min, max) {
    return Math.round((min + Math.random() * (max - min)) * 1000) / 1000;
  }
  
  // 模拟轴移动
  async function jogAxis(axis, direction, step, speed = null) {
    const cameraStore = useCameraStore();
    if (!cameraStore.isConnected) return false;
    
    const stepValue = parseFloat(step);
    if (isNaN(stepValue)) return false;
    
    const currentPos = positions.value[axis];
    const limits = axisLimits.value[axis];
    
    // 计算新位置，根据当前单位进行转换
    let adjustedStep = displayUnit.value === 'um' ? stepValue / 1000 : stepValue;
    let newPos = currentPos + adjustedStep * direction;
    
    // 限制在范围内
    newPos = Math.max(limits.min, Math.min(limits.max, newPos));
    
    // 记录使用的速度（用于显示，实际不影响模拟移动）
    const usedSpeed = speed || (displayUnit.value === 'um' ? 1000 : 1.0);
    
    // 模拟移动延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 更新位置
    positions.value[axis] = newPos;
    positionsEncoder.value[axis] = Math.round(newPos * 1000);
    
    // 如果是Z轴移动，需要更新相机图像
    if (axis === 'Z' && !cameraStore.isPollingPaused) {
      cameraStore.fetchCameraImage();
    }
    
    return true;
  }
  
  // 切换单位显示
  function toggleUnit() {
    if (displayUnit.value === 'um') {
      displayUnit.value = 'mm';
      currentUnitScale.value = 1000;
    } else {
      displayUnit.value = 'um';
      currentUnitScale.value = 1;
    }
  }
  
  // 获取轴ID通过名称
  function getAxisIdByName(axisName) {
    for (const [id, name] of Object.entries(axisMapping.value)) {
      if (name === axisName) {
        return id;
      }
    }
    return null;
  }
  
  // 获取轴名称通过ID
  function getAxisNameById(axisId) {
    return axisMapping.value[axisId] || axisId;
  }

  return {
    // 状态
    positions,
    positionsEncoder,
    axisLimits,
    axisLimitsEncoder,
    axisMapping,
    plcAxes,
    selectedAxisId,
    displayUnit,
    currentUnitScale,
    
    // 计算属性
    selectedAxisName,
    
    // 方法
    initializePositions,
    updateEncoderPositions,
    jogAxis,
    toggleUnit,
    getAxisIdByName,
    getAxisNameById
  };
});