<!-- src/components/CameraView.vue -->
<template>
    <section class="camera-view">
      <div id="camera-display-container">
        <!-- 单张图片显示模式 -->
        <div v-if="!showAllCalibrationImages" class="camera-image">
          <img id="camera-feed" :src="cameraImageUrl" alt="相机画面" style="width: 100%; height: 100%; object-fit: contain;">
          <RoiOverlay 
            v-if="cameraStore.isConnected" 
            @roi-confirm="handleRoiConfirm"
            @shape-change="handleShapeChange"
          />
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
        
        <!-- 9张图片显示模式 -->
        <div v-else class="calibration-fullscreen-view">
          <!-- 当前选中的标定图片 -->
          <div class="calibration-image-fullscreen">
            <div class="calibration-image-wrapper">
              <div class="image-container">
                <img :src="currentViewImage.imageUrl" alt="标定图片" class="calibration-image">
                
                <!-- 显示匹配框 -->
                <div v-for="(match, matchIndex) in currentViewImage.matches" :key="matchIndex" 
                    class="detected-mark-rect"
                    :style="{
                      left: `${match.rect.x}px`,
                      top: `${match.rect.y}px`,
                      width: `${match.rect.width}px`,
                      height: `${match.rect.height}px`,
                      borderColor: match.score > 0.9 ? '#00FF00' : (match.score > 0.7 ? '#FFFF00' : '#FF8C00')
                    }">
                  <span class="detected-mark-score">{{ match.score.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 缩略图导航 -->
          <div v-if="calibrationStore.calibrationResult && calibrationStore.allCalibrationImages.length > 0" class="calibration-thumbnails">
            <div 
              v-for="(image, index) in calibrationStore.allCalibrationImages" 
              :key="index"
              class="calibration-thumbnail"
              :class="{ 'active': currentCalibrationImageIndex === index }"
              @click="selectCalibrationImage(index)"
            >
              <img :src="image.imageUrl" :alt="`标定图${index+1}`" />
              <div class="thumbnail-index">{{ index + 1 }}</div>
            </div>
          </div>
          
          <!-- 导航控制 -->
          <div v-if="calibrationStore.calibrationResult && calibrationStore.allCalibrationImages.length > 0" class="calibration-navigation">
            <button 
              class="nav-button" 
              @click="selectCalibrationImage(currentCalibrationImageIndex - 1)"
              :disabled="currentCalibrationImageIndex <= 0"
            >
              上一张
            </button>
            <span class="image-counter">{{ currentCalibrationImageIndex + 1 }} / {{ calibrationStore.allCalibrationImages.length }}</span>
            <button 
              class="nav-button" 
              @click="selectCalibrationImage(currentCalibrationImageIndex + 1)"
              :disabled="currentCalibrationImageIndex >= calibrationStore.allCalibrationImages.length - 1"
            >
              下一张
            </button>
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
  import { computed, watch, onMounted, ref } from 'vue';
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
  
  // 是否显示所有标定图片
  const showAllCalibrationImages = computed(() => {
    return calibrationStore.allCalibrationImages.length > 0;
  });
  
  // 当前查看的图片索引
  const currentViewIndex = ref(0);
  
  // 当前标定图片索引
  const currentCalibrationImageIndex = ref(0);
  
  // 当前查看的图片数据
  const currentViewImage = computed(() => {
    // 如果标定过程中，使用当前正在处理的标定图片
    if (calibrationStore.isCalibrating && calibrationStore.currentCalibrationImageUrl) {
      const imageIndex = calibrationStore.currentCalibrationImageIndex;
      return {
        imageUrl: calibrationStore.currentCalibrationImageUrl,
        matches: calibrationStore.detectedTemplatedMarks,
        index: imageIndex
      };
    }
    
    // 如果标定已完成，使用保存的图片结果
    if (calibrationStore.allCalibrationImages.length > 0) {
      if (currentCalibrationImageIndex.value >= calibrationStore.allCalibrationImages.length) {
        currentCalibrationImageIndex.value = 0;
      }
      return calibrationStore.allCalibrationImages[currentCalibrationImageIndex.value];
    }
    
    // 默认返回空结果
    return { imageUrl: '', matches: [], index: -1 };
  });
  
  // 导航到上一张图片
  function prevImage() {
    if (currentViewIndex.value > 0) {
      currentViewIndex.value--;
    }
  }
  
  // 导航到下一张图片
  function nextImage() {
    if (currentViewIndex.value < calibrationStore.allCalibrationImages.length - 1) {
      currentViewIndex.value++;
    }
  }
  
  // 标定结果重置时，重置当前查看索引
  watch(() => calibrationStore.allCalibrationImages, (newImages) => {
    // 如果清空了图片，重置索引
    if (newImages.length === 0) {
      currentViewIndex.value = 0;
    }
    // 如果新添加了图片，跳转到第一张
    else if (newImages.length > 0 && currentViewIndex.value >= newImages.length) {
      currentViewIndex.value = 0;
    }
  }, { deep: true });
  
  // 选择查看特定标定图片
  function selectCalibrationImage(index) {
    if (index < 0) {
      index = 0;
    } else if (index >= calibrationStore.allCalibrationImages.length) {
      index = calibrationStore.allCalibrationImages.length - 1;
    }
    currentCalibrationImageIndex.value = index;
  }
  
  // 计算属性
  const cameraImageUrl = computed(() => {
    // 首先检查是否正在标定，如果是则显示当前标定图片
    if (calibrationStore.isCalibrating && calibrationStore.currentCalibrationImageUrl) {
      return calibrationStore.currentCalibrationImageUrl;
    }

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

  // 添加ROI相关处理方法
  function handleRoiConfirm() {
    console.log('ROI已确认');
    // 可以在这里添加其他处理逻辑
  }

  function handleShapeChange(tool) {
    console.log('ROI形状工具已切换:', tool);
    // 可以在这里添加其他处理逻辑
  }
  </script>
  
  <style scoped>
  .camera-view {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }
  
  #camera-display-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }
  
  .camera-image {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }
  
  .camera-info-overlay {
    position: absolute;
    top: 10px;
    left: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 5px;
    border-radius: 4px;
    color: white;
    font-size: 12px;
  }
  
  .info-item {
    margin-bottom: 5px;
  }
  
  .info-label {
    font-weight: bold;
    margin-right: 5px;
  }
  
  /* 9张图片网格布局 - 已不再使用 */
  .calibration-images-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 10px;
    width: 100%;
    height: 100%;
    padding: 10px;
    box-sizing: border-box;
    background-color: #1e1e1e;
  }
  
  /* 单张图片全屏查看模式 */
  .calibration-fullscreen-view {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background-color: #222; /* 更友好的深灰色 */
    position: relative;
    overflow: auto;
    align-items: center;
    justify-content: center;
  }
  
  .calibration-image-fullscreen {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 320px;
    background: transparent;
  }
  
  .calibration-image-wrapper {
    width: 100%;
    max-width: 640px;
    max-height: 480px;
    aspect-ratio: 4/3;
    position: relative;
    background: #111;
    box-shadow: 0 0 10px #000;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .image-container {
    width: 100%;
    height: 100%;
    position: relative;
    aspect-ratio: 4/3;
    max-width: 640px;
    max-height: 480px;
  }
  
  .calibration-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    background: #222;
  }
  
  .calibration-image-index {
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 5px;
    font-size: 12px;
    text-align: center;
  }
  
  .detected-mark-rect {
    position: absolute;
    background-color: rgba(0, 255, 0, 0.1);
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
    border-width: 2px;
    border-style: solid;
    box-sizing: border-box;
  }
  
  .detected-mark-score {
    position: absolute;
    top: -22px;
    left: 0;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 4px;
    font-size: 12px;
    font-weight: bold;
    border-radius: 3px;
    text-shadow: 1px 1px 1px #000;
  }
  
  /* 导航控制条 */
  .calibration-nav-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background-color: rgba(0, 0, 0, 0.6);
    border-top: 1px solid #444;
  }
  
  .calibration-navigation {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 10px 0;
    gap: 10px;
    padding: 5px 0;
  }
  
  .nav-button {
    background-color: #2b2b2b;
    color: #fff;
    border: 1px solid #555;
    border-radius: 4px;
    padding: 8px 15px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  }
  
  .nav-button:hover:not(:disabled) {
    background-color: #444;
  }
  
  .nav-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .image-counter {
    display: inline-block;
    padding: 5px 10px;
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    color: white;
    font-size: 14px;
  }
  
  .calibration-image-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border: 1px solid #444;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
  }
  
  /* 标定图片缩略图导航 */
  .calibration-thumbnails {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    margin: 10px 0;
    padding: 10px;
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .calibration-thumbnail {
    position: relative;
    width: 64px;
    height: 48px;
    border: 2px solid #555;
    border-radius: 3px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  }
  
  .calibration-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .calibration-thumbnail.active {
    border-color: #00aaff;
    transform: scale(1.1);
    box-shadow: 0 0 5px rgba(0, 170, 255, 0.7);
    z-index: 1;
  }
  
  .calibration-thumbnail:hover:not(.active) {
    border-color: #999;
    transform: scale(1.05);
  }
  
  .thumbnail-index {
    position: absolute;
    bottom: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 1px 4px;
    font-size: 10px;
    border-top-left-radius: 3px;
  }
  
  /* 媒体查询 - 小屏幕适配 */
  @media (max-width: 700px) {
    .calibration-image-wrapper,
    .image-container {
      max-width: 98vw;
      max-height: 60vw;
      width: 100vw;
      height: auto;
    }
  }
  </style>