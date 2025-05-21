// src/stores/focus.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useCameraStore } from './camera';
import { useAxisStore } from './axis';
import { generateFocusImage } from '../utils/imageGenerator';

export const useFocusStore = defineStore('focus', () => {
  // 状态
  const isFocusing = ref(false);
  const focusCompleted = ref(false);
  const clarity = ref(0);
  const focusStatus = ref('空闲');
  const currentZ = ref(10.0);
  const currentZEncoder = ref(10000);
  const bestZ = ref(15.5);
  const bestZEncoder = ref(15500);
  const zRange = ref({ min: 5.0, max: 25.0 });
  const zRangeEncoder = ref({ min: 5000, max: 25000 });
  const focusImages = ref([]);
  const viewingThumbnail = ref(false);
  const currentDisplayedImageIndex = ref(null);
  const focusProgress = ref(0);
  const manualFocusPosition = ref(null);
  const manualFocusPositionEncoder = ref(null);
  
  // 对焦参数
  const focusParams = ref({
    start: 5000,       // 起始位置(编码器值)
    end: 15000,        // 结束位置(编码器值)
    step: 500,         // 对焦步进(编码器值)
    range: 5000,       // 搜索范围(编码器值)
    rangeUp: 2500,     // 向上搜索范围(编码器值)
    rangeDown: 2500,   // 向下搜索范围(编码器值)
    steps: 20,         // 对焦步数
    exposure: 5000,    // 曝光时间
    gain: 1.0,         // 增益
    times: 1,          // 对焦次数
    isEncoder: true    // 是否使用编码器值
  });
  
  // 计算属性
  const canStartFocus = computed(() => {
    const cameraStore = useCameraStore();
    return cameraStore.isConnected && !isFocusing.value;
  });
  
  const canStopFocus = computed(() => {
    const cameraStore = useCameraStore();
    return cameraStore.isConnected && isFocusing.value;
  });
  
  // 方法
  // 开始自动对焦
  async function startAutoFocus(range, step) {
    const cameraStore = useCameraStore();
    const axisStore = useAxisStore();
    
    if (!cameraStore.isConnected || isFocusing.value) return false;
    
    // 重置状态
    viewingThumbnail.value = false;
    currentDisplayedImageIndex.value = null;
    cameraStore.setPreventThumbnailAutoShow(false);
    focusImages.value = [];
    focusCompleted.value = false;
    focusProgress.value = 0;
    
    // 设置对焦参数
    range = parseInt(range) || 5000;
    step = parseInt(step) || 500;
    
    // 获取当前Z轴位置作为中心点
    const current_z = currentZEncoder.value;
    
    // 计算搜索范围的起点和终点
    const start = Math.max(0, current_z - range/2);
    const end = current_z + range/2;
    
    // 计算总步数
    const steps = Math.ceil((end - start) / step);
    
    // 更新对焦参数
    focusParams.value = {
      start,
      end,
      step,
      range,
      rangeUp: range/2,
      rangeDown: range/2,
      steps,
      exposure: 5000,
      gain: 1.0,
      times: 1,
      isEncoder: true
    };
    
    // 更新状态
    isFocusing.value = true;
    focusStatus.value = '对焦中';
    
    // 模拟对焦过程
    try {
      await simulateAutoFocus();
      return true;
    } catch (error) {
      console.error('自动对焦失败:', error);
      isFocusing.value = false;
      focusStatus.value = '错误';
      return false;
    }
  }
  
  // 停止自动对焦
  async function stopAutoFocus() {
    if (!isFocusing.value) return false;
    
    // 模拟停止过程
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 更新状态
    isFocusing.value = false;
    if (focusStatus.value === '对焦中') {
      focusStatus.value = '已停止';
    }
    
    return true;
  }
  
  // 模拟自动对焦过程
  async function simulateAutoFocus() {
    const start = focusParams.value.start;
    const end = focusParams.value.end;
    const step = focusParams.value.step;
    const steps = focusParams.value.steps;
    
    // 准备存储对焦图像和清晰度值
    const images = [];
    let best_z = start;
    let best_clarity = 0;
    
    // 计算中点作为最佳清晰度位置
    const optimal_z = (start + end) / 2;
    
    // 对焦循环
    let current_step = 0;
    for (let z = start; z <= end; z += step) {
      // 检查是否停止对焦
      if (!isFocusing.value) break;
      
      // 更新Z轴位置
      currentZEncoder.value = z;
      currentZ.value = z / 1000.0;
      
      // 计算当前位置的清晰度值
      const distance_from_optimal = Math.abs(z - optimal_z);
      const max_distance = Math.max(Math.abs(start - optimal_z), Math.abs(end - optimal_z));
      
      // 使用二次函数模拟清晰度曲线：清晰度 = 1 - (距离/最大距离)^2
      let currentClarity = Math.max(0.0, Math.min(1.0, 1.0 - (distance_from_optimal/max_distance)**2));
      // 添加少量随机波动
      currentClarity = currentClarity * (0.95 + Math.random() * 0.05);
      currentClarity = Math.round(currentClarity * 1000) / 1000;
      
      // 更新清晰度
      clarity.value = currentClarity;
      
      // 更新最佳位置
      if (currentClarity > best_clarity) {
        best_clarity = currentClarity;
        best_z = z;
      }
      
      // 生成对焦图像
      const imageData = await generateFocusImage(z, currentClarity);
      
      // 存储对焦图像数据
      if (imageData) {
        images.push({
          zPosition: z / 1000.0,
          zPositionEncoder: z,
          clarity: currentClarity,
          imageData: imageData,
          isBest: false
        });
      }
      
      // 更新对焦进度
      current_step++;
      focusProgress.value = (current_step / steps) * 100;
      
      // 模拟耗时
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 对焦完成后
    if (images.length > 0 && isFocusing.value) {
      // 找到最佳图像，更新标志
      const best_index = images.reduce((maxIndex, curr, index, arr) => {
        return curr.clarity > arr[maxIndex].clarity ? index : maxIndex;
      }, 0);
      
      images[best_index].isBest = true;
      
      // 更新最终的最佳位置
      bestZEncoder.value = images[best_index].zPositionEncoder;
      bestZ.value = images[best_index].zPosition;
      clarity.value = images[best_index].clarity;
      
      // 移动到最佳位置
      currentZEncoder.value = bestZEncoder.value;
      currentZ.value = bestZ.value;
      
      // 保存图像列表
      focusImages.value = images;
      
      // 更新对焦状态
      focusCompleted.value = true;
      focusStatus.value = '已对焦';
    }
    
    // 对焦结束
    isFocusing.value = false;
  }
  
  // 保存对焦位置
  async function saveFocusPosition() {
    const cameraStore = useCameraStore();
    if (!cameraStore.isConnected) return false;
    
    // 模拟保存过程
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 如果正在查看缩略图，使用选中缩略图的Z位置
    if (viewingThumbnail.value && 
        currentDisplayedImageIndex.value !== null && 
        focusImages.value[currentDisplayedImageIndex.value]) {
      
      const selectedImage = focusImages.value[currentDisplayedImageIndex.value];
      manualFocusPosition.value = selectedImage.zPosition;
      manualFocusPositionEncoder.value = selectedImage.zPositionEncoder;
    } else {
      // 使用当前Z轴位置
      manualFocusPosition.value = currentZ.value;
      manualFocusPositionEncoder.value = currentZEncoder.value;
    }
    
    return true;
  }
  
  // 加载对焦图像
  function loadFocusImages() {
    if (!focusCompleted.value || focusImages.value.length === 0) return;
    
    const cameraStore = useCameraStore();
    
    // 如果存在阻止显示的标志，不加载缩略图
    if (cameraStore.preventThumbnailAutoShow) return;
    
    // 找到最佳清晰度的图像索引
    const bestFocusIndex = focusImages.value.reduce((maxIndex, curr, index, arr) => {
      return curr.clarity > arr[maxIndex].clarity ? index : maxIndex;
    }, 0);
    
    // 设置查看缩略图状态
    viewingThumbnail.value = true;
    
    // 立即选中最佳图像
    selectThumbnail(bestFocusIndex);
    
    // 暂停轮询
    cameraStore.pausePolling();
    
    return true;
  }
  
  // 选中缩略图
  function selectThumbnail(index) {
    if (index < 0 || index >= focusImages.value.length) return;
    
    currentDisplayedImageIndex.value = index;
    viewingThumbnail.value = true;
    
    const cameraStore = useCameraStore();
    cameraStore.pausePolling();
    
    return focusImages.value[index];
  }
  
  // 关闭缩略图浏览器
  function closeThumbnailViewer() {
    const cameraStore = useCameraStore();
    
    // 重置状态
    viewingThumbnail.value = false;
    currentDisplayedImageIndex.value = null;
    
    // 设置阻止缩略图自动显示标志
    cameraStore.setPreventThumbnailAutoShow(true);
    
    // 恢复轮询
    cameraStore.resumePolling();
    
    // 刷新相机图像
    if (cameraStore.isConnected) {
      cameraStore.fetchCameraImage();
    }
    
    return true;
  }
  
  // 计算清晰度
  function calculateClarity(z, isEncoder = false) {
    if (isEncoder) {
      z = z / 1000.0; // 将编码器值转换为毫米
    }
    
    const diff = z - bestZ.value;
    const range = zRange.value.max - zRange.value.min;
    
    // 使用高斯函数模拟清晰度
    let clarity = Math.max(0.0, Math.min(1.0, (1.0 + Math.random() * 0.05) * (1 - Math.abs(diff) / range * 1.5)));
    return Math.round(clarity * 1000) / 1000;
  }

  return {
    // 状态
    isFocusing,
    focusCompleted,
    clarity,
    focusStatus,
    currentZ,
    currentZEncoder,
    bestZ,
    bestZEncoder,
    zRange,
    zRangeEncoder,
    focusImages,
    viewingThumbnail,
    currentDisplayedImageIndex,
    focusProgress,
    focusParams,
    manualFocusPosition,
    manualFocusPositionEncoder,
    
    // 计算属性
    canStartFocus,
    canStopFocus,
    
    // 方法
    startAutoFocus,
    stopAutoFocus,
    saveFocusPosition,
    loadFocusImages,
    selectThumbnail,
    closeThumbnailViewer,
    calculateClarity
  };
});