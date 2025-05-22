// src/stores/calibration.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useCameraStore } from './camera';
import { useRoiStore } from './roi'; // Import ROI store for search region
import { simulateTemplateMatching } from '../utils/imageGenerator'; // Import the simulation function

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
  const detectedTemplatedMarks = ref([]); // For storing template matching results {x, y, score, rect}
  
  // 9点标定图片相关
  const currentCalibrationImageIndex = ref(-1); // -1表示未开始标定
  const currentCalibrationImageUrl = ref('');
  const allCalibrationImages = ref([]); // 存储所有9张图片的匹配结果
  const ninePointImages = [
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
  
  // 标定参数
  const matrixSize = ref(3);
  const pointOffset = ref(10.0);
  const markSize = ref(2.0);
  const squareSize = ref(1.0);
  
  // Mark点查找方式
  const markMethod = ref('template'); // 可选: 'template', 'circle', 'cross', 'contourExtraction' 等
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
  
  // 模板匹配参数
  const templateMatchingParams = ref({
    templateImageSrc: null,
    threshold: 0.7,
  });
  
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
  
  // 清除模板匹配检测结果
  function clearTemplateMatchingResults() {
    markDetected.value = false;
    markPoints.value = [];
    detectedTemplatedMarks.value = [];
    console.log('Template matching results cleared.');
  }

  // 使用模板匹配检测Mark点
  async function detectMarkWithTemplateMatching({ templateImageSrc, threshold, imageToSearch = null }) {
    const cameraStore = useCameraStore();
    const roiStore = useRoiStore();

    if (!cameraStore.isConnected && !(selectedAxes.value.includes('X') && selectedAxes.value.includes('Y')) && !imageToSearch) {
      console.warn('Camera not connected and not in static image mode for template matching.');
      return false;
    }
    if (!templateImageSrc) {
      console.warn('Template image source is missing for detection.');
      return false;
    }

    console.log('开始模板匹配 - 模板源:', templateImageSrc ? '有模板' : '无模板');

    clearTemplateMatchingResults(); // Clear previous results first

    // 如果提供了指定的图片来搜索，则使用它
    let currentImageSrc = imageToSearch || cameraStore.cameraImageUrl;
    
    // 如果没有提供图片且在标定模式，使用当前标定图片
    if (!currentImageSrc && isCalibrating.value && currentCalibrationImageUrl.value) {
      currentImageSrc = currentCalibrationImageUrl.value;
    }
    // 否则，如果X和Y轴被选中，使用静态9点图像
    else if (!currentImageSrc && selectedAxes.value.includes('X') && selectedAxes.value.includes('Y')) {
      currentImageSrc = '/9dian/12_161833.png'; 
    }

    if (!currentImageSrc) {
      console.error('Current image source is not available for template matching.');
      return false;
    }

    console.log(`Starting template matching on ${currentImageSrc}. Threshold: ${threshold}. ROI enabled: ${roiStore.roiEnabled}`);
    
    // 使用roiStore中的ROI（如果启用），否则搜索整个图像
    const searchRoi = roiStore.roiEnabled ? roiStore.roiCoords : null;
    
    try {
      const matches = await simulateTemplateMatching(currentImageSrc, templateImageSrc, threshold, searchRoi);
      
      if (matches && matches.length > 0) {
        markDetected.value = true;
        detectedTemplatedMarks.value = matches;
        // 简单起见，把第一个匹配作为主markPoint
        // 或者，你可以按得分排序并取最佳匹配
        const bestMatch = matches.sort((a, b) => b.score - a.score)[0];
        markPoints.value = [{
          x: bestMatch.x, // 匹配模板的中心x
          y: bestMatch.y, // 匹配模板的中心y
          confidence: bestMatch.score,
          rect: bestMatch.rect // 边界框
        }];
        console.log('Template matching successful, marks found:', detectedTemplatedMarks.value);
        return true;
      } else {
        markDetected.value = false;
        console.log('No marks found with template matching.');
        return false;
      }
    } catch (error) {
      console.error('Error during template matching detection:', error);
      markDetected.value = false;
      return false;
    }
  }
  
  // 加载9点图像
  async function loadNinePointImages() {
    // 预加载所有图片到浏览器缓存
    return Promise.all(ninePointImages.map(src => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
      });
    })).then(() => {
      console.log('All 9-point images loaded successfully');
      return true;
    }).catch(error => {
      console.error('Failed to load some 9-point images:', error);
      return false;
    });
  }
  
  // 检测Mark点 (this is the generic one, might need to be adjusted or called by specific methods)
  async function detectMarkPoint() {
    if (markMethod.value === 'template') {
      // This case should ideally be handled by UI calling detectMarkWithTemplate直接
      // Or, this function needs parameters for template matching.
      // For now, let's assume the main "Detect Mark Point" button might not have template params directly.
      console.warn('Generic detectMarkPoint called for template method. Ensure params are available or use specific detection function.');
      // Perhaps call detectMarkWithTemplateMatching with stored/default params if appropriate?
      // For now, it will just do its old simulation if not handled by a more specific call.
      // Fallback to old simulation if not called with specific template params:
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
    } else if (markMethod.value === 'contourExtraction') {
      // TODO: Implement contour extraction detection logic
      console.log('Contour extraction detection to be implemented.');
      // Simulate for now
      markDetected.value = Math.random() > 0.5;
      if(markDetected.value) {
        markPoints.value = [{ x: 300 + Math.random()*40, y: 220 + Math.random()*40, confidence: Math.random()*0.3 + 0.6 }];
      } else {
        markPoints.value = [];
      }
      return markDetected.value;
    }
    // ... other detection methods
    return false;
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
    const roiStore = useRoiStore();

    if (!cameraStore.isConnected) return false;
    if (isCalibrating.value) return false;
    if (!selectedAxes.value.includes('X') || !selectedAxes.value.includes('Y')) {
      return false;
    }

    // 记录ROI状态，但不再强制要求设置ROI
    if (roiStore.roiEnabled && roiStore.roiCoords) {
      console.log('使用已设置的ROI区域进行标定');
    } else {
      console.log('未设置ROI区域，将在整个图像上进行标定');
    }

    // 简化标定矩阵的设置，直接使用9点矩阵
    matrixSize.value = 3; // 确保矩阵大小是3x3
    const size = 3; // 固定使用3x3
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
    totalPoints.value = ninePointImages.length; // 9点标定
    completedPoints.value = 0;
    failedPoints.value = [];
    currentPoint.value = null;
    isCalibrating.value = true;
    
    // 确保图片已预加载
    await loadNinePointImages();
    
    // 开始标定过程
    simulateCalibrationProcess();
    return true;
  }
  
  // 停止标定
  function stopCalibration() {
    if (!isCalibrating.value) return false;
    isCalibrating.value = false;
    // 重置标定图片
    currentCalibrationImageIndex.value = -1;
    currentCalibrationImageUrl.value = '';
    return true;
  }
  
  // 模拟标定过程
  async function simulateCalibrationProcess() {
    try {
      // 使用存储的模板匹配参数
      const templateInfo = {
        templateImageSrc: templateMatchingParams.value.templateImageSrc, 
        threshold: templateMatchingParams.value.threshold || 0.7,
      };
      
      const roiStore = useRoiStore();
      
      // 输出所有可用的模板来源，帮助检查问题
      console.log('标定过程模板数据检查:');
      console.log('- templateMatchingParams:', !!templateMatchingParams.value.templateImageSrc);
      console.log('- roiStore.capturedTemplateDataUrl:', !!roiStore.capturedTemplateDataUrl);
      console.log('- roiStore.templateDataUrlForOverlay:', !!roiStore.templateDataUrlForOverlay);
      
      // 如果没有模板图像，尝试使用ROI中的
      if (!templateInfo.templateImageSrc && roiStore.capturedTemplateDataUrl) {
        console.log('从ROI Store获取模板');
        templateInfo.templateImageSrc = roiStore.capturedTemplateDataUrl;
      }
      
      // 如果仍然没有，尝试使用显示的模板
      if (!templateInfo.templateImageSrc && roiStore.templateDataUrlForOverlay) {
        console.log('从ROI显示获取模板');
        templateInfo.templateImageSrc = roiStore.templateDataUrlForOverlay;
      }
      
      console.log('模拟标定 - 模板参数:', {
        hasTemplateImageSrc: !!templateInfo.templateImageSrc,
        templateSrcLength: templateInfo.templateImageSrc ? templateInfo.templateImageSrc.length : 0,
        threshold: templateInfo.threshold
      });
      
      // 清空之前的结果
      allCalibrationImages.value = [];
      
      // 显示处理中的消息
      try {
        const { showMessage } = await import('../utils/helpers');
        showMessage('正在处理9张标定图片...', 'info');
      } catch (error) {
        console.log('正在处理9张标定图片...');
      }
      
      // 导入simulate9PointMatching函数
      const { simulate9PointMatching } = await import('../utils/imageGenerator');
      
      // 处理所有9张图片
      for (let i = 0; i < ninePointImages.length; i++) {
        if (!isCalibrating.value) break;
        
        const imageUrl = ninePointImages[i];
        currentCalibrationImageUrl.value = imageUrl; // 更新当前图片URL
        currentCalibrationImageIndex.value = i;
        
        // 创建一个图片结果对象
        const imageResult = {
          index: i,
          imageUrl: imageUrl,
          matches: []
        };
        
        // 使用simulate9PointMatching直接获取模拟的匹配结果
        const match = simulate9PointMatching(imageUrl);
        imageResult.matches = [match];
        
        console.log(`图片 ${i+1}/9: ${imageUrl} 匹配完成，中心点: (${match.x}, ${match.y}), 得分: ${match.score.toFixed(2)}`);
        
        // 添加到结果数组
        allCalibrationImages.value.push(imageResult);
        
        // 更新进度
        completedPoints.value = i + 1;
        
        // 模拟处理延迟，使界面更自然
        await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
      }
      
      // 标定完成后，生成标定结果
      if (isCalibrating.value) {
        // 生成模拟的标定结果
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
        
        // 显示标定完成消息
        try {
          const { showMessage } = await import('../utils/helpers');
          showMessage('标定完成！已生成标定结果矩阵。', 'success');
        } catch (error) {
          console.log('标定完成！已生成标定结果矩阵。');
        }
      }
      
      // 标定完成，重置状态
      isCalibrating.value = false;
      
    } catch (error) {
      console.error('标定过程出错:', error);
      isCalibrating.value = false;
      currentCalibrationImageIndex.value = -1;
      currentCalibrationImageUrl.value = '';
    }
  }

  // 重置标定状态
  function resetCalibrationState() {
    calibrationResult.value = null;
    isCalibrating.value = false;
    markDetected.value = false;
    markCentered.value = false;
    currentPoint.value = null;
    totalPoints.value = 0;
    completedPoints.value = 0;
    markPoints.value = [];
    calibrationMatrix.value = [];
    failedPoints.value = [];
    detectedTemplatedMarks.value = []; 
    currentCalibrationImageIndex.value = -1;
    currentCalibrationImageUrl.value = '';
    allCalibrationImages.value = []; // 清空所有标定图片结果
    // 保留 selectedAxes, axisMapping, matrixSize, pointOffset, markSize, squareSize, markMethod, markPreviewImg
    // 因为这些通常是用户配置，而不是标定过程的状态
    console.log('Calibration state reset.');
  }
  
  // 重置标定结果（供UI调用）
  function resetCalibration() {
    calibrationResult.value = null;
    allCalibrationImages.value = [];
    detectedTemplatedMarks.value = [];
    currentCalibrationImageIndex.value = -1;
    currentCalibrationImageUrl.value = '';
    completedPoints.value = 0;
    markDetected.value = false;
    markCentered.value = false;
    console.log('标定结果已重置');
    return true;
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
    } else if (method === 'contourExtraction') { // Added handling for contourExtraction
      markPreviewImg.value = markImages[4]; // Using 12_161833.png as preview for contour
    } else {
      markPreviewImg.value = markImages[0]; // Default
    }
  }

  // Placeholder for updateMarkPointData
  function updateMarkPointData(data) {
    // This function would typically update the markPoints array or specific point data
    // based on new detection or manual adjustment.
    // For now, it's a placeholder to resolve the error.
    console.log('updateMarkPointData called with:', data);
    // Example: if data is a new set of points
    // if (Array.isArray(data)) {
    //   markPoints.value = data;
    // } else if (typeof data === 'object' && data !== null) {
    //   // Example: update a specific point if an index is provided, or add a new one
    //   // This depends on the expected structure of 'data'
    // }
  }

  // Placeholder for goToNextPoint
  function goToNextPoint() {
    // This function would handle logic for moving to the next calibration point.
    // For now, it's a placeholder.
    console.log('goToNextPoint called');
    // Example: find current point index and increment, then update currentPoint.value
    // if (currentPoint.value && calibrationMatrix.value.length > 0) {
    //   const currentIndex = calibrationMatrix.value.findIndex(p => p.index === currentPoint.value.index);
    //   if (currentIndex !== -1 && currentIndex < calibrationMatrix.value.length - 1) {
    //     currentPoint.value = calibrationMatrix.value[currentIndex + 1];
    //     completedPoints.value = currentIndex + 1; // Or handle completion status separately
    //   } else {
    //     // Last point reached or current point not found
    //   }
    // }
  }

  // Placeholder for saveCalibrationResult
  function saveCalibrationResult() {
    // This function would handle saving the calibrationResult, perhaps to local storage or a backend.
    // For now, it's a placeholder.
    console.log('saveCalibrationResult called with:', calibrationResult.value);
  }

  // Placeholder for getCalibrationTableData
  function getCalibrationTableData() {
    // This function would format and return data for a calibration table display.
    // For now, it's a placeholder.
    console.log('getCalibrationTableData called');
    // Example: return calibrationMatrix.value with status for each point
    // return calibrationMatrix.value.map(point => ({
    //   ...point,
    //   status: failedPoints.value.includes(point.index) ? 'Failed' : (completedPoints.value > point.index ? 'Completed' : 'Pending')
    // }));
    return [];
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
    markMethod,
    markPreviewImg,
    detectedTemplatedMarks, // expose new state
    currentCalibrationImageIndex, // 新增：当前标定图片索引
    currentCalibrationImageUrl, // 新增：当前标定图片URL
    allCalibrationImages, // 新增：存储所有9张图片的匹配结果
    ninePointImages, // 新增：9点图片数组
    templateMatchingParams, // 模板匹配参数
    calibrationProgress,
    setSelectedAxes,
    setAxisMapping,
    toggleCalibrationView,
    calibrateRatio,
    detectMarkPoint, // Generic detection
    detectMarkWithTemplateMatching, // Specific for template matching
    clearTemplateMatchingResults, // Expose new action
    centerMarkPoint,
    startCalibration,
    stopCalibration,
    resetCalibrationState,
    setMarkMethod,
    updateMarkPointData,
    goToNextPoint,
    saveCalibrationResult,
    getCalibrationTableData,
    loadNinePointImages, // 新增：加载9点图片方法
    resetCalibration, // 新增：重置标定结果
  };
});