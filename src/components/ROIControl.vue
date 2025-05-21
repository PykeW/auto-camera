<template>
    <div class="roi-control">
      <div class="roi-header">
        <h3>ROI 控制</h3>
        <div class="roi-toggle">
          <input 
            type="checkbox" 
            id="roi-enabled" 
            v-model="roiEnabled"
            :disabled="!isConnected"
            @change="toggleROI"
          />
          <label for="roi-enabled">启用 ROI</label>
        </div>
      </div>
      
      <div class="roi-content" :class="{ disabled: !isConnected || !roiEnabled }">
        <div class="roi-coordinates">
          <div class="coord-row">
            <div class="coord-item">
              <label for="roi-left">左:</label>
              <input 
                type="number" 
                id="roi-left" 
                v-model.number="roiCoords.l"
                :disabled="!isConnected || !roiEnabled"
                @change="updateROI"
              />
            </div>
            <div class="coord-item">
              <label for="roi-top">上:</label>
              <input 
                type="number" 
                id="roi-top" 
                v-model.number="roiCoords.t"
                :disabled="!isConnected || !roiEnabled"
                @change="updateROI"
              />
            </div>
          </div>
          <div class="coord-row">
            <div class="coord-item">
              <label for="roi-right">右:</label>
              <input 
                type="number" 
                id="roi-right" 
                v-model.number="roiCoords.r"
                :disabled="!isConnected || !roiEnabled"
                @change="updateROI"
              />
            </div>
            <div class="coord-item">
              <label for="roi-bottom">下:</label>
              <input 
                type="number" 
                id="roi-bottom" 
                v-model.number="roiCoords.b"
                :disabled="!isConnected || !roiEnabled"
                @change="updateROI"
              />
            </div>
          </div>
        </div>
        
        <div class="roi-dimensions">
          <div class="dimension-item">
            <span class="dimension-label">宽度:</span>
            <span class="dimension-value">{{ roiWidth }} 像素</span>
          </div>
          <div class="dimension-item">
            <span class="dimension-label">高度:</span>
            <span class="dimension-value">{{ roiHeight }} 像素</span>
          </div>
        </div>
        
        <div class="roi-actions">
          <button 
            class="draw-button"
            :disabled="!isConnected || !roiEnabled"
            @click="startDrawingROI"
          >
            <span class="button-icon">✏️</span>
            绘制 ROI
          </button>
          <button 
            class="center-button"
            :disabled="!isConnected || !roiEnabled"
            @click="centerROI"
          >
            <span class="button-icon">⌖</span>
            居中 ROI
          </button>
          <button 
            class="reset-button"
            :disabled="!isConnected || !roiEnabled"
            @click="resetROI"
          >
            <span class="button-icon">↺</span>
            重置 ROI
          </button>
        </div>
        
        <div class="roi-presets">
          <h4>预设</h4>
          <div class="presets-grid">
            <button 
              v-for="preset in roiPresets" 
              :key="preset.name"
              class="preset-button"
              :disabled="!isConnected || !roiEnabled"
              @click="applyPreset(preset)"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch } from 'vue'
  import { useCameraStore } from '../stores/cameraStore'
  
  const cameraStore = useCameraStore()
  
  // 计算属性
  const isConnected = computed(() => cameraStore.isConnected)
  const roiEnabled = computed({
    get: () => cameraStore.roiEnabled,
    set: (value) => cameraStore.roiEnabled = value
  })
  
  // ROI坐标
  const roiCoords = computed({
    get: () => cameraStore.roiCoords,
    set: (value) => cameraStore.roiCoords = value
  })
  
  // ROI尺寸计算
  const roiWidth = computed(() => roiCoords.value.r - roiCoords.value.l)
  const roiHeight = computed(() => roiCoords.value.b - roiCoords.value.t)
  
  // ROI预设
  const roiPresets = ref([
    { name: '全屏', coords: { l: 0, t: 0, r: 1920, b: 1080 } },
    { name: '中心 1/4', coords: { l: 480, t: 270, r: 1440, b: 810 } },
    { name: '中心 1/2', coords: { l: 480, t: 270, r: 1440, b: 810 } },
    { name: '左上角', coords: { l: 0, t: 0, r: 960, b: 540 } },
    { name: '右上角', coords: { l: 960, t: 0, r: 1920, b: 540 } },
    { name: '左下角', coords: { l: 0, t: 540, r: 960, b: 1080 } },
    { name: '右下角', coords: { l: 960, t: 540, r: 1920, b: 1080 } },
  ])
  
  // 方法
  async function toggleROI() {
    if (!isConnected.value) return
    
    try {
      if (roiEnabled.value) {
        await cameraStore.updateROI(roiCoords.value)
      } else {
        await cameraStore.clearROI()
      }
    } catch (error) {
      console.error('ROI操作出错:', error)
    }
  }
  
  async function updateROI() {
    if (!isConnected.value || !roiEnabled.value) return
    
    // 确保坐标的有效性
    validateCoords()
    
    try {
      await cameraStore.updateROI(roiCoords.value)
    } catch (error) {
      console.error('更新ROI出错:', error)
    }
  }
  
  function validateCoords() {
    // 确保右边界大于左边界
    if (roiCoords.value.r <= roiCoords.value.l) {
      roiCoords.value.r = roiCoords.value.l + 10
    }
    
    // 确保下边界大于上边界
    if (roiCoords.value.b <= roiCoords.value.t) {
      roiCoords.value.b = roiCoords.value.t + 10
    }
    
    // 确保坐标在图像范围内
    const maxWidth = 1920 // 假设最大宽度为1920
    const maxHeight = 1080 // 假设最大高度为1080
    
    roiCoords.value.l = Math.max(0, Math.min(roiCoords.value.l, maxWidth - 10))
    roiCoords.value.t = Math.max(0, Math.min(roiCoords.value.t, maxHeight - 10))
    roiCoords.value.r = Math.max(roiCoords.value.l + 10, Math.min(roiCoords.value.r, maxWidth))
    roiCoords.value.b = Math.max(roiCoords.value.t + 10, Math.min(roiCoords.value.b, maxHeight))
  }
  
  function startDrawingROI() {
    if (!isConnected.value || !roiEnabled.value) return
    
    // 启用ROI绘制模式
    cameraStore.isDrawingROI = true
  }
  
  function centerROI() {
    if (!isConnected.value || !roiEnabled.value) return
    
    // 计算当前尺寸
    const width = roiCoords.value.r - roiCoords.value.l
    const height = roiCoords.value.b - roiCoords.value.t
    
    // 计算中心位置
    const centerX = 1920 / 2 // 假设图像宽度为1920
    const centerY = 1080 / 2 // 假设图像高度为1080
    
    // 计算新的ROI坐标
    const l = Math.max(0, centerX - width / 2)
    const t = Math.max(0, centerY - height / 2)
    const r = Math.min(1920, l + width)
    const b = Math.min(1080, t + height)
    
    // 更新ROI
    roiCoords.value = { l, t, r, b }
    updateROI()
  }
  
  function resetROI() {
    if (!isConnected.value || !roiEnabled.value) return
    
    // 重置为默认ROI
    roiCoords.value = { l: 150, t: 100, r: 450, b: 400 }
    updateROI()
  }
  
  function applyPreset(preset) {
    if (!isConnected.value || !roiEnabled.value) return
    
    // 应用预设ROI
    roiCoords.value = { ...preset.coords }
    updateROI()
  }
  
  // 监听ROI启用状态变化
  watch(roiEnabled, (newValue) => {
    if (newValue && isConnected.value) {
      // 如果启用ROI，更新ROI
      updateROI()
    }
  })
  </script>
  
  <style scoped>
  .roi-control {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background-color: white;
  }
  
  .roi-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
  }
  
  .roi-header h3 {
    margin: 0;
    font-size: 16px;
    color: #333;
  }
  
  .roi-toggle {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .roi-toggle input[type="checkbox"] {
    margin: 0;
  }
  
  .roi-content {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .roi-content.disabled {
    opacity: 0.7;
    pointer-events: none;
  }
  
  .roi-coordinates {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .coord-row {
    display: flex;
    gap: 10px;
  }
  
  .coord-item {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .coord-item label {
    min-width: 30px;
    font-weight: bold;
    color: #555;
  }
  
  .coord-item input {
    flex: 1;
    padding: 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
    text-align: right;
    font-family: monospace;
  }
  
  .roi-dimensions {
    display: flex;
    justify-content: space-around;
    background-color: #f9f9f9;
    padding: 10px;
    border-radius: 4px;
  }
  
  .dimension-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }
  
  .dimension-label {
    font-size: 12px;
    color: #555;
  }
  
  .dimension-value {
    font-size: 16px;
    font-weight: bold;
    font-family: monospace;
  }
  
  .roi-actions {
    display: flex;
    gap: 10px;
  }
  
  .draw-button, .center-button, .reset-button {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 10px;
    border: none;
    border-radius: 4px;
    background-color: #f0f0f0;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .draw-button {
    background-color: #3498db;
    color: white;
  }
  
  .draw-button:hover:not(:disabled) {
    background-color: #2980b9;
  }
  
  .center-button {
    background-color: #f39c12;
    color: white;
  }
  
  .center-button:hover:not(:disabled) {
    background-color: #e67e22;
  }
  
  .reset-button {
    background-color: #e74c3c;
    color: white;
  }
  
  .reset-button:hover:not(:disabled) {
    background-color: #c0392b;
  }
  
  .button-icon {
    font-size: 18px;
  }
  
  .roi-presets {
    margin-top: 5px;
  }
  
  .roi-presets h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #333;
  }
  
  .presets-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 5px;
  }
  
  .preset-button {
    padding: 8px 0;
    border: none;
    border-radius: 4px;
    background-color: #f0f0f0;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .preset-button:hover:not(:disabled) {
    background-color: #e0e0e0;
  }
  
  button:disabled {
    background-color: #cccccc !important;
    cursor: not-allowed;
    opacity: 0.7;
  }
  </style>