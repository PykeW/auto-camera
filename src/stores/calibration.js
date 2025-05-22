// src/stores/calibration.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useCameraStore } from './camera';

export const useCalibrationStore = defineStore('calibration', () => {
  // 状态变量
  const isShowingCalibration = ref(false);
  const calibrationResult = ref(null);
  const isCalibrating = ref(false);
  const markDetected = ref(false);
  const markCentered = ref(false);
  const currentPoint = ref(null);
  const totalPoints = ref(0);
  const completedPoints = ref(0);
  const markPoints = ref([]);
  const calibrationMatrix = ref([]);
  const failedPoints = ref([]);
  const selectedAxes = ref([]);
  const axisMapping = ref({});
  
  // 标定参数
  const matrixSize = ref(3);
  const pointOffset = ref(10.0);
  const markSize = ref(2.0);
  const squareSize = ref(1.0);
  
  // Mark点查找方式
  const markMethod = ref('template'); // 可选: 'template', 'circle', 'cross' 等
  const markPreviewImg = ref('/9dian/12_161825.png'); // 默认图片
  const markImages = [
    '/9dian/12_161825.png',
    '/9dian/12_161827.png',
    '/9dian/12_161829.png',
    '/9dian/12_161831.png',
    '/9dian/12_161833.png',
    '/9dian/12_161835.png',
    '/9dian/12_161837.png',
    '/9dian/12_161839.png',
    '/9dian/12_161841.png',
  ];

  // 标定进度百分比
  const calibrationProgress = computed(() => {
    if (totalPoints.value === 0) return 0;
    return Math.round((completedPoints.value / totalPoints.value) * 100);
  });
  
  // 设置选中的轴
  function setSelectedAxes(axes) {
    selectedAxes.value = [...axes];
  }
  
  // 设置轴映射关系
  function setAxisMapping(mapping) {
    axisMapping.value = { ...mapping };
  }
  
  // 切换校准视图
  function toggleCalibrationView() {
    const cameraStore = useCameraStore();
    if (!cameraStore.isConnected) return false;
    isShowingCalibration.value = !isShowingCalibration.value;
    if (isShowingCalibration.value) {
      cameraStore.pausePolling();
    } else {
      cameraStore.resumePolling();
      cameraStore.fetchCameraImage();
    }
    return true;
  }
  
  // 执行当量计算
  async function calibrateRatio() {
    const cameraStore = useCameraStore();
    if (!cameraStore.isConnected) return false;
    if (squareSize.value <= 0) return false;
    await new Promise(resolve => setTimeout(resolve, 500));
    const pixelsPerSquare = Math.floor(40 + Math.random() * 20);
    const ratio = pixelsPerSquare / squareSize.value;
    calibrationResult.value = {
      ratio: ratio,
      pixelsPerSquare: pixelsPerSquare,
      squareSizeMm: squareSize.value
    };
    return true;
  }
  
  // 检测Mark点
  async function detectMarkPoint() {
    const cameraStore = useCameraStore();
    if (!cameraStore.isConnected) return false;
    await new Promise(resolve => setTimeout(resolve, 500));
    const centerX = 320;
    const centerY = 240;
    const offsetX = Math.floor(Math.random() * 200 - 100);
    const offsetY = Math.floor(Math.random() * 200 - 100);
    const markX = centerX + offsetX;
    const markY = centerY + offsetY;
    const confidence = 0.85 + Math.random() * 0.14;
    markDetected.value = true;
    markPoints.value = [{
      x: markX,
      y: markY,
      confidence: confidence
    }];
    return true;
  }
  
  // 居中Mark点
  async function centerMarkPoint() {
    const cameraStore = useCameraStore();
    if (!cameraStore.isConnected || !markDetected.value) return false;
    await new Promise(resolve => setTimeout(resolve, 500));
    const centerX = 320;
    const centerY = 240;
    const smallOffsetX = Math.random() * 10 - 5;
    const smallOffsetY = Math.random() * 10 - 5;
    markPoints.value = [{
      x: centerX + smallOffsetX,
      y: centerY + smallOffsetY,
      confidence: markPoints.value[0]?.confidence || 0.9
    }];
    markCentered.value = true;
    return true;
  }
  
  // 启动标定流程
  async function startCalibration() {
    const cameraStore = useCameraStore();
    if (!cameraStore.isConnected || !markCentered.value) return false;
    if (isCalibrating.value) return false;
    if (!selectedAxes.value.includes('X') || !selectedAxes.value.includes('Y')) {
      return false;
    }
    const size = matrixSize.value;
    const offset = pointOffset.value;
    calibrationMatrix.value = [];
    const center = Math.floor(size / 2);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const xPos = (x - center) * offset;
        const yPos = (y - center) * offset;
        const pointIndex = y * size + x;
        calibrationMatrix.value.push({
          x: xPos,
          y: yPos,
          index: pointIndex,
          row: y,
          col: x,
          axes: selectedAxes.value,
          axisMapping: axisMapping.value
        });
      }
    }
    totalPoints.value = size * size;
    completedPoints.value = 0;
    failedPoints.value = [];
    currentPoint.value = null;
    isCalibrating.value = true;
    simulateCalibrationProcess();
    return true;
  }
  
  // 停止标定
  function stopCalibration() {
    if (!isCalibrating.value) return false;
    isCalibrating.value = false;
    return true;
  }
  
  // 模拟标定过程
  async function simulateCalibrationProcess() {
    try {
      for (let i = 0; i < calibrationMatrix.value.length; i++) {
        if (!isCalibrating.value) break;
        currentPoint.value = calibrationMatrix.value[i];
        await new Promise(resolve => setTimeout(resolve, 500));
        await new Promise(resolve => setTimeout(resolve, 200));
        if (Math.random() < 0.95) {
          completedPoints.value += 1;
        } else {
          failedPoints.value.push(i);
        }
      }
      if (isCalibrating.value) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fx = 1200 + Math.random() * 100;
        const fy = 1200 + Math.random() * 100;
        const cx = 320 + Math.random() * 10 - 5;
        const cy = 240 + Math.random() * 10 - 5;
        const k1 = Math.random() * 0.1 - 0.05;
        const k2 = Math.random() * 0.05 - 0.025;
        const p1 = Math.random() * 0.01 - 0.005;
        const p2 = Math.random() * 0.01 - 0.005;
        const k3 = Math.random() * 0.01 - 0.005;
        calibrationResult.value = {
          intrinsic: [
            [fx, 0, cx],
            [0, fy, cy],
            [0, 0, 1]
          ],
          distortion: [k1, k2, p1, p2, k3],
          reprojectionError: Math.random() * 0.5,
          completedPoints: completedPoints.value,
          totalPoints: totalPoints.value,
          resolution: [640, 480],
          timestamp: Date.now(),
          selectedAxes: selectedAxes.value,
          axisMapping: axisMapping.value
        };
      }
      isCalibrating.value = false;
    } catch (error) {
      console.error('标定过程出错:', error);
      isCalibrating.value = false;
    }
  }

  function setMarkMethod(method) {
    markMethod.value = method;
    // 切换图片，实际可根据method或随机切换
    if (method === 'template') {
      markPreviewImg.value = markImages[0];
    } else if (method === 'circle') {
      markPreviewImg.value = markImages[1];
    } else if (method === 'cross') {
      markPreviewImg.value = markImages[2];
    } else {
      markPreviewImg.value = markImages[0];
    }
  }

  return {
    isShowingCalibration,
    calibrationResult,
    isCalibrating,
    markDetected,
    markCentered,
    currentPoint,
    totalPoints,
    completedPoints,
    markPoints,
    calibrationMatrix,
    failedPoints,
    selectedAxes,
    axisMapping,
    matrixSize,
    pointOffset,
    markSize,
    squareSize,
    calibrationProgress,
    markMethod,
    markPreviewImg,
    setMarkMethod,
    markImages,
    setSelectedAxes,
    setAxisMapping,
    toggleCalibrationView,
    calibrateRatio,
    detectMarkPoint,
    centerMarkPoint,
    startCalibration,
    stopCalibration
  };
});