 <!-- src/components/CameraView.vue -->
<template>
    <section class="camera-view">
      <div id="camera-display-container">
        <div class="camera-image">
          <img id="camera-feed" :src="cameraImageUrl" alt="相机画面">
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
  import RoiOverlay from './common/RoiOverlay.vue';
  import FocusThumbnails from './common/FocusThumbnails.vue';
  
  const cameraStore = useCameraStore();
  const focusStore = useFocusStore();
  const axisStore = useAxisStore();
  
  // 计算属性
  const cameraImageUrl = computed(() => {
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
    }, 1000);
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