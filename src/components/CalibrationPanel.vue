<template>
    <div class="calibration-panel">
      <div class="panel-tabs">
        <button 
          :class="['tab-button', { active: activeTab === 'mark' }]"
          @click="activeTab = 'mark'"
        >
          Mark点标定
        </button>
        <button 
          :class="['tab-button', { active: activeTab === 'calculator' }]"
          @click="activeTab = 'calculator'"
        >
          当量计算
        </button>
      </div>
      
      <!-- Mark点标定面板 -->
      <div v-if="activeTab === 'mark'" class="mark-calibration">
        <div class="calibration-status">
          <div class="status-indicator" :class="getStatusClass()">
            <div class="status-dot"></div>
            <span class="status-text">{{ getStatusText() }}</span>
          </div>
          <div class="status-details" v-if="isCalibrating">
            <span>进度: {{ completedPoints }}/{{ totalPoints }}</span>
          </div>
        </div>
        
        <div class="calibration-parameters">
          <div class="parameter-row">
            <label for="matrix-size">矩阵大小:</label>
            <select 
              id="matrix-size" 
              v-model="matrixSize"
              :disabled="isCalibrating || !isConnected"
            >
              <option value="3">3 x 3</option>
              <option value="5">5 x 5</option>
              <option value="7">7 x 7</option>
              <option value="9">9 x 9</option>
            </select>
          </div>
          
          <div class="parameter-row">
            <label for="point-offset">点偏移(mm):</label>
            <input 
              id="point-offset" 
              type="number" 
              v-model.number="pointOffset"
              :disabled="isCalibrating || !isConnected"
              step="0.1"
            />
          </div>
          
          <div class="parameter-row">
            <label for="mark-size">Mark尺寸:</label>
            <input 
              id="mark-size" 
              type="number" 
              v-model.number="markSize"
              :disabled="isCalibrating || !isConnected"
            />
          </div>
        </div>
        
        <div class="mark-detection-info" v-if="markDetected">
          <h4>检测到的Mark点</h4>
          <div class="mark-position">
            <div class="position-item">
              <span class="position-label">X:</span>
              <span class="position-value">{{ markPosition?.x || '--' }}</span>
            </div>
            <div class="position-item">
              <span class="position-label">Y:</span>
              <span class="position-value">{{ markPosition?.y || '--' }}</span>
            </div>
          </div>
        </div>
        
        <div class="calibration-actions">
          <button 
            class="action-button detect-button"
            :disabled="!isConnected || isCalibrating"
            @click="detectMark"
          >
            检测Mark点
          </button>
          <button 
            class="action-button center-button"
            :disabled="!isConnected || !markDetected || isCalibrating"
            @click="centerMark"
          >
            居中Mark点
          </button>
          <button 
            class="action-button calibrate-button"
            :disabled="!isConnected || !markCentered || isCalibrating"
            @click="startCalibration"
          >
            开始标定
          </button>
          <button 
            class="action-button stop-button"
            :disabled="!isCalibrating"
            @click="stopCalibration"
          >
            停止标定
          </button>
        </div>
        
        <!-- 标定结果显示 -->
        <div class="calibration-results" v-if="calibrationResults">
          <h4>标定结果</h4>
          <div class="result-item">
            <span class="result-label">X比例:</span>
            <span class="result-value">{{ calibrationResults.scaleX?.toFixed(6) }} mm/像素</span>
          </div>
          <div class="result-item">
            <span class="result-label">Y比例:</span>
            <span class="result-value">{{ calibrationResults.scaleY?.toFixed(6) }} mm/像素</span>
          </div>
          <div class="result-item">
            <span class="result-label">误差:</span>
            <span class="result-value">{{ calibrationResults.error?.toFixed(6) }} mm</span>
          </div>
          <div class="result-item failed-points" v-if="failedPoints && failedPoints.length > 0">
            <span class="result-label">失败点:</span>
            <span class="result-value">{{ failedPoints.length }}个</span>
            <div class="failed-points-list">
              <div v-for="(point, index) in failedPoints" :key="index" class="failed-point">
                ({{ point.row }}, {{ point.col }})
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 当量计算面板 -->
      <div v-if="activeTab === 'calculator'" class="ratio-calculator">
        <div class="calculator-instruction">
          <p>将校准板放置在视野中，程序将自动检测校准标记并计算像素/毫米比例。</p>
        </div>
        
        <div class="calculator-parameters">
          <div class="parameter-row">
            <label for="square-size">方格尺寸(mm):</label>
            <input 
              id="square-size" 
              type="number" 
              v-model.number="squareSize"
              :disabled="isShowingCalibration || !isConnected"
              step="0.1"
            />
          </div>
        </div>
        
        <div class="calculator-actions">
          <button 
            :class="['toggle-button', { active: isShowingCalibration }]"
            :disabled="!isConnected"
            @click="toggleCalibrationView"
          >
            {{ isShowingCalibration ? '隐藏校准' : '显示校准' }}
          </button>
          <button 
            class="calculate-button"
            :disabled="!isConnected || !isShowingCalibration"
            @click="calculateRatio"
          >
            计算当量
          </button>
        </div>
        
        <!-- 当量计算结果 -->
        <div class="calculator-results" v-if="calibrationResult">
          <h4>计算结果</h4>
          <div class="result-item">
            <span class="result-label">当量比例:</span>
            <span class="result-value">{{ calibrationResult.ratio?.toFixed(6) }} {{ calibrationResult.unit }}</span>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue'
  import { useCameraStore } from '../stores/cameraStore'
  import { useCalibrationStore } from '../stores/calibrationStore'
  
  const cameraStore = useCameraStore()
  const calibrationStore = useCalibrationStore()
  
  // 标签控制
  const activeTab = ref('mark')
  
  // 计算属性
  const isConnected = computed(() => cameraStore.isConnected)
  const isCalibrating = computed(() => calibrationStore.isCalibrating)
  const markDetected = computed(() => calibrationStore.markDetected)
  const markCentered = computed(() => calibrationStore.markCentered)
  const totalPoints = computed(() => calibrationStore.totalPoints)
  const completedPoints = computed(() => calibrationStore.completedPoints)
  const markPosition = computed(() => calibrationStore.markPosition)
  const calibrationResults = computed(() => calibrationStore.calibrationResults)
  const failedPoints = computed(() => calibrationStore.failedPoints)
  const isShowingCalibration = computed(() => calibrationStore.isShowingCalibration)
  const calibrationResult = computed(() => calibrationStore.calibrationResult)
  
  // 标定参数
  const matrixSize = computed({
    get: () => calibrationStore.matrixSize,
    set: (value) => calibrationStore.matrixSize = value
  })
  const pointOffset = computed({
    get: () => calibrationStore.pointOffset,
    set: (value) => calibrationStore.pointOffset = value
  })
  const markSize = computed({
    get: () => calibrationStore.markSize,
    set: (value) => calibrationStore.markSize = value
  })
  const squareSize = computed({
    get: () => calibrationStore.squareSize,
    set: (value) => calibrationStore.squareSize = value
  })
  
  // 方法
  function getStatusClass() {
    if (isCalibrating.value) return 'status-calibrating'
    if (markCentered.value) return 'status-ready'
    if (markDetected.value) return 'status-detected'
    return 'status-idle'
  }
  
  function getStatusText() {
    if (isCalibrating.value) return '标定中...'
    if (markCentered.value) return '准备标定'
    if (markDetected.value) return '已检测Mark点'
    return '等待检测'
  }
  
  async function detectMark() {
    if (!isConnected.value || isCalibrating.value) return
    
    try {
      const result = await calibrationStore.detectMark()
      if (!result.success) {
        alert(`检测Mark点失败: ${result.message}`)
      }
    } catch (error) {
      console.error('检测Mark点出错:', error)
      alert(`检测Mark点出错: ${error.message || '未知错误'}`)
    }
  }
  
  async function centerMark() {
    if (!isConnected.value || !markDetected.value || isCalibrating.value) return
    
    try {
      const result = await calibrationStore.centerMark()
      if (!result.success) {
        alert(`居中Mark点失败: ${result.message}`)
      }
    } catch (error) {
      console.error('居中Mark点出错:', error)
      alert(`居中Mark点出错: ${error.message || '未知错误'}`)
    }
  }
  
  async function startCalibration() {
    if (!isConnected.value || !markCentered.value || isCalibrating.value) return
    
    try {
      const result = await calibrationStore.startCalibration()
      if (!result.success) {
        alert(`开始标定失败: ${result.message}`)
      }
      
      // 模拟标定过程
      simulateCalibration()
    } catch (error) {
      console.error('开始标定出错:', error)
      alert(`开始标定出错: ${error.message || '未知错误'}`)
    }
  }
  
  async function stopCalibration() {
    if (!isCalibrating.value) return
    
    try {
      const result = await calibrationStore.stopCalibration()
      if (!result.success) {
        alert(`停止标定失败: ${result.message}`)
      }
    } catch (error) {
      console.error('停止标定出错:', error)
      alert(`停止标定出错: ${error.message || '未知错误'}`)
    }
  }
  
  function toggleCalibrationView() {
    calibrationStore.toggleCalibrationView()
  }
  
  async function calculateRatio() {
    if (!isConnected.value || !isShowingCalibration.value) return
    
    try {
      const result = await calibrationStore.calculateRatio()
      if (!result.success) {
        alert(`计算当量失败: ${result.message}`)
      }
    } catch (error) {
      console.error('计算当量出错:', error)
      alert(`计算当量出错: ${error.message || '未知错误'}`)
    }
  }
  
  // 模拟标定过程
  let calibrationSimulation = null
  
  function simulateCalibration() {
    // 计算总点数
    const size = parseInt(matrixSize.value)
    const totalSimPoints = size * size
    
    // 当前完成点
    let currentPoint = 0
    
    // 清除之前的模拟
    if (calibrationSimulation) {
      clearInterval(calibrationSimulation)
    }
    
    // 模拟点进度
    calibrationSimulation = setInterval(() => {
      currentPoint++
      
      // 更新进度
      calibrationStore.updateState({
        completedPoints: currentPoint,
        currentPoint: {
          row: Math.floor(currentPoint / size) + 1,
          col: (currentPoint % size) + 1
        }
      })
      
      // 判断是否完成
      if (currentPoint >= totalSimPoints) {
        clearInterval(calibrationSimulation)
        calibrationSimulation = null
        
        // 模拟生成标定结果
        const randomFailure = Math.random() < 0.3 // 30%概率有失败点
        
        // 生成失败点
        const failedPts = []
        if (randomFailure) {
          // 随机生成1-3个失败点
          const failCount = Math.floor(Math.random() * 3) + 1
          for (let i = 0; i < failCount; i++) {
            failedPts.push({
              row: Math.floor(Math.random() * size) + 1,
              col: Math.floor(Math.random() * size) + 1
            })
          }
        }
        
        // 更新标定结果
        calibrationStore.updateState({
          isCalibrating: false,
          calibrationResults: {
            scaleX: 0.005 + Math.random() * 0.001,
            scaleY: 0.005 + Math.random() * 0.001,
            error: Math.random() * 0.01
          },
          failedPoints: failedPts
        })
      }
    }, 500)
  }
  </script>
  
  <style scoped>
  .calibration-panel {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .panel-tabs {
    display: flex;
    border-bottom: 1px solid #ddd;
  }
  
  .tab-button {
    flex: 1;
    padding: 10px;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    transition: all 0.3s;
    font-weight: bold;
    color: #555;
  }
  
  .tab-button.active {
    border-bottom-color: #42b983;
    color: #42b983;
  }
  
  .mark-calibration, .ratio-calculator {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .calibration-status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background-color: #f9f9f9;
    border-radius: 4px;
  }
  
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: #ccc;
  }
  
  .status-idle .status-dot {
    background-color: #ccc;
  }
  
  .status-detected .status-dot {
    background-color: #f39c12;
  }
  
  .status-ready .status-dot {
    background-color: #2ecc71;
  }
  
  .status-calibrating .status-dot {
    background-color: #3498db;
    animation: pulse 1s infinite;
  }
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
  
  .status-text {
    font-weight: bold;
    color: #555;
  }
  
  .status-details {
    font-size: 14px;
    color: #555;
  }
  
  .calibration-parameters {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    background-color: #f5f5f5;
    border-radius: 4px;
  }
  
  .parameter-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .parameter-row label {
    font-size: 14px;
    color: #555;
  }
  
  .parameter-row input, .parameter-row select {
    width: 120px;
    padding: 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .mark-detection-info {
    padding: 10px;
    background-color: #f0f7ff;
    border-radius: 4px;
    border-left: 4px solid #3498db;
  }
  
  .mark-detection-info h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #333;
  }
  
  .mark-position {
    display: flex;
    gap: 15px;
  }
  
  .position-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .position-label {
    font-weight: bold;
    color: #555;
  }
  
  .position-value {
    font-family: monospace;
    font-size: 16px;
  }
  
  .calibration-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .action-button {
    flex: 1;
    min-width: 120px;
    padding: 10px;
    border: none;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .detect-button {
    background-color: #3498db;
  }
  
  .detect-button:hover:not(:disabled) {
    background-color: #2980b9;
  }
  
  .center-button {
    background-color: #f39c12;
  }
  
  .center-button:hover:not(:disabled) {
    background-color: #e67e22;
  }
  
  .calibrate-button {
    background-color: #2ecc71;
  }
  
  .calibrate-button:hover:not(:disabled) {
    background-color: #27ae60;
  }
  
  .stop-button {
    background-color: #e74c3c;
  }
  
  .stop-button:hover:not(:disabled) {
    background-color: #c0392b;
  }
  
  .calibration-results {
    padding: 10px;
    background-color: #f9f9f9;
    border-radius: 4px;
    border: 1px solid #ddd;
  }
  
  .calibration-results h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #333;
  }
  
  .result-item {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  
  .result-label {
    font-weight: bold;
    color: #555;
    min-width: 70px;
  }
  
  .result-value {
    font-family: monospace;
  }
  
  .failed-points {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .failed-points-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 5px;
  }
  
  .failed-point {
    font-family: monospace;
    padding: 3px 6px;
    background-color: #ffeeee;
    border-radius: 3px;
    font-size: 12px;
  }
  
  /* 当量计算面板样式 */
  .calculator-instruction {
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
    font-size: 14px;
    color: #555;
  }
  
  .calculator-instruction p {
    margin: 0;
  }
  
  .calculator-parameters {
    padding: 10px;
    background-color: #f9f9f9;
    border-radius: 4px;
  }
  
  .calculator-actions {
    display: flex;
    gap: 10px;
  }
  
  .toggle-button, .calculate-button {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .toggle-button {
    background-color: #f0f0f0;
    color: #333;
  }
  
  .toggle-button.active {
    background-color: #3498db;
    color: white;
  }
  
  .toggle-button:hover:not(:disabled):not(.active) {
    background-color: #e0e0e0;
  }
  
  .calculate-button {
    background-color: #2ecc71;
    color: white;
  }
  
  .calculate-button:hover:not(:disabled) {
    background-color: #27ae60;
  }
  
  .calculator-results {
    padding: 10px;
    background-color: #f0fff0;
    border-radius: 4px;
    border-left: 4px solid #2ecc71;
  }
  
  .calculator-results h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #333;
  }
  
  button:disabled {
    background-color: #cccccc !important;
    cursor: not-allowed;
    opacity: 0.7;
  }
  </style>