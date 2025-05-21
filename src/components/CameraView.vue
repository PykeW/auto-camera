<template>
    <div class="camera-view">
      <div 
        id="camera-display-container" 
        class="camera-display-container"
        @mousedown="startRoiDraw"
        @mousemove="updateRoiDraw"
        @mouseup="endRoiDraw"
        @mouseleave="cancelRoiDraw"
      >
        <img 
          id="camera-feed" 
          :src="cameraImageUrl" 
          alt="相机视图" 
          class="camera-feed"
          v-if="cameraImageUrl" 
        />
        <div v-else class="no-signal">
          <span>未连接相机</span>
        </div>
        
        <div 
          v-if="roiEnabled || isDrawingROI" 
          class="roi-overlay"
          :style="roiStyle"
        ></div>
        
        <div v-if="isDrawingROI" class="roi-box" ref="roiBox"></div>
        
        <div class="camera-info-overlay">
          <div v-if="isConnected" class="info-item">
            <span class="info-label">Z位置:</span>
            <span class="info-value">{{ ZPosition?.toFixed(3) || '--' }} mm</span>
          </div>
          <div v-if="isConnected" class="info-item">
            <span class="info-label">清晰度:</span>
            <span class="info-value">{{ clarity?.toFixed(3) || '--' }}</span>
          </div>
        </div>
      </div>
      
      <div class="camera-controls">
        <button 
          :disabled="!isConnected || isFocusing"
          @click="startCapture"
        >
          开始采集
        </button>
        <button 
          :disabled="!isConnected || isFocusing"
          @click="stopCapture"
        >
          停止采集
        </button>
        <button 
          :disabled="!isConnected || isFocusing || isCapturing || isRecording"
          @click="singleShot"
        >
          单张拍照
        </button>
        <button 
          :disabled="!isConnected || isFocusing"
          @click="startRecording"
        >
          开始录制
        </button>
        <button 
          :disabled="!isConnected || !isCapturing && !isRecording"
          @click="stopCapture"
        >
          停止
        </button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, watch } from 'vue'
  import { useCameraStore } from '../stores/cameraStore'
  import { useFocusStore } from '../stores/focusStore'
  import { cameraService } from '../services/cameraService'
  
  const cameraStore = useCameraStore()
  const focusStore = useFocusStore()
  
  // 计算属性
  const isConnected = computed(() => cameraStore.isConnected)
  const isCapturing = computed(() => cameraStore.isCapturing)
  const isRecording = computed(() => cameraStore.isRecording)
  const isFocusing = computed(() => focusStore.isFocusing)
  const cameraImageUrl = computed(() => {
    if (focusStore.viewingThumbnail && focusStore.currentThumbnailIndex !== null) {
      return focusStore.focusImages[focusStore.currentThumbnailIndex]?.imageData || null
    }
    return cameraStore.cameraImageUrl
  })
  const ZPosition = computed(() => cameraStore.ZPosition)
  const clarity = computed(() => focusStore.clarity)
  const roiEnabled = computed(() => cameraStore.roiEnabled)
  const isDrawingROI = computed(() => cameraStore.isDrawingROI)
  
  // ROI绘制状态
  const roiBox = ref(null)
  const isDragging = ref(false)
  const startPoint = ref({ x: 0, y: 0 })
  
  // ROI样式计算
  const roiStyle = computed(() => {
    if (!roiEnabled.value && !isDrawingROI.value) return {}
    
    const coords = cameraStore.roiCoords
    return {
      left: `${coords.l}px`,
      top: `${coords.t}px`,
      width: `${coords.r - coords.l}px`,
      height: `${coords.b - coords.t}px`,
      display: 'block'
    }
  })
  
  // 方法
  async function startCapture() {
    if (!isConnected.value || isFocusing.value) return
    
    try {
      const result = await cameraService.startCapture()
      if (!result.success) {
        console.error('开始采集失败:', result.message)
      }
    } catch (error) {
      console.error('开始采集出错:', error)
    }
  }
  
  async function stopCapture() {
    if (!isConnected.value) return
    
    try {
      const result = await cameraService.stopCapture()
      if (!result.success) {
        console.error('停止采集/录制失败:', result.message)
      }
    } catch (error) {
      console.error('停止采集/录制出错:', error)
    }
  }
  
  async function singleShot() {
    if (!isConnected.value || isFocusing.value || isCapturing.value || isRecording.value) return
    
    try {
      const result = await cameraService.singleShot()
      if (!result.success) {
        console.error('单张拍照失败:', result.message)
      }
    } catch (error) {
      console.error('单张拍照出错:', error)
    }
  }
  
  async function startRecording() {
    if (!isConnected.value || isFocusing.value) return
    
    try {
      const result = await cameraService.startRecording()
      if (!result.success) {
        console.error('开始录制失败:', result.message)
      }
    } catch (error) {
      console.error('开始录制出错:', error)
    }
  }
  
  // ROI绘制方法
  function startRoiDraw(event) {
    if (!isDrawingROI.value || !roiBox.value) return
    
    isDragging.value = true
    
    const container = document.getElementById('camera-display-container')
    const rect = container.getBoundingClientRect()
    startPoint.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
    
    roiBox.value.style.left = `${startPoint.value.x}px`
    roiBox.value.style.top = `${startPoint.value.y}px`
    roiBox.value.style.width = '0px'
    roiBox.value.style.height = '0px'
    roiBox.value.style.display = 'block'
  }
  
  function updateRoiDraw(event) {
    if (!isDragging.value || !isDrawingROI.value || !roiBox.value) return
    
    const container = document.getElementById('camera-display-container')
    const rect = container.getBoundingClientRect()
    const currentX = event.clientX - rect.left
    const currentY = event.clientY - rect.top
    
    const width = currentX - startPoint.value.x
    const height = currentY - startPoint.value.y
    
    if (width < 0) {
      roiBox.value.style.left = `${currentX}px`
      roiBox.value.style.width = `${Math.abs(width)}px`
    } else {
      roiBox.value.style.width = `${width}px`
    }
    
    if (height < 0) {
      roiBox.value.style.top = `${currentY}px`
      roiBox.value.style.height = `${Math.abs(height)}px`
    } else {
      roiBox.value.style.height = `${height}px`
    }
  }
  
  function endRoiDraw() {
    if (!isDragging.value || !isDrawingROI.value || !roiBox.value) return
    
    isDragging.value = false
    
    // 获取ROI坐标
    const l = parseInt(roiBox.value.style.left) || 0
    const t = parseInt(roiBox.value.style.top) || 0
    const r = l + (parseInt(roiBox.value.style.width) || 0)
    const b = t + (parseInt(roiBox.value.style.height) || 0)
    
    // 更新ROI
    cameraStore.updateROI({ l, t, r, b })
    
    // 重置绘制状态
    cameraStore.isDrawingROI = false
    roiBox.value.style.display = 'none'
  }
  
  function cancelRoiDraw() {
    if (isDragging.value) {
      isDragging.value = false
      if (roiBox.value) {
        roiBox.value.style.display = 'none'
      }
    }
  }
  
  // 生命周期钩子
  onMounted(() => {
    // 如果已连接相机，尝试获取图像
    if (isConnected.value && !cameraImageUrl.value) {
      cameraStore.updateStatus()
    }
  })
  
  // 监听连接状态变化
  watch(isConnected, (newValue) => {
    if (newValue) {
      // 连接后获取图像
      cameraStore.updateStatus()
    }
  })
  </script>
  
  <style scoped>
  .camera-view {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .camera-display-container {
    position: relative;
    flex: 1;
    background-color: #1e1e1e;
    overflow: hidden;
  }
  
  .camera-feed {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  .no-signal {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    color: white;
    font-size: 18px;
    background-color: #333;
  }
  
  .roi-overlay {
    position: absolute;
    border: 2px solid red;
    box-sizing: border-box;
    pointer-events: none;
    display: none;
  }
  
  .roi-box {
    position: absolute;
    border: 2px dashed yellow;
    background-color: rgba(255, 255, 0, 0.1);
    box-sizing: border-box;
    display: none;
  }
  
  .camera-info-overlay {
    position: absolute;
    top: 10px;
    left: 10px;
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    pointer-events: none;
  }
  
  .info-item {
    margin: 5px 0;
  }
  
  .info-label {
    font-weight: bold;
    margin-right: 5px;
  }
  
  .info-value {
    font-family: monospace;
  }
  
  .camera-controls {
    display: flex;
    gap: 10px;
    padding: 10px;
    background-color: #f5f5f5;
    border-top: 1px solid #ddd;
  }
  
  button {
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    background-color: #42b983;
    color: white;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  button:hover:not(:disabled) {
    background-color: #3aa876;
  }
  
  button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
  </style>