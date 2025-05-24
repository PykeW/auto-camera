<!-- src/components/CalibrationPanel/CalibrationControl.vue -->
<template>
    <div class="panel-section requires-connection">
      <hr class="separator">
      
      <!-- 相机标定模块 -->
      <h4 class="section-title"><i class="fas fa-camera-retro"></i> 相机标定</h4>
      
      <!-- 标定参数配置区域 -->
      <div class="control-group">
        <div class="axis-control-section">
          <!-- 轴选择区域 -->
          <AxisSelector 
            ref="axisSelector"
            :isCalibrating="isCalibrating" 
          />
          
          <!-- 轴参数区域 -->
          <AxisParameters 
            :assignedX="assignedX"
            :assignedY="assignedY"
            :assignedU="assignedU"
            :isCalibrating="isCalibrating"
          />
        </div>
        
        <!-- 矩阵大小和点位偏移 -->
        <MatrixConfig :isCalibrating="isCalibrating" />
        
        <!-- Mark点方式选择和参数 -->
        <MarkPointControl 
          ref="markPointControl"
          :assignedX="assignedX"
          :assignedY="assignedY"
          :isCalibrating="isCalibrating"
        />
      </div>
      
      <!-- 标定操作按钮区域 -->
      <CalibrationButtons 
        :assignedX="assignedX"
        :assignedY="assignedY"
        :assignedU="assignedU"
        :templateMatchingParams="markPointControl?.templateMatchingParams"
      />
      
      <!-- 当量计算 -->
      <CalibrationRatioCalculator />
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useCameraStore } from '../../stores/camera';
  import { useCalibrationStore } from '../../stores/calibration';
  import { useAxisStore } from '../../stores/axis';
  
  // 导入子组件
  import AxisSelector from './AxisSelector.vue';
  import AxisParameters from './AxisParameters.vue';
  import MatrixConfig from './MatrixConfig.vue';
  import MarkPointControl from './MarkPointControl.vue';
  import CalibrationButtons from './CalibrationButtons.vue';
  import CalibrationRatioCalculator from './CalibrationRatioCalculator.vue';
  
  const cameraStore = useCameraStore();
  const calibrationStore = useCalibrationStore();
  const axisStore = useAxisStore();
  
  // 子组件引用
  const markPointControl = ref(null);
  
  // 计算属性
  const isCalibrating = computed(() => calibrationStore.isCalibrating);
  
  // Get assigned axes from store for readability
  const assignedX = computed(() => axisStore.assignedCalibrationAxesIds.x);
  const assignedY = computed(() => axisStore.assignedCalibrationAxesIds.y);
  const assignedU = computed(() => axisStore.assignedCalibrationAxesIds.u);
  
  // 组件挂载后初始化函数
  onMounted(() => {
    console.log('CalibrationControl 组件挂载');
  });
  
  // 组件卸载时清理
  onUnmounted(() => {
    console.log('CalibrationControl 组件卸载');
  });
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
  
  /* 确保分隔线占据全宽 */
  .separator {
    width: 100%;
    margin: 10px 0;
    border: none;
    border-top: 1px solid #444;
  }

  .section-title {
    margin-bottom: 10px;
    font-size: 1.1em;
  }
  </style>