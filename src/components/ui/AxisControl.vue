 <!-- src/components/common/AxisControl.vue -->
<template>
    <div class="control-item side-by-side">
      <label>{{ axis }}轴:</label>
      <div class="axis-position-control">
        <button 
          class="jog-btn minus" 
          :disabled="!isConnected || isMinLimitReached" 
          @click="jog(-1)"
        >-</button>
        <div class="position-display-container">
          <input 
            type="text" 
            :value="formattedPosition" 
            readonly
          >
          <span class="unit-display" title="点击切换单位" @click="toggleUnit">{{ displayUnit }}</span>
        </div>
        <button 
          class="jog-btn plus" 
          :disabled="!isConnected || isMaxLimitReached" 
          @click="jog(1)"
        >+</button>
      </div>
      <select 
        class="compact-select step-select" 
        v-model="selectedStep"
        :data-axis="axis"
      >
        <option v-for="option in stepOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch } from 'vue';
  import { useCameraStore } from '../../stores/camera';
  import { useAxisStore } from '../../stores/axis';
  import { useFocusStore } from '../../stores/focus';
  
  const props = defineProps({
    axis: {
      type: String,
      required: true
    }
  });
  
  const cameraStore = useCameraStore();
  const axisStore = useAxisStore();
  const focusStore = useFocusStore();
  
  // 本地状态
  const selectedStep = ref(displayUnit.value === 'mm' ? 0.1 : 100);
  
  // 计算属性
  const isConnected = computed(() => cameraStore.isConnected);
  const position = computed(() => axisStore.positions[props.axis]);
  const positionEncoder = computed(() => axisStore.positionsEncoder[props.axis]);
  const displayUnit = computed(() => axisStore.displayUnit);
  
  const formattedPosition = computed(() => {
    if (!isConnected.value) return '--';
    
    if (displayUnit.value === 'mm') {
      return Math.abs(position.value).toFixed(3);
    } else {
      return Math.abs(Math.round(positionEncoder.value));
    }
  });
  
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
  
  const axisLimits = computed(() => axisStore.axisLimits[props.axis]);
  const axisLimitsEncoder = computed(() => axisStore.axisLimitsEncoder[props.axis]);
  
  const isMinLimitReached = computed(() => {
    if (!isConnected.value) return true;
    
    if (displayUnit.value === 'mm') {
      return position.value - selectedStep.value < axisLimits.value.min;
    } else {
      return positionEncoder.value - selectedStep.value < axisLimitsEncoder.value.min;
    }
  });
  
  const isMaxLimitReached = computed(() => {
    if (!isConnected.value) return true;
    
    if (displayUnit.value === 'mm') {
      return position.value + selectedStep.value > axisLimits.value.max;
    } else {
      return positionEncoder.value + selectedStep.value > axisLimitsEncoder.value.max;
    }
  });
  
  // 监听单位变更，调整步进选项
  watch(() => axisStore.displayUnit, (newUnit) => {
    // 当单位变化时，自动选择合适的步进值
    if (newUnit === 'mm') {
      selectedStep.value = 0.1; // 默认毫米步进
    } else {
      selectedStep.value = 100; // 默认微米步进
    }
  });
  
  // 点动控制
  async function jog(direction) {
    await axisStore.jogAxis(props.axis, direction, selectedStep.value);
    
    // 如果是Z轴移动，更新清晰度
    if (props.axis === 'Z') {
      const isEncoder = displayUnit.value === 'um';
      const z = isEncoder ? positionEncoder.value : position.value;
      focusStore.clarity = focusStore.calculateClarity(z, isEncoder);
    }
  }
  
  // 切换单位
  function toggleUnit() {
    axisStore.toggleUnit();
  }
  </script>