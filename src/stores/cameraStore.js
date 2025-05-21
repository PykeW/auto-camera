import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cameraService } from '../services/cameraService'

export const useCameraStore = defineStore('camera', () => {
  // 状态
  const isConnected = ref(false)
  const isCapturing = ref(false)
  const isRecording = ref(false)
  const serialNumber = ref('SN_Sim_1')
  const cameraName = ref('工业相机 MV-CH120-10GM')
  const cameraModel = ref('MV-CH120-10GM')
  const configFile = ref('C:/CameraConfigs/sim.cfg')
  const savePath = ref('D:/Captures/Sim/')
  const cameraImageUrl = ref(null)
  
  // 位置相关状态
  const XPosition = ref(0)
  const YPosition = ref(0)
  const ZPosition = ref(0)
  const UPosition = ref(0)
  const XPositionEncoder = ref(0)
  const YPositionEncoder = ref(0)
  const ZPositionEncoder = ref(0)
  const UPositionEncoder = ref(0)
  
  // 轴限制
  const axisLimits = ref({
    X: { min: 0.0, max: 200.0 },
    Y: { min: 0.0, max: 200.0 },
    Z: { min: 0.0, max: 50.0 },
    U: { min: 0.0, max: 360.0 }
  })
  
  // ROI相关状态
  const roiEnabled = ref(false)
  const roiCoords = ref({ l: 150, t: 100, r: 450, b: 400 })
  const isDrawingROI = ref(false)
  
  // 方法
  async function connect() {
    if (isConnected.value) {
      return { success: false, message: '相机已连接' }
    }
    
    try {
      const result = await cameraService.connect({
        serialNumber: serialNumber.value
      })
      
      if (result.success) {
        updateStateFromResult(result)
        return { success: true }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('连接相机失败:', error)
      return { success: false, message: error.message || '连接失败' }
    }
  }
  
  async function disconnect() {
    if (!isConnected.value) {
      return { success: false, message: '相机未连接' }
    }
    
    try {
      const result = await cameraService.disconnect()
      
      if (result.success) {
        isConnected.value = false
        isCapturing.value = false
        isRecording.value = false
        cameraImageUrl.value = null
        return { success: true }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('断开相机失败:', error)
      return { success: false, message: error.message || '断开失败' }
    }
  }
  
  async function updateStatus() {
    if (!isConnected.value) return
    
    try {
      const result = await cameraService.getStatus()
      updateStateFromResult(result)
    } catch (error) {
      console.error('获取状态失败:', error)
    }
  }
  
  async function jogAxis(axisId, step, isEncoder = true, absolutePosition = null) {
    if (!isConnected.value) {
      return { success: false, message: '相机未连接' }
    }
    
    try {
      const result = await cameraService.jogAxis(axisId, step, isEncoder, absolutePosition)
      
      if (result.success) {
        updateStateFromResult(result)
        return { success: true }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('轴移动失败:', error)
      return { success: false, message: error.message || '移动失败' }
    }
  }
  
  async function updateROI(roi) {
    if (!isConnected.value) {
      return { success: false, message: '相机未连接' }
    }
    
    try {
      const result = await cameraService.updateROI(roi)
      
      if (result.success) {
        roiEnabled.value = true
        roiCoords.value = roi
        return { success: true }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('更新ROI失败:', error)
      return { success: false, message: error.message || '更新ROI失败' }
    }
  }
  
  async function clearROI() {
    if (!isConnected.value) {
      return { success: false, message: '相机未连接' }
    }
    
    try {
      const result = await cameraService.clearROI()
      
      if (result.success) {
        roiEnabled.value = false
        roiCoords.value = { l: 150, t: 100, r: 450, b: 400 }
        return { success: true }
      } else {
        return { success: false, message: result.message }
      }
    } catch (error) {
      console.error('清除ROI失败:', error)
      return { success: false, message: error.message || '清除ROI失败' }
    }
  }
  
  // 辅助方法：从结果更新状态
  function updateStateFromResult(result) {
    if (result.isConnected !== undefined) isConnected.value = result.isConnected
    if (result.isCapturing !== undefined) isCapturing.value = result.isCapturing
    if (result.isRecording !== undefined) isRecording.value = result.isRecording
    if (result.serialNumber) serialNumber.value = result.serialNumber
    if (result.cameraName) cameraName.value = result.cameraName
    if (result.cameraModel) cameraModel.value = result.cameraModel
    if (result.configFile) configFile.value = result.configFile
    if (result.savePath) savePath.value = result.savePath
    if (result.cameraImageUrl) cameraImageUrl.value = result.cameraImageUrl
    
    // 更新位置状态
    if (result.XPosition !== undefined) XPosition.value = result.XPosition
    if (result.YPosition !== undefined) YPosition.value = result.YPosition
    if (result.ZPosition !== undefined) ZPosition.value = result.ZPosition
    if (result.UPosition !== undefined) UPosition.value = result.UPosition
    if (result.XPositionEncoder !== undefined) XPositionEncoder.value = result.XPositionEncoder
    if (result.YPositionEncoder !== undefined) YPositionEncoder.value = result.YPositionEncoder
    if (result.ZPositionEncoder !== undefined) ZPositionEncoder.value = result.ZPositionEncoder
    if (result.UPositionEncoder !== undefined) UPositionEncoder.value = result.UPositionEncoder
    
    // 更新ROI状态
    if (result.roiEnabled !== undefined) roiEnabled.value = result.roiEnabled
    if (result.roiCoords) roiCoords.value = result.roiCoords
  }
  
  return {
    // 状态
    isConnected,
    isCapturing,
    isRecording,
    serialNumber,
    cameraName,
    cameraModel,
    configFile,
    savePath,
    cameraImageUrl,
    XPosition,
    YPosition,
    ZPosition,
    UPosition,
    XPositionEncoder,
    YPositionEncoder,
    ZPositionEncoder,
    UPositionEncoder,
    axisLimits,
    roiEnabled,
    roiCoords,
    isDrawingROI,
    
    // 方法
    connect,
    disconnect,
    updateStatus,
    jogAxis,
    updateROI,
    clearROI
  }
})