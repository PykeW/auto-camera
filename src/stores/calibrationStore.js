import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCameraStore } from './cameraStore'

export const useCalibrationStore = defineStore('calibration', () => {
  const cameraStore = useCameraStore()
  
  // 标定状态
  const isCalibrating = ref(false)
  const markDetected = ref(false)
  const markCentered = ref(false)
  const totalPoints = ref(0)
  const completedPoints = ref(0)
  const currentPoint = ref(null)
  const markPosition = ref(null)
  const calibrationResults = ref(null)
  const failedPoints = ref([])
  
  // 当量计算状态
  const isShowingCalibration = ref(false)
  const calibrationResult = ref(null)
  
  // 标定参数
  const matrixSize = ref(5)
  const pointOffset = ref(10)
  const markSize = ref(3)
  const squareSize = ref(5)
  
  // 计算属性
  const calibrationProgress = computed(() => {
    if (!isCalibrating.value || totalPoints.value === 0) return 0
    return (completedPoints.value / totalPoints.value) * 100
  })
  
  // 方法
  // 检测Mark点
  async function detectMark() {
    if (!cameraStore.isConnected) {
      return { success: false, message: '相机未连接' }
    }
    
    try {
      // 模拟检测Mark点的过程
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 检测到的位置是随机的
      markPosition.value = {
        x: Math.round(800 + Math.random() * 300),
        y: Math.round(500 + Math.random() * 200)
      }
      
      markDetected.value = true
      markCentered.value = false
      
      return { success: true }
    } catch (error) {
      console.error('检测Mark点出错:', error)
      return { success: false, message: error.message || '检测失败' }
    }
  }
  
  // 居中Mark点
  async function centerMark() {
    if (!cameraStore.isConnected || !markDetected.value) {
      return { success: false, message: '相机未连接或未检测到Mark点' }
    }
    
    try {
      // 模拟居中Mark点的过程
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // 居中后的位置会更靠近中心
      markPosition.value = {
        x: Math.round(950 + Math.random() * 100),
        y: Math.round(550 + Math.random() * 100)
      }
      
      markCentered.value = true
      
      return { success: true }
    } catch (error) {
      console.error('居中Mark点出错:', error)
      return { success: false, message: error.message || '居中失败' }
    }
  }
  
  // 开始标定
  async function startCalibration() {
    if (!cameraStore.isConnected || !markCentered.value) {
      return { success: false, message: '相机未连接或Mark点未居中' }
    }
    
    try {
      // 计算总点数
      const size = parseInt(matrixSize.value)
      totalPoints.value = size * size
      completedPoints.value = 0
      currentPoint.value = null
      failedPoints.value = []
      
      isCalibrating.value = true
      
      return { success: true }
    } catch (error) {
      console.error('开始标定出错:', error)
      return { success: false, message: error.message || '开始标定失败' }
    }
  }
  
  // 停止标定
  async function stopCalibration() {
    if (!isCalibrating.value) {
      return { success: false, message: '标定未在进行中' }
    }
    
    try {
      isCalibrating.value = false
      
      return { success: true }
    } catch (error) {
      console.error('停止标定出错:', error)
      return { success: false, message: error.message || '停止标定失败' }
    }
  }
  
  // 切换校准视图
  function toggleCalibrationView() {
    isShowingCalibration.value = !isShowingCalibration.value
  }
  
  // 计算当量
  async function calculateRatio() {
    if (!cameraStore.isConnected || !isShowingCalibration.value) {
      return { success: false, message: '相机未连接或未显示校准视图' }
    }
    
    try {
      // 模拟计算当量的过程
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      // 生成一个合理的当量值
      calibrationResult.value = {
        ratio: 0.005 + Math.random() * 0.001,
        unit: 'mm/像素'
      }
      
      return { success: true }
    } catch (error) {
      console.error('计算当量出错:', error)
      return { success: false, message: error.message || '计算当量失败' }
    }
  }
  
  // 更新状态（用于从外部更新状态）
  function updateState(newState) {
    Object.entries(newState).forEach(([key, value]) => {
      if (key in this) {
        this[key].value = value
      }
    })
  }
  
  return {
    // 状态
    isCalibrating,
    markDetected,
    markCentered,
    totalPoints,
    completedPoints,
    currentPoint,
    markPosition,
    calibrationResults,
    failedPoints,
    isShowingCalibration,
    calibrationResult,
    
    // 参数
    matrixSize,
    pointOffset,
    markSize,
    squareSize,
    
    // 计算属性
    calibrationProgress,
    
    // 方法
    detectMark,
    centerMark,
    startCalibration,
    stopCalibration,
    toggleCalibrationView,
    calculateRatio,
    updateState
  }
})