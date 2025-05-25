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
  
  // 添加contourExtractionParams
  const contourExtractionParams = ref({
    binaryThreshold: 127,
    minArea: 100,
    maxArea: 1000
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
  
  // 使用轮廓提取检测Mark点
  async function detectMarkWithContourExtraction({ binaryThreshold, minArea, maxArea, imageToSearch = null }) {
    const cameraStore = useCameraStore();
    const roiStore = useRoiStore();

    if (!cameraStore.isConnected && !(selectedAxes.value.includes('X') && selectedAxes.value.includes('Y')) && !imageToSearch) {
      console.warn('Camera not connected and not in static image mode for contour extraction.');
      return false;
    }

    console.log('开始轮廓提取检测 - 参数:', { binaryThreshold, minArea, maxArea });
    
    clearTemplateMatchingResults(); // 复用这个方法清除上一次的结果

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
      console.error('Current image source is not available for contour extraction.');
      return false;
    }

    console.log(`Starting contour extraction on ${currentImageSrc}. Binary threshold: ${binaryThreshold}. Area range: ${minArea}-${maxArea}. ROI enabled: ${roiStore.roiEnabled}`);
    
    // 使用roiStore中的ROI（如果启用），否则搜索整个图像
    const searchRoi = roiStore.roiEnabled ? roiStore.roiCoords : null;
    
    try {
      // 这里暂时模拟检测结果，实际项目中可以调用实际的轮廓检测函数
      // 模拟一个随机的轮廓检测结果
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 300)); // 模拟处理延迟
      
      // 简单模拟，使用与模板匹配相似的结果
      if (currentImageSrc.includes('9dian')) {
        // 提取文件名中的数字
        const match = currentImageSrc.match(/12_1618(\d+)\.png$/);
        if (match) {
          const imageNumber = match[1];
          // 根据图片编号分配固定坐标（显示坐标，已适应640x480的显示尺寸）
          const coordinates = {
            '25': { x: 160, y: 120 },  // 左上
            '27': { x: 320, y: 120 },  // 上中
            '29': { x: 480, y: 120 },  // 右上
            '31': { x: 160, y: 240 },  // 左中
            '33': { x: 320, y: 240 },  // 中心
            '35': { x: 480, y: 240 },  // 右中
            '37': { x: 160, y: 360 },  // 左下
            '39': { x: 315, y: 358 },  // 下中
            '41': { x: 480, y: 360 }   // 右下
          };
          
          const centerPoint = coordinates[imageNumber] || { x: 320, y: 240 };
          const contourSize = 50; // 假设轮廓大小
          const offsetX = Math.random() * 6 - 3; // 小偏移
          const offsetY = Math.random() * 6 - 3;
          
          const contourResult = {
            x: Math.round(centerPoint.x + offsetX),
            y: Math.round(centerPoint.y + offsetY),
            area: minArea + Math.random() * (maxArea - minArea), // 随机面积
            rect: {
              x: Math.round(centerPoint.x - contourSize/2 + offsetX),
              y: Math.round(centerPoint.y - contourSize/2 + offsetY),
              width: contourSize,
              height: contourSize
            }
          };
          
          markDetected.value = true;
          detectedTemplatedMarks.value = [{
            x: contourResult.x,
            y: contourResult.y,
            score: 0.85 + Math.random() * 0.15, // 模拟一个匹配分数
            rect: contourResult.rect,
            area: contourResult.area
          }];
          
          markPoints.value = [{
            x: contourResult.x,
            y: contourResult.y,
            confidence: 0.9,
            rect: contourResult.rect,
            area: contourResult.area
          }];
          
          console.log('Contour extraction successful, marks found:', detectedTemplatedMarks.value);
          return true;
        }
      }
      
      // 如果不是9点图片或提取失败
      markDetected.value = false;
      console.log('No marks found with contour extraction.');
      return false;
      
    } catch (error) {
      console.error('Error during contour extraction detection:', error);
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
  
  // 检测Mark点 - 根据当前选择的方法调用相应的检测函数
  async function detectMarkPoint() {
    if (markMethod.value === 'template') {
      // Template matching
      if (!templateMatchingParams.value || !templateMatchingParams.value.templateImageSrc) {
        console.warn('Template not available for template matching.');
        return false;
      }
      return await detectMarkWithTemplateMatching({
        templateImageSrc: templateMatchingParams.value.templateImageSrc,
        threshold: templateMatchingParams.value.threshold
      });
    } 
    else if (markMethod.value === 'contourExtraction') {
      // Contour extraction
      if (!contourExtractionParams.value) {
        console.warn('Contour extraction parameters not available.');
        return false;
      }
      return await detectMarkWithContourExtraction({
        binaryThreshold: contourExtractionParams.value.binaryThreshold,
        minArea: contourExtractionParams.value.minArea,
        maxArea: contourExtractionParams.value.maxArea
      });
    } 
    else {
      console.warn(`Mark method '${markMethod.value}' not implemented yet.`);
      return false;
    }
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

  function setMarkPreviewImgPath(path) {
    console.log(`[calibrationStore] Setting markPreviewImg from '${markPreviewImg.value}' to '${path}'`);
    markPreviewImg.value = path;
    // Optionally, ensure the camera view updates if it's relying on polling
    const cameraStore = useCameraStore();
    if (cameraStore.isPollingPaused && path) { // If polling is paused and we set a preview
      // This might implicitly tell CameraView to update if cameraImageUrl depends on markPreviewImg
      console.log(`Mark preview image set to: ${path}. Camera polling is paused.`);
    } else if (!path && !cameraStore.isPollingPaused) {
      // If preview is cleared, and polling wasn't paused by us, resume if it should be active
      // This part is tricky, ensure cameraStore.resumePolling() is called appropriately elsewhere
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

  // 设置当前标定图片索引
  function setCurrentCalibrationImageIndex(index) {
    // 确保索引在有效范围内
    if (index < -1) {
      index = -1;
    } else if (allCalibrationImages.value.length > 0 && index >= allCalibrationImages.value.length) {
      index = allCalibrationImages.value.length - 1;
    }
    
    currentCalibrationImageIndex.value = index;
    console.log(`[calibrationStore] 设置当前标定图片索引: ${index}`);
    
    // 如果索引有效，更新当前图片URL
    if (index >= 0 && index < ninePointImages.length) {
      currentCalibrationImageUrl.value = ninePointImages[index];
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
    markMethod,
    markPreviewImg,
    detectedTemplatedMarks,
    currentCalibrationImageIndex,
    currentCalibrationImageUrl,
    allCalibrationImages,
    ninePointImages,
    templateMatchingParams,
    calibrationProgress,
    setSelectedAxes,
    setAxisMapping,
    toggleCalibrationView,
    calibrateRatio,
    detectMarkPoint,
    detectMarkWithTemplateMatching,
    clearTemplateMatchingResults,
    centerMarkPoint,
    startCalibration,
    stopCalibration,
    resetCalibrationState,
    setMarkMethod,
    updateMarkPointData,
    goToNextPoint,
    saveCalibrationResult,
    getCalibrationTableData,
    loadNinePointImages,
    resetCalibration,
    setMarkPreviewImgPath,
    contourExtractionParams,
    detectMarkWithContourExtraction,
    setCurrentCalibrationImageIndex
  };
});