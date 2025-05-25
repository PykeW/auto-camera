<!-- src/components/CameraView.vue -->
<template>
    <section class="camera-view">
      <div id="camera-display-container">
        <!-- 单张图片显示模式 -->
        <div v-if="!showAllCalibrationImages" class="camera-image">
          <img id="camera-feed" :src="cameraImageUrl" alt="相机画面" style="width: 100%; height: 100%; object-fit: contain; object-position: center center;">
          <RoiOverlay 
            v-if="cameraStore.isConnected" 
            @roi-confirm="handleRoiConfirm"
            @shape-change="handleShapeChange"
          />
          <div class="camera-info-overlay">
            <div class="info-item" id="focus-info">
              <span class="info-label">清晰度:</span>
              <span class="info-value" id="clarity-display">{{ formatClarity }}</span>
            </div>
            <div class="info-item" id="position-info">
              <span class="info-label">对焦位置:</span>
              <span class="info-value" id="focus-position-display">{{ formatPosition }}</span>
            </div>
          </div>
        </div>
        
        <!-- 9张图片显示模式 -->
        <div v-else class="calibration-fullscreen-view">
          <!-- 当前选中的标定图片 -->
          <div class="calibration-image-fullscreen">
            <div class="calibration-image-wrapper">
              <div class="image-container">
                <img :src="currentViewImage.imageUrl" alt="标定图片" class="calibration-image" style="object-position: center center;">
                
                <!-- 显示匹配框 -->
                <div v-for="(match, matchIndex) in currentViewImage.matches" :key="matchIndex" 
                    class="detected-mark-rect"
                    :style="{
                      left: `${match.rect.x}px`,
                      top: `${match.rect.y}px`,
                      width: `${match.rect.width}px`,
                      height: `${match.rect.height}px`,
                      borderColor: match.score > 0.9 ? '#00FF00' : (match.score > 0.7 ? '#FFFF00' : '#FF8C00')
                    }">
                  <span class="detected-mark-score">{{ match.score.toFixed(2) }}</span>
                </div>

                <!-- Auto-targeted ROI Overlay -->
                <RoiOverlay 
                  v-if="autoTargetPropsForRoi" 
                  :autoTargetCenter="autoTargetPropsForRoi.center"
                  :autoTargetSize="autoTargetPropsForRoi.size"
                />
              </div>
            </div>
          </div>
          
          <!-- 缩略图导航 -->
          <div v-if="calibrationStore.calibrationResult && calibrationStore.allCalibrationImages.length > 0" class="calibration-thumbnails">
            <div 
              v-for="(image, index) in calibrationStore.allCalibrationImages" 
              :key="index"
              class="calibration-thumbnail"
              :class="{ 'active': currentCalibrationImageIndex === index }"
              @click="selectCalibrationImage(index)"
            >
              <img :src="image.imageUrl" :alt="`标定图${index+1}`" style="object-position: center center;" />
              <div class="thumbnail-index">{{ index + 1 }}</div>
            </div>
          </div>
          
          <!-- 导航控制 -->
          <div v-if="calibrationStore.calibrationResult && calibrationStore.allCalibrationImages.length > 0" class="calibration-navigation">
            <button 
              class="nav-button" 
              @click="selectCalibrationImage(currentCalibrationImageIndex - 1)"
              :disabled="currentCalibrationImageIndex <= 0"
            >
              上一张
            </button>
            <span class="image-counter">{{ currentCalibrationImageIndex + 1 }} / {{ calibrationStore.allCalibrationImages.length }}</span>
            <button 
              class="nav-button" 
              @click="selectCalibrationImage(currentCalibrationImageIndex + 1)"
              :disabled="currentCalibrationImageIndex >= calibrationStore.allCalibrationImages.length - 1"
            >
              下一张
            </button>
          </div>
        </div>
      </div>
      
      <FocusThumbnails 
        v-if="focusStore.focusCompleted && focusStore.focusImages.length > 0" 
        :show="focusStore.viewingThumbnail"
        @close="focusStore.closeThumbnailViewer" 
      />
    </section>
  </template>
  
  <script setup>
  import { computed, watch, onMounted, ref } from 'vue';
  import { useCameraStore } from '../../stores/camera';
  import { useFocusStore } from '../../stores/focus';
  import { useAxisStore } from '../../stores/axis';
  import { useCalibrationStore } from '../../stores/calibration';
  import { useRoiStore } from '../../stores/roi';
  import RoiOverlay from '../common/RoiOverlay.vue';
  import FocusThumbnails from '../common/FocusThumbnails.vue';
  
  const cameraStore = useCameraStore();
  const focusStore = useFocusStore();
  const axisStore = useAxisStore();
  const calibrationStore = useCalibrationStore();
  const roiStore = useRoiStore();
  
  // 新增：监听轴选择变化，更新calibrationStore.selectedAxes
  watch(() => [axisStore.assignedCalibrationAxesIds.x, axisStore.assignedCalibrationAxesIds.y, axisStore.assignedCalibrationAxesIds.u], 
    ([x, y, u]) => {
      console.log('[CameraView] [watch assignedCalibrationAxesIds] 轴选择变化:', { x, y, u });
      
      // 设置选中的轴和对应的ID
      const axisMapping = {
        X: x,
        Y: y,
        U: u
      };
      
      // 更新selectedAxes和axisMapping，与点击"开始标定"按钮时相同
      calibrationStore.setSelectedAxes(Object.keys(axisMapping).filter(key => axisMapping[key]));
      calibrationStore.setAxisMapping(axisMapping);
      
      console.log('[CameraView] [watch assignedCalibrationAxesIds] 已更新calibrationStore.selectedAxes:', 
                  calibrationStore.selectedAxes,
                  'axisMapping:', calibrationStore.axisMapping);
    },
    { immediate: true, deep: true }
  );
  
  // Default size for the auto-targeted ROI
  const calibrationImagesLoadedFirstTime = ref(true); // Flag for initial load of calibration images
  
  // Computed property for the size of the auto-targeted ROI
  const autoTargetRoiSize = computed(() => {
    if (roiStore.userDefinedTemplateRoiSize && 
        roiStore.userDefinedTemplateRoiSize.width > 0 && 
        roiStore.userDefinedTemplateRoiSize.height > 0) {
      return roiStore.userDefinedTemplateRoiSize;
    }
    // Fallback if user hasn't defined one yet, or if it's invalid
    // Try to use the size of the detected mark's rectangle as a fallback
    if (currentViewImage.value && 
        currentViewImage.value.matches && 
        currentViewImage.value.matches.length > 0) {
      const bestMatch = currentViewImage.value.matches[0];
      if (bestMatch.rect && bestMatch.rect.width > 0 && bestMatch.rect.height > 0) {
        return { width: bestMatch.rect.width, height: bestMatch.rect.height };
      }
    }
    return { width: 50, height: 50 }; // Absolute default fallback
  });
  
  // 是否显示所有标定图片
  const showAllCalibrationImages = computed(() => {
    return calibrationStore.allCalibrationImages.length > 0;
  });
  
  // 当前查看的图片索引
  const currentViewIndex = ref(0);
  
  // 当前标定图片索引
  const currentCalibrationImageIndex = ref(0);
  
  // 当前查看的图片数据
  const currentViewImage = computed(() => {
    if (!showAllCalibrationImages.value || !calibrationStore.allCalibrationImages || calibrationStore.allCalibrationImages.length === 0) {
      return null;
    }
    
    const currentIndex = calibrationStore.currentCalibrationImageIndex === -1 ? 0 : calibrationStore.currentCalibrationImageIndex;
    
    if (currentIndex >= 0 && currentIndex < calibrationStore.allCalibrationImages.length) {
      return calibrationStore.allCalibrationImages[currentIndex];
    }
    
    return null;
  });
  
  // Computed properties for auto-targeting ROI
  const autoTargetPropsForRoi = computed(() => {
    if (showAllCalibrationImages.value && 
        currentViewImage.value && 
        currentViewImage.value.matches && 
        currentViewImage.value.matches.length > 0) {
      
      // 直接使用来自mark点的固定坐标，不进行缩放或调整
      const bestMatch = currentViewImage.value.matches[0];
      
      // 图片文件名，用于调试
      const imageUrl = currentViewImage.value.imageUrl || '';
      const fileName = imageUrl.split('/').pop();
      console.log(`[CameraView] [autoTargetPropsForRoi] 显示图片 ${fileName} 的mark点:`, bestMatch);
      
      // 使用精确的mark点坐标
      return {
        center: {
          x: bestMatch.x,
          y: bestMatch.y
        },
        size: {
          width: bestMatch.rect.width,
          height: bestMatch.rect.height
        }
      };
    }
    return null;
  });
  
  // 导航到上一张图片
  function prevImage() {
    if (currentViewIndex.value > 0) {
      currentViewIndex.value--;
    }
  }
  
  // 导航到下一张图片
  function nextImage() {
    if (currentViewIndex.value < calibrationStore.allCalibrationImages.length - 1) {
      currentViewIndex.value++;
    }
  }
  
  // 标定结果重置时，重置当前查看索引
  watch(() => calibrationStore.allCalibrationImages, (newImages, oldImages) => {
    if (newImages.length === 0) {
      currentCalibrationImageIndex.value = 0; // Reset to 0 if images are cleared
      calibrationImagesLoadedFirstTime.value = true; // Reset flag for next load
    } else if (newImages.length > 0) {
      if (calibrationImagesLoadedFirstTime.value && newImages.length >= 5) {
        // On first load of calibration images, if there are at least 5, default to the 5th image.
        currentCalibrationImageIndex.value = 4; 
        calibrationImagesLoadedFirstTime.value = false;
      } else if (currentCalibrationImageIndex.value >= newImages.length || currentCalibrationImageIndex.value < 0) {
        // If current index is out of bounds (e.g., images were reloaded with fewer items or was initially invalid)
        // or if it was -1 from store and now we have images.
        currentCalibrationImageIndex.value = 0;
      }
      // Otherwise, the user might have already selected an image, so we keep the current index if it's valid.
    }
  }, { deep: true, immediate: true });
  
  // 选择查看特定标定图片
  function selectCalibrationImage(index) {
    if (index < 0) {
      index = 0;
    } else if (index >= calibrationStore.allCalibrationImages.length) {
      index = calibrationStore.allCalibrationImages.length - 1;
    }
    
    // 使用本地状态和store状态保持同步
    currentCalibrationImageIndex.value = index;
    
    // 使用store提供的方法设置索引，确保同步
    calibrationStore.setCurrentCalibrationImageIndex(index);
    
    console.log(`[CameraView] 切换到标定图片 ${index + 1}，文件: ${calibrationStore.allCalibrationImages[index].imageUrl}`);
  }
  
  // 计算属性
  const cameraImageUrl = computed(() => {
    console.log('[CameraView] [cameraImageUrl] Recomputing...');
    console.log('[CameraView] [cameraImageUrl] Current markPreviewImg:', calibrationStore.markPreviewImg);
    // 1. 优先显示 calibrationStore.markPreviewImg (当XY轴选中时, watch会将其设为第5张图)
    if (calibrationStore.markPreviewImg) {
      console.log('[CameraView] [cameraImageUrl] Returning markPreviewImg:', calibrationStore.markPreviewImg);
      return calibrationStore.markPreviewImg;
    }

    console.log('[CameraView] [cameraImageUrl] isCalibrating:', calibrationStore.isCalibrating, 'currentCalibrationImageUrl:', calibrationStore.currentCalibrationImageUrl);
    // 2. 如果正在标定，显示当前标定图片
    if (calibrationStore.isCalibrating && calibrationStore.currentCalibrationImageUrl) {
      console.log('[CameraView] [cameraImageUrl] Returning currentCalibrationImageUrl:', calibrationStore.currentCalibrationImageUrl);
      return calibrationStore.currentCalibrationImageUrl;
    }
    
    console.log('[CameraView] [cameraImageUrl] viewingThumbnail:', focusStore.viewingThumbnail);
    // 3. 如果正在查看对焦缩略图，显示选中的缩略图
    if (focusStore.viewingThumbnail && 
        focusStore.currentDisplayedImageIndex !== null && 
        focusStore.focusImages[focusStore.currentDisplayedImageIndex]) {
      console.log('[CameraView] [cameraImageUrl] Returning focus thumbnail.');
      return focusStore.focusImages[focusStore.currentDisplayedImageIndex].imageData;
    }

    const xySelected = calibrationStore.selectedAxes.includes('X') && calibrationStore.selectedAxes.includes('Y');
    console.log('[CameraView] [cameraImageUrl] xySelected:', xySelected, 'selectedAxes:', calibrationStore.selectedAxes, 'cameraStore.isConnected:', cameraStore.isConnected);

    // 4. 如果XY轴没有都选中 (且相机已连接，且前面条件不满足), 显示 favicon.png
    if (!xySelected && cameraStore.isConnected) {
      console.log('[CameraView] [cameraImageUrl] Returning /favicon.png because XY not selected and connected.');
      return '/favicon.png'; 
    }
    
    console.log('[CameraView] [cameraImageUrl] Defaulting to cameraStore.cameraImageUrl:', cameraStore.cameraImageUrl);
    // 5. 实时相机画面 (如果其他条件都不满足)
    //    cameraStore.cameraImageUrl 通常是实时画面或一个默认的"未连接"图像
    return cameraStore.cameraImageUrl;
  });
  
  const formatClarity = computed(() => {
    if (!cameraStore.isConnected) return '--';
    return focusStore.clarity.toFixed(3);
  });
  
  const formatPosition = computed(() => {
    if (!cameraStore.isConnected) return '--';
    
    const axisName = axisStore.selectedAxisName;
    
    // 根据单位显示不同格式
    if (axisStore.displayUnit === 'mm') {
      // 毫米显示，保留3位小数
      const position = axisStore.positions[axisName];
      return `${Math.abs(position).toFixed(3)} mm`;
    } else {
      // 微米显示，整数
      const position = axisStore.positionsEncoder[axisName];
      return `${Math.abs(Math.round(position))} um`;
    }
  });
  
  // 实现自动刷新图像
  let pollingInterval = null;
  
  function startImagePolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    
    // 增加轮询间隔到2秒，减少图像获取频率
    pollingInterval = setInterval(() => {
      // 检查是否需要暂停轮询：
      // 1. 如果相机未连接
      // 2. 如果轮询被明确暂停
      // 3. 如果正在查看缩略图
      // 4. 如果X和Y轴都被选择 (显示静态Mark点图片时)
      const xySelected = calibrationStore.selectedAxes.includes('X') && calibrationStore.selectedAxes.includes('Y');
      
      if (cameraStore.isConnected && 
          !cameraStore.isPollingPaused && 
          !focusStore.viewingThumbnail &&
          !xySelected) {  // 添加检查X和Y轴是否被选择
        cameraStore.fetchCameraImage();
      }
    }, 2000);  // 轮询间隔从500ms增加到2000ms
  }
  
  // 监听连接状态变化
  watch(() => cameraStore.isConnected, (isConnected) => {
    if (isConnected) {
      startImagePolling();
    } else if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  });
  
  // 监听X轴和Y轴选中状态以及位置变化，以触发图像更新
  watch(() => [axisStore.selectedAxisId, axisStore.positions.X, axisStore.positions.Y], () => {
    // 当条件满足时，cameraImageUrl 计算属性会自动更新
    // 如果需要强制刷新，可以在这里调用 cameraStore.fetchCameraImage()
    // 但由于 cameraImageUrl 已经是计算属性，它应该会自动响应依赖项的变化
  });

  // 监听 calibrationStore.selectedAxes 的变化，以触发图像更新
  watch(() => calibrationStore.selectedAxes, (newSelectedAxes) => {
    const calibStore = useCalibrationStore(); // Get store instance inside watcher
    console.log('[CameraView] [watch selectedAxes] Current selectedAxes:', newSelectedAxes);
    console.log('[CameraView] [watch selectedAxes] axisStore.selectedAxisId:', axisStore.selectedAxisId);
    console.log('[CameraView] [watch selectedAxes] axisMapping:', calibStore.axisMapping);
    
    // 检查是否同时选择了X轴和Y轴 - 使用精确的条件
    const xyAxisSelected = newSelectedAxes.includes('X') && newSelectedAxes.includes('Y');
    
    console.log('[CameraView] [watch selectedAxes] xyAxisSelected:', xyAxisSelected);
    
    if (xyAxisSelected) {
      // 使用更通用的条件：只要有2个或更多轴被选中，我们就尝试显示第五张图
      if (calibStore.ninePointImages && calibStore.ninePointImages.length >= 5) {
        console.log('[CameraView] [watch selectedAxes] ninePointImages:', calibStore.ninePointImages);
        calibStore.setMarkPreviewImgPath(calibStore.ninePointImages[4]); 
        console.log('[CameraView] [watch selectedAxes] X and Y axes selected, switched to 5th image for mark preview.');
      } else {
        console.log('[CameraView] [watch selectedAxes] ninePointImages not available or too short:', calibStore.ninePointImages);
      }
      cameraStore.pausePolling(); // Pause polling when showing static mark preview
    } else {
      // If X and Y are not both selected, clear the specific mark preview.
      calibStore.setMarkPreviewImgPath(null); 
      console.log('[CameraView] [watch selectedAxes] X and Y axes no longer both selected, cleared mark preview.');
      cameraStore.resumePolling(); // Resume polling if not showing static mark preview
    }
  }, { deep: true, immediate: true }); // immediate: true to run on initial load
  
  // 监听 markPreviewImg 的变化，更新相机预览
  watch(() => calibrationStore.markPreviewImg, (newMarkPreviewImg) => {
    // 当 markPreviewImg 变化时，由于 cameraImageUrl 是计算属性，它会自动响应
    // 但为了确保视图立即更新，可以添加额外的处理（如果需要）
    console.log('Mark 点预览图变化:', newMarkPreviewImg);
    
    // 如果有特定的副作用需要触发，可以在这里添加
    // 例如暂停相机图像轮询，可以在这里添加暂停逻辑
    if (newMarkPreviewImg) {
      cameraStore.pausePolling(); // 暂停相机图像轮询，减少资源占用
    } else {
      cameraStore.resumePolling(); // 如果 markPreviewImg 被清除，恢复轮询
    }
  });
  
  // 组件挂载时开始轮询
  onMounted(() => {
    if (cameraStore.isConnected) {
      startImagePolling();
    }
    
    // 检查并尝试显示第五张标定图片
    const calibStore = useCalibrationStore();
    console.log('[CameraView] [onMounted] 检查轴选择状态:', calibStore.selectedAxes);
    console.log('[CameraView] [onMounted] 检查轴映射:', calibStore.axisMapping);
    
    // 初始同步一次轴选择状态
    const axisMapping = {
      X: axisStore.assignedCalibrationAxesIds.x,
      Y: axisStore.assignedCalibrationAxesIds.y,
      U: axisStore.assignedCalibrationAxesIds.u
    };
    
    calibStore.setSelectedAxes(Object.keys(axisMapping).filter(key => axisMapping[key]));
    calibStore.setAxisMapping(axisMapping);
    
    console.log('[CameraView] [onMounted] 已更新 selectedAxes:', calibStore.selectedAxes);
    
    // 检查是否已经选择了X轴和Y轴
    const xySelected = calibStore.selectedAxes.includes('X') && calibStore.selectedAxes.includes('Y');
    
    if (xySelected && 
        calibStore.ninePointImages && 
        calibStore.ninePointImages.length >= 5) {
      console.log('[CameraView] [onMounted] 检测到已选择X轴和Y轴，设置第五张图片作为预览');
      calibStore.setMarkPreviewImgPath(calibStore.ninePointImages[4]);
      cameraStore.pausePolling();
    } else {
      console.log('[CameraView] [onMounted] 未选择X轴和Y轴，或标定图片不足');
    }
  });
  
  // 组件卸载时清除轮询
  onMounted(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  });

  // 添加ROI相关处理方法
  function handleRoiConfirm() {
    console.log('ROI已确认');
    // 可以在这里添加其他处理逻辑
  }

  function handleShapeChange(tool) {
    console.log('ROI形状工具已切换:', tool);
    // 可以在这里添加其他处理逻辑
  }

  // 添加一个全局调试函数，用于强制显示第五张标定图片
  function forceShowFifthImage() {
    const calibStore = useCalibrationStore();
    if (calibStore.ninePointImages && calibStore.ninePointImages.length >= 5) {
      console.log('强制显示第五张标定图片:', calibStore.ninePointImages[4]);
      calibStore.setMarkPreviewImgPath(calibStore.ninePointImages[4]);
      cameraStore.pausePolling();
      return true;
    } else {
      console.error('标定图片不足或不可用');
      return false;
    }
  }

  // 新增：添加调试函数，显示当前轴选择状态
  function debugAxisSelection() {
    const calibStore = useCalibrationStore();
    console.log('-- 调试轴选择状态 --');
    console.log('axisStore.assignedCalibrationAxesIds:', axisStore.assignedCalibrationAxesIds);
    console.log('calibrationStore.selectedAxes:', calibStore.selectedAxes);
    console.log('calibrationStore.axisMapping:', calibStore.axisMapping);
    
    // 主动更新一次轴选择
    const axisMapping = {
      X: axisStore.assignedCalibrationAxesIds.x,
      Y: axisStore.assignedCalibrationAxesIds.y,
      U: axisStore.assignedCalibrationAxesIds.u
    };
    
    calibStore.setSelectedAxes(Object.keys(axisMapping).filter(key => axisMapping[key]));
    calibStore.setAxisMapping(axisMapping);
    
    console.log('更新后 selectedAxes:', calibStore.selectedAxes);
    console.log('更新后 axisMapping:', calibStore.axisMapping);
    
    return {
      assignedAxes: axisStore.assignedCalibrationAxesIds,
      selectedAxes: calibStore.selectedAxes,
      axisMapping: calibStore.axisMapping
    };
  }

  // 将调试函数暴露到全局，以便在控制台调用
  if (typeof window !== 'undefined') {
    window.forceShowFifthImage = forceShowFifthImage;
    window.debugAxisSelection = debugAxisSelection;
    console.log('已注册全局调试函数 forceShowFifthImage() 和 debugAxisSelection()，可在控制台调用');
  }
  </script>
  
  <style scoped>
  .camera-view {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }
  
  #camera-display-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }
  
  .camera-image {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .camera-info-overlay {
    position: absolute;
    top: 10px;
    left: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 5px;
    border-radius: 4px;
    color: white;
    font-size: 12px;
  }
  
  .info-item {
    margin-bottom: 5px;
  }
  
  .info-label {
    font-weight: bold;
    margin-right: 5px;
  }
  
  /* 9张图片网格布局 - 已不再使用 */
  .calibration-images-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 10px;
    width: 100%;
    height: 100%;
    padding: 10px;
    box-sizing: border-box;
    background-color: #1e1e1e;
  }
  
  /* 单张图片全屏查看模式 */
  .calibration-fullscreen-view {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background-color: #222; /* 更友好的深灰色 */
    position: relative;
    overflow: auto;
    align-items: center;
    justify-content: center;
  }
  
  .calibration-image-fullscreen {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 320px;
    background: transparent;
  }
  
  .calibration-image-wrapper {
    width: 100%;
    max-width: 640px;
    max-height: 480px;
    aspect-ratio: 4/3;
    position: relative;
    background: #111;
    box-shadow: 0 0 10px #000;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .image-container {
    width: 100%;
    height: 100%;
    position: relative;
    aspect-ratio: 4/3;
    max-width: 640px;
    max-height: 480px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .calibration-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    background: #222;
    object-position: center center;
  }
  
  .calibration-image-index {
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 5px;
    font-size: 12px;
    text-align: center;
  }
  
  .detected-mark-rect {
    position: absolute;
    background-color: rgba(0, 255, 0, 0.1);
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
    border-width: 2px;
    border-style: solid;
    box-sizing: border-box;
  }
  
  .detected-mark-score {
    position: absolute;
    top: -22px;
    left: 0;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 4px;
    font-size: 12px;
    font-weight: bold;
    border-radius: 3px;
    text-shadow: 1px 1px 1px #000;
  }
  
  /* 导航控制条 */
  .calibration-nav-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background-color: rgba(0, 0, 0, 0.6);
    border-top: 1px solid #444;
  }
  
  .calibration-navigation {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 10px 0;
    gap: 10px;
    padding: 5px 0;
  }
  
  .nav-button {
    background-color: #2b2b2b;
    color: #fff;
    border: 1px solid #555;
    border-radius: 4px;
    padding: 8px 15px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  }
  
  .nav-button:hover:not(:disabled) {
    background-color: #444;
  }
  
  .nav-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .image-counter {
    display: inline-block;
    padding: 5px 10px;
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    color: white;
    font-size: 14px;
  }
  
  .calibration-image-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border: 1px solid #444;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
  }
  
  /* 标定图片缩略图导航 */
  .calibration-thumbnails {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    margin: 10px 0;
    padding: 10px;
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .calibration-thumbnail {
    position: relative;
    width: 64px;
    height: 48px;
    border: 2px solid #555;
    border-radius: 3px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  }
  
  .calibration-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .calibration-thumbnail.active {
    border-color: #00aaff;
    transform: scale(1.1);
    box-shadow: 0 0 5px rgba(0, 170, 255, 0.7);
    z-index: 1;
  }
  
  .calibration-thumbnail:hover:not(.active) {
    border-color: #999;
    transform: scale(1.05);
  }
  
  .thumbnail-index {
    position: absolute;
    bottom: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 1px 4px;
    font-size: 10px;
    border-top-left-radius: 3px;
  }
  
  /* 媒体查询 - 小屏幕适配 */
  @media (max-width: 700px) {
    .calibration-image-wrapper,
    .image-container {
      max-width: 98vw;
      max-height: 60vw;
      width: 100vw;
      height: auto;
    }
  }
  </style>