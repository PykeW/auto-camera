// src/stores/camera.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { generateCameraImage, generateFocusImage } from '../utils/imageGenerator';
import { useFocusStore } from './focus';
import { useAxisStore } from './axis';

export const useCameraStore = defineStore('camera', () => {
  // 状态
  const isConnected = ref(false);
  const isCapturing = ref(false);
  const isRecording = ref(false);
  const serialNumber = ref('SN_Sim_1');
  const configFile = ref(null);
  const savePath = ref(null);
  const cameraName = ref(null);
  const cameraModel = ref(null);
  const properties = ref({});
  const cameraImageUrl = ref('');
  const cachedImageUrl = ref(null);
  const cachedTimestamp = ref(null);
  const preventThumbnailAutoShow = ref(false);
  const isPollingPaused = ref(false);

  // 计算属性
  const connectionStatus = computed(() => isConnected.value ? '已连接' : '未连接');
  
  // 方法
  // 连接相机
  async function connect() {
    if (isConnected.value) return;
    
    // 模拟连接过程
    await new Promise(resolve => setTimeout(resolve, 500));
    
    isConnected.value = true;
    cameraName.value = "工业相机 MV-CH120-10GM";
    cameraModel.value = "MV-CH120-10GM";
    configFile.value = "C:/CameraConfigs/sim.cfg";
    savePath.value = "D:/Captures/Sim/";
    properties.value = {
      '曝光时间(us)': { type: 'number', value: 10000, min: 10, max: 1000000, step: 10 },
      '增益': { type: 'number', value: 1.0, min: 0, max: 16, step: 0.1 },
      '触发模式': { type: 'select', options: ['连续采集', '软件触发'], value: '连续采集' },
    };
    
    fetchCameraImage();
    
    return true;
  }
  
  // 断开相机
  async function disconnect() {
    if (!isConnected.value) return;
    
    // 模拟断开过程
    await new Promise(resolve => setTimeout(resolve, 300));
    
    isConnected.value = false;
    isCapturing.value = false;
    isRecording.value = false;
    cameraName.value = null;
    cameraModel.value = null;
    configFile.value = null;
    savePath.value = null;
    properties.value = {};
    cachedImageUrl.value = null;
    cachedTimestamp.value = null;
    
    return true;
  }
  
  // 获取相机图像
  async function fetchCameraImage() {
    if (!isConnected.value) return;
    
    const focusStore = useFocusStore();
    const axisStore = useAxisStore();
    
    // 获取当前Z轴位置
    const zPosition = axisStore.positions['Z'];
    const zPositionEncoder = axisStore.positionsEncoder['Z'];
    
    // 根据当前位置计算清晰度
    let clarity = focusStore.calculateClarity(zPosition, false);
    
    // 使用对焦过程中的图像集和当前位置来显示实时图像
    if (focusStore.focusCompleted && focusStore.focusImages.length > 0) {
      // 在已有的对焦图像中找到最接近当前位置的图像
      const zPositionToUse = axisStore.displayUnit === 'mm' ? zPosition : zPositionEncoder / 1000.0;
      
      // 尝试查找最接近当前位置的图像
      const nearestImage = focusStore.focusImages
        .map(img => ({
          image: img,
          distance: Math.abs(img.zPosition - zPositionToUse)
        }))
        .sort((a, b) => a.distance - b.distance)[0]?.image;
      
      // 如果找到了合适的图像，直接使用
      if (nearestImage && nearestImage.imageData) {
        cameraImageUrl.value = nearestImage.imageData;
        cachedImageUrl.value = nearestImage.imageData;
        cachedTimestamp.value = Date.now();
        
        // 更新清晰度
        focusStore.clarity = nearestImage.clarity;
        
        return nearestImage.imageData;
      }
    }
    
    // 如果没有找到匹配的图像或没有对焦过，则生成一个基于当前清晰度的图像
    const imageData = await generateFocusImage(zPositionEncoder, clarity);
    cameraImageUrl.value = imageData;
    cachedImageUrl.value = imageData;
    cachedTimestamp.value = Date.now();
    
    // 更新清晰度
    focusStore.clarity = clarity;
    
    return imageData;
  }
  
  // 选择配置文件
  async function selectConfigFile() {
    if (!isConnected.value) return;
    
    // 模拟文件选择对话框
    await new Promise(resolve => setTimeout(resolve, 300));
    
    configFile.value = "C:/CameraConfigs/selected_config.cfg";
    return { success: true, path: configFile.value };
  }
  
  // 选择保存路径
  async function selectSavePath() {
    if (!isConnected.value) return;
    
    // 模拟文件夹选择对话框
    await new Promise(resolve => setTimeout(resolve, 300));
    
    savePath.value = "D:/CameraCaptures/Selected/";
    return { success: true, path: savePath.value };
  }
  
  // 更新相机属性
  function updateProperty(name, value) {
    if (!isConnected.value || !properties.value[name]) return;
    properties.value[name].value = value;
  }
  
  // 暂停/恢复状态轮询
  function pausePolling() {
    isPollingPaused.value = true;
  }
  
  function resumePolling() {
    isPollingPaused.value = false;
  }
  
  // 防止缩略图自动显示
  function setPreventThumbnailAutoShow(value, duration = 5000) {
    preventThumbnailAutoShow.value = value;
    
    if (value && duration > 0) {
      setTimeout(() => {
        preventThumbnailAutoShow.value = false;
      }, duration);
    }
  }

  return {
    // 状态
    isConnected,
    isCapturing,
    isRecording,
    serialNumber,
    configFile,
    savePath,
    cameraName,
    cameraModel,
    properties,
    cameraImageUrl,
    cachedImageUrl,
    cachedTimestamp,
    preventThumbnailAutoShow,
    isPollingPaused,
    
    // 计算属性
    connectionStatus,
    
    // 方法
    connect,
    disconnect,
    fetchCameraImage,
    selectConfigFile,
    selectSavePath,
    updateProperty,
    pausePolling,
    resumePolling,
    setPreventThumbnailAutoShow
  };
});