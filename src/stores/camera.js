// src/stores/camera.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { generateCameraImage, generateFocusImage } from '../utils/imageGenerator';
import { useFocusStore } from './focus';
import { useAxisStore } from './axis';
import { useCalibrationStore } from './calibration'; // 新增导入

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
    
    // 统一使用指定图片作为相机显示
    cameraImageUrl.value = '/9dian/12_161833.png';
    cachedImageUrl.value = '/9dian/12_161833.png';
    cachedTimestamp.value = Date.now();
    
    // 获取当前Z轴位置
    const zPosition = axisStore.positions['Z'];
    const zPositionEncoder = axisStore.positionsEncoder['Z'];
    
    // 根据当前位置计算清晰度
    let clarity = focusStore.calculateClarity(zPosition, false);
    
    // 仅在活跃对焦过程中才实时更新清晰度
    if (focusStore.isFocusing) {
      focusStore.updateClarity(clarity);
    }
    
    return cameraImageUrl.value;
  }
  
  // 获取对焦图像
  async function fetchFocusImages(zPosition) {
    if (!isConnected.value) return [];
    
    const focusStore = useFocusStore();
    
    // 基于给定位置和基准位置的距离生成系列清晰度图像
    const basePosition = focusStore.bestFocusPosition || 50000;
    const distance = Math.abs(zPosition - basePosition);
    
    // 统一使用指定图片作为对焦图像
    return ['/9dian/12_161833.png'];
  }
  
  // 更新相机属性
  function updateProperty(name, value) {
    if (!isConnected.value) return false;
    
    if (properties.value[name]) {
      properties.value[name].value = value;
      return true;
    }
    
    return false;
  }
  
  // 选择配置文件
  async function selectConfigFile() {
    if (!isConnected.value) return null;
    
    // 模拟文件选择
    await new Promise(resolve => setTimeout(resolve, 300));
    configFile.value = "C:/CameraConfigs/selected_config.cfg";
    
    return configFile.value;
  }
  
  // 选择保存路径
  async function selectSavePath() {
    if (!isConnected.value) return null;
    
    // 模拟文件夹选择
    await new Promise(resolve => setTimeout(resolve, 300));
    savePath.value = "D:/Selected/Captures/";
    
    return savePath.value;
  }
  
  // 拍摄单张图片
  async function captureImage() {
    if (!isConnected.value) return null;
    
    isCapturing.value = true;
    
    // 模拟拍照
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `${savePath.value || 'D:/Captures/'}image_${timestamp}.png`;
    
    isCapturing.value = false;
    
    return {
      path: filename,
      url: cameraImageUrl.value,
      timestamp: new Date().toISOString()
    };
  }
  
  // 开始录制视频
  async function startRecording() {
    if (!isConnected.value || isRecording.value) return false;
    
    isRecording.value = true;
    
    return true;
  }
  
  // 停止录制视频
  async function stopRecording() {
    if (!isConnected.value || !isRecording.value) return null;
    
    // 模拟停止录制
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `${savePath.value || 'D:/Captures/'}video_${timestamp}.mp4`;
    
    isRecording.value = false;
    
    return {
      path: filename,
      duration: '00:00:05',
      timestamp: new Date().toISOString()
    };
  }
  
  // 暂停图像轮询（用于节省资源）
  function pausePolling() {
    isPollingPaused.value = true;
  }
  
  // 恢复图像轮询
  function resumePolling() {
    isPollingPaused.value = false;
    fetchCameraImage();
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
    connectionStatus,
    preventThumbnailAutoShow,
    isPollingPaused,
    
    // 方法
    connect,
    disconnect,
    fetchCameraImage,
    fetchFocusImages,
    updateProperty,
    selectConfigFile,
    selectSavePath,
    captureImage,
    startRecording,
    stopRecording,
    pausePolling,
    resumePolling
  };
});