<!-- src/components/StatusBar.vue -->
<template>
    <footer class="status-bar">
      <span id="footer-status">状态: {{ connectionStatus }}</span>
      <span>帧率: {{ frameRate }} FPS</span>
      <span>鼠标: (<span id="mouse-coords">{{ mouseX }}, {{ mouseY }}</span>)</span>
      <span>Z轴: <span id="footer-z-pos">{{ zPosition }}</span> mm</span>
      <span>图像: Pixmap(<span id="image-dims">{{ imageWidth }}, {{ imageHeight }}</span>)</span>
      <span>缩放: 100%</span>
    </footer>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useCameraStore } from '../../stores/camera';
  import { useFocusStore } from '../../stores/focus';
  
  const cameraStore = useCameraStore();
  const focusStore = useFocusStore();
  
  // 状态
  const mouseX = ref('---');
  const mouseY = ref('---');
  const frameRate = ref('--');
  const imageWidth = ref('---');
  const imageHeight = ref('---');
  
  // 计算属性
  const connectionStatus = computed(() => cameraStore.connectionStatus);
  const zPosition = computed(() => {
    if (!cameraStore.isConnected) return '--';
    return focusStore.currentZ.toFixed(3);
  });
  
  // 鼠标移动处理函数
  function handleMouseMove(event) {
    const rect = event.target.getBoundingClientRect();
    mouseX.value = Math.floor(event.clientX - rect.left);
    mouseY.value = Math.floor(event.clientY - rect.top);
  }
  
  // 监听鼠标移动
  onMounted(() => {
    const cameraView = document.querySelector('.camera-view');
    if (cameraView) {
      cameraView.addEventListener('mousemove', handleMouseMove);
    }
    
    // 默认图像尺寸
    imageWidth.value = '640';
    imageHeight.value = '480';
  });
  
  onUnmounted(() => {
    const cameraView = document.querySelector('.camera-view');
    if (cameraView) {
      cameraView.removeEventListener('mousemove', handleMouseMove);
    }
  });
  </script>