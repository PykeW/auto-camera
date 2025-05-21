import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { focusService } from '../services/focusService'
import { useCameraStore } from './cameraStore'

export const useFocusStore = defineStore('focus', () => {
  const cameraStore = useCameraStore()
  
  // 状态
  const isFocusing = ref(false)
  const focusStatus = ref('空闲')
  const currentZ = ref(10.0)
  const currentZEncoder = ref(10000)
  const bestZ = ref(15.5)
  const bestZEncoder = ref(15500)
  const clarity = ref(0.0)
  const focusImages = ref([])
  const focusCompleted = ref(false)
  const focusProgress = ref(0.0)
  const showThumbnails = ref(false)
  const currentThumbnailIndex = ref(null)
  const viewingThumbnail = ref(false)
  
  // 对焦参数
  const focusParams = ref({
    range: 5000,
    step: 500,
    exposure: 5000,
    gain: 1.0,
    times: 1,
    isEncoder: true
  })
  
  // 方法
  async function startFocus() {
    if (!cameraStore.isConnected) {
      return { success: false, message: '相机未连接' }
    }
    
    if (isFocusing.value) {
      return { success: false, message: '已经在对焦中' }
    }
    
    try {
      // 重置缩略图状态
      viewingThumbnail.value = false
      currentThumbnailIndex.value = null
      showThumbnails.value = false
      
      const result = await focusService.startFocus(focusParams.value)
      
      if (result.success) {
        isFocusing.value = true
        focusStatus.value = '对焦中'
        focusCompleted.value = false
        focusProgress.value = 0
        focusImages.value = []
        return { success: true }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('开始对焦失败:', error)
      return { success: false, message: error.message || '开始对焦失败' }
    }
  }
  
  async function stopFocus() {
    if (!isFocusing.value) {
      return { success: false, message: '没有正在进行的对焦' }
    }
    
    try {
      const result = await focusService.stopFocus()
      
      if (result.success) {
        isFocusing.value = false
        focusStatus.value = '已停止'
        return { success: true }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('停止对焦失败:', error)
      return { success: false, message: error.message || '停止对焦失败' }
    }
  }
  
  async function getFocusImages() {
    if (!cameraStore.isConnected) {
      return { success: false, message: '相机未连接' }
    }
    
    try {
      const result = await focusService.getFocusImages()
      
      if (result.success) {
        focusImages.value = result.images || []
        focusCompleted.value = result.focusCompleted || false
        return { success: true, images: focusImages.value }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('获取对焦图像失败:', error)
      return { success: false, message: error.message || '获取对焦图像失败' }
    }
  }
  
  async function setFocusPosition(zPosition, zPositionEncoder) {
    if (!cameraStore.isConnected) {
      return { success: false, message: '相机未连接' }
    }
    
    try {
      const result = await focusService.setFocusPosition(zPosition, zPositionEncoder)
      
      if (result.success) {
        // 更新当前Z位置
        currentZ.value = zPosition
        currentZEncoder.value = zPositionEncoder
        // 更新最佳对焦位置
        bestZ.value = zPosition
        bestZEncoder.value = zPositionEncoder
        // 更新清晰度
        clarity.value = result.clarity || 0
        
        // 同步更新相机状态中的Z位置
        cameraStore.ZPosition = zPosition
        cameraStore.ZPositionEncoder = zPositionEncoder
        
        return { success: true }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('设置对焦位置失败:', error)
      return { success: false, message: error.message || '设置对焦位置失败' }
    }
  }
  
  function selectThumbnail(index) {
    if (index < 0 || index >= focusImages.value.length) {
      return
    }
    
    currentThumbnailIndex.value = index
    viewingThumbnail.value = true
    
    // 更新显示的图像
    const selectedImage = focusImages.value[index]
    if (selectedImage && selectedImage.imageData) {
      // 更新相机图像
      // 注意：在实际应用中，这应该通过一个props或者事件来通知CameraView组件
    }
  }
  
  function closeThumbnails() {
    showThumbnails.value = false
    viewingThumbnail.value = false
    currentThumbnailIndex.value = null
  }
  
  // 更新状态，用于从外部更新Store中的状态（如从API响应更新）
  function updateState(newState) {
    if (newState.isFocusing !== undefined) isFocusing.value = newState.isFocusing
    if (newState.focusStatus) focusStatus.value = newState.focusStatus
    if (newState.currentZ !== undefined) currentZ.value = newState.currentZ
    if (newState.currentZEncoder !== undefined) currentZEncoder.value = newState.currentZEncoder
    if (newState.bestZ !== undefined) bestZ.value = newState.bestZ
    if (newState.bestZEncoder !== undefined) bestZEncoder.value = newState.bestZEncoder
    if (newState.clarity !== undefined) clarity.value = newState.clarity
    if (newState.focusImages) focusImages.value = newState.focusImages
    if (newState.focusCompleted !== undefined) focusCompleted.value = newState.focusCompleted
    if (newState.focusProgress !== undefined) focusProgress.value = newState.focusProgress
  }
  
  return {
    // 状态
    isFocusing,
    focusStatus,
    currentZ,
    currentZEncoder,
    bestZ,
    bestZEncoder,
    clarity,
    focusImages,
    focusCompleted,
    focusProgress,
    showThumbnails,
    currentThumbnailIndex,
    viewingThumbnail,
    focusParams,
    
    // 方法
    startFocus,
    stopFocus,
    getFocusImages,
    setFocusPosition,
    selectThumbnail,
    closeThumbnails,
    updateState
  }
})