<template>
    <div class="focus-control">
      <div class="focus-status">
        <div class="status-item">
          <span class="status-label">状态:</span>
          <span class="status-value">{{ focusStatus }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">当前Z位置:</span>
          <span class="status-value">{{ currentZ?.toFixed(3) || '--' }} mm</span>
        </div>
        <div class="status-item">
          <span class="status-label">最佳Z位置:</span>
          <span class="status-value">{{ bestZ?.toFixed(3) || '--' }} mm</span>
        </div>
        <div class="status-item">
          <span class="status-label">清晰度:</span>
          <span class="status-value">{{ clarity?.toFixed(3) || '--' }}</span>
        </div>
      </div>
      
      <div class="focus-progress" v-if="isFocusing">
        <div class="progress-bar">
          <div 
            class="progress-value" 
            :style="{ width: `${focusProgress}%` }"
          ></div>
        </div>
        <span class="progress-text">{{ focusProgress.toFixed(0) }}%</span>
      </div>
      
      <div class="focus-parameters">
        <div class="parameter-group">
          <h4>对焦参数</h4>
          <div class="parameter-item">
            <label for="focus-range">范围:</label>
            <div class="input-with-unit">
              <input 
                id="focus-range" 
                type="number" 
                v-model.number="focusParams.range" 
                :disabled="isFocusing"
              />
              <span v-if="focusParams.isEncoder">步</span>
              <span v-else>mm</span>
            </div>
          </div>
          <div class="parameter-item">
            <label for="focus-step">步长:</label>
            <div class="input-with-unit">
              <input 
                id="focus-step" 
                type="number" 
                v-model.number="focusParams.step" 
                :disabled="isFocusing"
              />
              <span v-if="focusParams.isEncoder">步</span>
              <span v-else>mm</span>
            </div>
          </div>
          <div class="parameter-item">
            <label for="focus-exposure">曝光时间:</label>
            <div class="input-with-unit">
              <input 
                id="focus-exposure" 
                type="number" 
                v-model.number="focusParams.exposure" 
                :disabled="isFocusing"
              />
              <span>μs</span>
            </div>
          </div>
          <div class="parameter-item">
            <label for="focus-gain">增益:</label>
            <input 
              id="focus-gain" 
              type="number" 
              v-model.number="focusParams.gain" 
              :disabled="isFocusing"
              step="0.1"
            />
          </div>
          <div class="parameter-item">
            <label for="focus-times">重复次数:</label>
            <input 
              id="focus-times" 
              type="number" 
              v-model.number="focusParams.times" 
              :disabled="isFocusing"
              min="1"
            />
          </div>
          <div class="parameter-item checkbox-item">
            <input 
              id="focus-encoder" 
              type="checkbox" 
              v-model="focusParams.isEncoder" 
              :disabled="isFocusing"
            />
            <label for="focus-encoder">使用编码器单位</label>
          </div>
        </div>
      </div>
      
      <div class="focus-actions">
        <button 
          class="focus-button"
          :disabled="!isConnected || isFocusing" 
          @click="startFocusProcess"
        >
          开始对焦
        </button>
        <button 
          class="stop-button"
          :disabled="!isFocusing" 
          @click="stopFocusProcess"
        >
          停止对焦
        </button>
        <button 
          class="view-button"
          :disabled="!focusCompleted || focusImages.length === 0" 
          @click="viewThumbnails"
        >
          查看图像
        </button>
        <button 
          class="goto-button"
          :disabled="!isConnected || isFocusing || bestZ === null" 
          @click="gotoFocusedPosition"
        >
          移至对焦位置
        </button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch } from 'vue'
  import { useFocusStore } from '../stores/focusStore'
  import { useCameraStore } from '../stores/cameraStore'
  
  const focusStore = useFocusStore()
  const cameraStore = useCameraStore()
  
  // 计算属性
  const isConnected = computed(() => cameraStore.isConnected)
  const isFocusing = computed(() => focusStore.isFocusing)
  const focusStatus = computed(() => focusStore.focusStatus)
  const currentZ = computed(() => focusStore.currentZ)
  const currentZEncoder = computed(() => focusStore.currentZEncoder)
  const bestZ = computed(() => focusStore.bestZ)
  const bestZEncoder = computed(() => focusStore.bestZEncoder)
  const clarity = computed(() => focusStore.clarity)
  const focusProgress = computed(() => focusStore.focusProgress)
  const focusCompleted = computed(() => focusStore.focusCompleted)
  const focusImages = computed(() => focusStore.focusImages)
  
  // 对焦参数
  const focusParams = computed({
    get: () => focusStore.focusParams,
    set: (value) => focusStore.focusParams = value
  })
  
  // 方法
  async function startFocusProcess() {
    if (!isConnected.value || isFocusing.value) return
    
    try {
      const result = await focusStore.startFocus()
      if (!result.success) {
        alert(`开始对焦失败: ${result.message}`)
      }
    } catch (error) {
      console.error('开始对焦出错:', error)
      alert(`开始对焦出错: ${error.message || '未知错误'}`)
    }
  }
  
  async function stopFocusProcess() {
    if (!isFocusing.value) return
    
    try {
      const result = await focusStore.stopFocus()
      if (!result.success) {
        alert(`停止对焦失败: ${result.message}`)
      }
    } catch (error) {
      console.error('停止对焦出错:', error)
      alert(`停止对焦出错: ${error.message || '未知错误'}`)
    }
  }
  
  function viewThumbnails() {
    if (!focusCompleted.value || focusImages.value.length === 0) return
    
    // 打开缩略图查看
    focusStore.showThumbnails = true
  }
  
  async function gotoFocusedPosition() {
    if (!isConnected.value || isFocusing.value || bestZ.value === null) return
    
    try {
      // 移动到最佳对焦位置
      const result = await focusStore.setFocusPosition(bestZ.value, bestZEncoder.value)
      if (!result.success) {
        alert(`移动到对焦位置失败: ${result.message}`)
      }
    } catch (error) {
      console.error('移动到对焦位置出错:', error)
      alert(`移动到对焦位置出错: ${error.message || '未知错误'}`)
    }
  }
  
  // 模拟对焦进度更新
  let focusUpdateInterval = null
  
  watch(isFocusing, (newValue) => {
    if (newValue) {
      // 开始模拟对焦进度更新
      let progress = 0
      focusUpdateInterval = setInterval(() => {
        progress += 2
        if (progress > 100) {
          // 对焦完成
          clearInterval(focusUpdateInterval)
          focusUpdateInterval = null
          focusStore.updateState({
            isFocusing: false,
            focusStatus: '已完成',
            focusProgress: 100,
            focusCompleted: true,
            // 生成模拟对焦结果
            focusImages: Array.from({ length: 10 }, (_, i) => {
              const zPos = (focusStore.currentZ + (i - 5) * (focusStore.focusParams.isEncoder ? focusStore.focusParams.step / 1000 : focusStore.focusParams.step)).toFixed(3)
              // 生成模拟清晰度，最高点在中间
              const clarity = Math.max(0, 1 - Math.abs(i - 5) * 0.15)
              return {
                zPosition: parseFloat(zPos),
                zPositionEncoder: Math.round(parseFloat(zPos) * 1000),
                clarity: clarity,
                imageData: generateFocusImage(parseFloat(zPos), clarity)
              }
            })
          })
          // 设置最佳对焦位置为中间图像的位置
          const bestImage = focusStore.focusImages[5]
          if (bestImage) {
            focusStore.updateState({
              bestZ: bestImage.zPosition,
              bestZEncoder: bestImage.zPositionEncoder,
              clarity: bestImage.clarity
            })
          }
        } else {
          // 更新进度
          focusStore.updateState({
            focusProgress: progress
          })
        }
      }, 200)
    } else {
      // 停止模拟对焦进度更新
      if (focusUpdateInterval) {
        clearInterval(focusUpdateInterval)
        focusUpdateInterval = null
      }
    }
  })
  
  // 生成模拟对焦图像
  function generateFocusImage(zPosition, clarity) {
    // 创建Canvas
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    
    // 黑色背景
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 添加网格线
    ctx.strokeStyle = '#333333'
    ctx.lineWidth = 1
    
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(0 + canvas.width, y)
      ctx.stroke()
    }
    
    // 添加一个清晰度相关的模糊效果
    // 这里我们简单地用不同清晰度绘制不同粗细的线条
    
    // 十字中心线
    ctx.strokeStyle = '#666666'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(canvas.width / 2, 0)
    ctx.lineTo(canvas.width / 2, canvas.height)
    ctx.moveTo(0, canvas.height / 2)
    ctx.lineTo(canvas.width, canvas.height / 2)
    ctx.stroke()
    
    // 模拟不同清晰度的线条
    const blurLevel = Math.max(0, 10 * (1 - clarity))
    
    // 应用清晰度效果
    if (blurLevel > 0) {
      ctx.filter = `blur(${blurLevel}px)`
    }
    
    // 绘制主要图形
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2 + clarity * 3
    
    // 圆形
    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height / 2, 100, 0, Math.PI * 2)
    ctx.stroke()
    
    // 矩形
    ctx.strokeRect(canvas.width / 2 - 50, canvas.height / 2 - 50, 100, 100)
    
    // 重置滤镜
    ctx.filter = 'none'
    
    // 添加信息文本
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '14px Arial'
    ctx.fillText(`Z位置: ${zPosition.toFixed(3)}mm`, 10, 20)
    ctx.fillText(`清晰度: ${clarity.toFixed(3)}`, 10, 40)
    
    return canvas.toDataURL('image/jpeg', 0.8)
  }
  </script>
  
  <style scoped>
  .focus-control {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .focus-status {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
  }
  
  .status-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .status-label {
    font-size: 12px;
    color: #555;
  }
  
  .status-value {
    font-size: 16px;
    font-family: monospace;
    font-weight: 600;
  }
  
  .focus-progress {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .progress-bar {
    flex: 1;
    height: 16px;
    background-color: #f0f0f0;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .progress-value {
    height: 100%;
    background-color: #42b983;
    transition: width 0.2s;
  }
  
  .progress-text {
    font-family: monospace;
    font-size: 14px;
    width: 40px;
    text-align: right;
  }
  
  .focus-parameters {
    background-color: #f9f9f9;
    padding: 10px;
    border-radius: 4px;
  }
  
  .parameter-group h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #333;
  }
  
  .parameter-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .parameter-item label {
    font-size: 13px;
    color: #555;
  }
  
  .parameter-item input[type="number"] {
    width: 80px;
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
    text-align: right;
  }
  
  .input-with-unit {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .input-with-unit span {
    font-size: 12px;
    color: #555;
    min-width: 20px;
  }
  
  .checkbox-item {
    flex-direction: row-reverse;
    justify-content: flex-end;
    gap: 8px;
  }
  
  .checkbox-item input {
    margin: 0;
  }
  
  .focus-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  
  .focus-button, .stop-button, .view-button, .goto-button {
    flex: 1;
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    transition: background-color 0.3s;
    min-width: 100px;
  }
  
  .focus-button {
    background-color: #42b983;
  }
  
  .focus-button:hover:not(:disabled) {
    background-color: #3aa876;
  }
  
  .stop-button {
    background-color: #e74c3c;
  }
  
  .stop-button:hover:not(:disabled) {
    background-color: #c0392b;
  }
  
  .view-button {
    background-color: #3498db;
  }
  
  .view-button:hover:not(:disabled) {
    background-color: #2980b9;
  }
  
  .goto-button {
    background-color: #f39c12;
  }
  
  .goto-button:hover:not(:disabled) {
    background-color: #d35400;
  }
  
  button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
  </style>