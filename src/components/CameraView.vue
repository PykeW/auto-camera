<!-- src/components/CameraView.vue -->
<template>
    <section class="camera-view">
      <div id="camera-display-container">
        <div class="camera-image">
          <img id="camera-feed" :src="cameraImageUrl" alt="相机画面" style="width: 100%; height: 100%; object-fit: contain;">
          <RoiOverlay v-if="cameraStore.isConnected" />
          <div class="camera-info-overlay">
            <div class="info-item" id="focus-info">
              <span class="info-label">清晰度:</span>
              <span class="info-value" id="clarity-display">{{ formatClarity }}</span>
            </div>
            <div class="info-item" id="position-info">
              <span class="info-label">对焦位置:</span>
              <span class="info-value" id="focus-position-display">{{ formatPosition }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <FocusThumbnails 
        v-if="focusStore.focusCompleted && focusStore.focusImages.length > 0" 
        :show="focusStore.viewingThumbnail"
        @close="focusStore.closeThumbnailViewer" 
      />
    </section>
  </template>
  
  <script setup>
  import { computed, watch, onMounted } from 'vue';
  import { useCameraStore } from '../stores/camera';
  import { useFocusStore } from '../stores/focus';
  import { useAxisStore } from '../stores/axis';
  import { useCalibrationStore } from '../stores/calibration'; // 新增导入
  import RoiOverlay from './common/RoiOverlay.vue';
  import FocusThumbnails from './common/FocusThumbnails.vue';
  
  const cameraStore = useCameraStore();
  const focusStore = useFocusStore();
  const axisStore = useAxisStore();
  const calibrationStore = useCalibrationStore(); // 新增
  
  // 计算属性
  const cameraImageUrl = computed(() => {
    // 检查是否满足切换图片的条件 (基于 calibrationStore)
    const xySelected = calibrationStore.selectedAxes.includes('X') && calibrationStore.selectedAxes.includes('Y');
    if (xySelected) {
      return '/9dian/12_161833.png';
    }
    // 如果正在查看缩略图，显示选中的缩略图
    if (focusStore.viewingThumbnail && 
        focusStore.currentDisplayedImageIndex !== null && 
        focusStore.focusImages[focusStore.currentDisplayedImageIndex]) {
      return focusStore.focusImages[focusStore.currentDisplayedImageIndex].imageData;
    }
    
    // 否则显示相机图像
    return cameraStore.cameraImageUrl;
  });
  
  const formatClarity = computed(() => {
    if (!cameraStore.isConnected) return '--';
    return focusStore.clarity.toFixed(3);
  });
  
  const formatPosition = computed(() => {
    if (!cameraStore.isConnected) return '--';
    
    const axisName = axisStore.selectedAxisName;
    
    // 根据单位显示不同格式
    if (axisStore.displayUnit === 'mm') {
      // 毫米显示，保留3位小数
      const position = axisStore.positions[axisName];
      return `${Math.abs(position).toFixed(3)} mm`;
    } else {
      // 微米显示，整数
      const position = axisStore.positionsEncoder[axisName];
      return `${Math.abs(Math.round(position))} um`;
    }
  });
  
  // 实现自动刷新图像
  let pollingInterval = null;
  
  function startImagePolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    
    pollingInterval = setInterval(() => {
      if (cameraStore.isConnected && !cameraStore.isPollingPaused && !focusStore.viewingThumbnail) {
        cameraStore.fetchCameraImage();
      }
    }, 500);
  }
  
  // 监听连接状态变化
  watch(() => cameraStore.isConnected, (isConnected) => {
    if (isConnected) {
      startImagePolling();
    } else if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  });
  
  // 监听X轴和Y轴选中状态以及位置变化，以触发图像更新
  watch(() => [axisStore.selectedAxisId, axisStore.positions.X, axisStore.positions.Y], () => {
    // 当条件满足时，cameraImageUrl 计算属性会自动更新
    // 如果需要强制刷新，可以在这里调用 cameraStore.fetchCameraImage()
    // 但由于 cameraImageUrl 已经是计算属性，它应该会自动响应依赖项的变化
  });

  // 监听 calibrationStore.selectedAxes 的变化，以触发图像更新
  watch(() => calibrationStore.selectedAxes, (newSelectedAxes) => {
    // 当 selectedAxes 变化时，cameraImageUrl 计算属性会自动更新
    // 如果需要强制刷新，可以在这里调用 cameraStore.fetchCameraImage()，
    // 但由于 cameraImageUrl 已经是计算属性，它应该会自动响应依赖项的变化。
    // 不过，为了确保在条件满足时立即获取新图片（如果 fetchCameraImage 有其他副作用），可以考虑调用。
    if (newSelectedAxes.includes('X') && newSelectedAxes.includes('Y')) {
        cameraStore.fetchCameraImage(); // 确保在条件满足时主动获取一次，以防万一
    } else {
        // 如果条件不再满足，也获取一次，以恢复到正常图像流
        cameraStore.fetchCameraImage();
    }
  }, { deep: true }); // 使用 deep: true 以侦听数组内部的变化
  
  // 组件挂载时开始轮询
  onMounted(() => {
    if (cameraStore.isConnected) {
      startImagePolling();
    }
  });
  
  // 组件卸载时清除轮询
  onMounted(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  });
  </script>