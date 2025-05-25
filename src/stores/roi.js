// src/stores/roi.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useCameraStore } from './camera';
import { useCalibrationStore } from './calibration'; // Added for static image check

export const useRoiStore = defineStore('roi', () => {
  // 状态
  const isDrawingROI = ref(false);
  const roiEnabled = ref(false);
  const roiCoords = ref({ l: 150, t: 100, r: 450, b: 400 });
  const roiType = ref('rect'); // 'rect', 'ellipse', 'polygon'
  const polygonPoints = ref([]);
  const activeShapeTool = ref('rect');
  const activeDrawMode = ref('draw');
  const selectionPurpose = ref(null); // e.g., 'template', 'measurement'
  const capturedTemplateDataUrl = ref(null);
  const isDrawingTemplateOnOverlay = ref(false); // New state for template drawing
  const templateDataUrlForOverlay = ref(null); // New state for template data URL for overlay
  const lastValidRoiCoords = ref(null); // 新增：保存最后一次有效的ROI坐标

  // 用户定义的模板ROI尺寸
  const userDefinedTemplateRoiSize = ref(null); // { width, height }

  // 方法
  // 开始选择ROI，并指定用途
  function startRoiSelection(purpose) {
    const cameraStore = useCameraStore();
    const calibStore = useCalibrationStore(); // Moved up for earlier access

    // Allow template selection even if camera not connected, assuming static images are used for template.
    if (!cameraStore.isConnected && purpose !== 'template') { 
        console.warn('Camera not connected, cannot start ROI selection unless for template.');
        return false;
    }
    
    // 记录当前选择用途
    selectionPurpose.value = purpose;
    
    // 如果要重新绘制，先备份当前模板状态
    const isTemplateSelection = purpose === 'template';
    const templateDataBackup = isTemplateSelection ? capturedTemplateDataUrl.value : null;
    const templateWasVisible = isDrawingTemplateOnOverlay.value;
    
    // 开始绘制模式
    isDrawingROI.value = true;
    
    // 暂时隐藏现有ROI以便重绘
    roiEnabled.value = false;
    
    // 如果正在显示模板，先隐藏它以避免干扰绘制
    if (isDrawingTemplateOnOverlay.value) {
      isDrawingTemplateOnOverlay.value = false;
      templateDataUrlForOverlay.value = null;
    }
    
    // 对于非模板ROI，清除现有ROI坐标(模板需要保留原来的坐标作为参考)
    if (!isTemplateSelection) {
      // 清除多边形点
      polygonPoints.value = [];
    }
    
    console.log(`ROI selection started for purpose: ${purpose}`);
    return true;
  }
  
  // 停止绘制ROI
  function stopDrawingROI() {
    isDrawingROI.value = false;
    return true;
  }
  
  // 确认ROI
  async function confirmROI() {
    if (!isDrawingROI.value) return false;
    
    // 检查ROI坐标有效性
    if (roiCoords.value) {
      const width = roiCoords.value.r - roiCoords.value.l;
      const height = roiCoords.value.b - roiCoords.value.t;
      
      // 如果宽度或高度无效，不允许确认或恢复到最后有效值
      if (width <= 0 || height <= 0) {
        console.warn('无效的ROI尺寸，宽度或高度为0，尝试恢复有效值');
        
        // 如果有最后有效值，则恢复
        if (lastValidRoiCoords.value) {
          roiCoords.value = {...lastValidRoiCoords.value};
          console.log('已恢复到最后有效的ROI坐标');
        } else {
          console.warn('无法确认ROI：尺寸无效且没有可恢复的有效坐标');
          return false;
        }
      } else {
        // 保存当前有效坐标作为最后有效值
        lastValidRoiCoords.value = {...roiCoords.value};
      }
    } else {
      console.warn('无法确认ROI：坐标不存在');
      return false;
    }
    
    // 检查如果是多边形，确保有足够的点
    if (roiType.value === 'polygon' && polygonPoints.value.length < 3) {
      console.warn('多边形需要至少3个点才能确认');
      return false;
    }
    
    roiEnabled.value = true;
    isDrawingROI.value = false;
    
    console.log('ROI确认 - ROI用途:', selectionPurpose.value);

    if (selectionPurpose.value === 'template') {
      const cameraStore = useCameraStore();
      const calibrationStore = useCalibrationStore();
      
      try {
        // 获取当前图像源
        let imageSrc = cameraStore.cameraImageUrl;

        // 检查是否应该使用静态9点图像
        const isStaticImageMode = calibrationStore.selectedAxes.includes('X') && calibrationStore.selectedAxes.includes('Y');
        if (isStaticImageMode) {
          imageSrc = '/9dian/12_161833.png'; // 使用标定图片
        }
        
        if (!imageSrc) {
          console.error('没有可用的图像源进行模板截取');
          selectionPurpose.value = null;
          return false;
        }

        console.log('尝试从图像截取模板:', imageSrc.substring(0, 50) + '...');
        console.log('ROI坐标:', roiCoords.value);
        
        // 保存截取前的ROI坐标
        const roiCoordsBefore = {...roiCoords.value};
        
        // 截取模板图像
        const croppedData = await cropImage(imageSrc, roiCoords.value);
        
        // 确保ROI坐标在截取后未被修改
        roiCoords.value = roiCoordsBefore;
        
        if (croppedData) {
          console.log('模板截取成功，DataURL设置完成，长度:', croppedData.length);
          
          // 设置模板数据
          capturedTemplateDataUrl.value = croppedData;
          
          // 直接同步到calibrationStore
          if (calibrationStore.templateMatchingParams) {
            console.log('直接同步模板数据到calibrationStore');
            calibrationStore.templateMatchingParams.templateImageSrc = croppedData;
          }
          
          // 自动显示模板在ROI上
          toggleTemplateDrawingOnOverlay(croppedData);
          
          // 触发一个自定义事件，确保所有监听者都能接收到更新
          try {
            window.dispatchEvent(new CustomEvent('template-captured', { 
              detail: { templateDataUrl: croppedData } 
            }));
            console.log('已触发template-captured事件');
          } catch (err) {
            console.warn('触发自定义事件失败:', err);
          }
        } else {
          console.error('模板截取失败，没有返回数据');
        }
      } catch (error) {
        console.error('模板截取过程中出错:', error);
      }
      
      // After successfully capturing template, also save its dimensions
      if (roiCoords.value) {
        const width = roiCoords.value.r - roiCoords.value.l;
        const height = roiCoords.value.b - roiCoords.value.t;
        if (width > 0 && height > 0) {
          setUserDefinedTemplateRoiSize({ width, height });
        } else {
          console.warn('Confirmed ROI for template has invalid dimensions, not saving size.', {width, height});
        }
      }
    }
    
    selectionPurpose.value = null;
    return true;
  }

  // 图像截取函数
  async function cropImage(imageSrc, cropRect) {
    return new Promise((resolve, reject) => {
      // 创建一个新图像对象来加载源图像
      const img = new Image();
      img.crossOrigin = 'Anonymous'; // 处理可能的CORS问题
      
      img.onload = () => {
        try {
          console.log('图像已加载，尺寸:', img.width, 'x', img.height);
          
          // 创建一个Canvas元素
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // 计算实际裁剪区域（确保在图像边界内）
          const cropX = Math.max(0, Math.floor(cropRect.l));
          const cropY = Math.max(0, Math.floor(cropRect.t));
          const cropWidth = Math.min(img.width - cropX, Math.floor(cropRect.r - cropRect.l));
          const cropHeight = Math.min(img.height - cropY, Math.floor(cropRect.b - cropRect.t));
          
          console.log('裁剪区域:', cropX, cropY, cropWidth, cropHeight);
          
          // 验证裁剪尺寸
          if (cropWidth <= 0 || cropHeight <= 0) {
            console.error('无效的裁剪尺寸:', cropWidth, cropHeight);
            reject(new Error('无效的裁剪尺寸'));
            return;
          }
          
          // 设置Canvas尺寸为裁剪区域大小
          canvas.width = cropWidth;
          canvas.height = cropHeight;
          
          // 将裁剪区域绘制到Canvas上
          ctx.drawImage(
            img,
            cropX, cropY, cropWidth, cropHeight, // 源图像裁剪区域
            0, 0, cropWidth, cropHeight          // 目标Canvas区域
          );
          
          // 转换Canvas为DataURL
          // 尝试使用高质量无损PNG格式
          const dataURL = canvas.toDataURL('image/png', 1.0);
          
          // 验证输出
          if (!dataURL || dataURL.length < 100 || !dataURL.startsWith('data:image/')) {
            console.error('生成的DataURL无效');
            reject(new Error('生成的DataURL无效'));
            return;
          }
          
          console.log('模板截取成功，DataURL长度:', dataURL.length);
          resolve(dataURL);
        } catch (err) {
          console.error('Canvas操作错误:', err);
          reject(err);
        }
      };
      
      img.onerror = (err) => {
        console.error('图像加载失败:', err);
        reject(new Error('图像加载失败'));
      };
      
      // 开始加载图像
      if (!imageSrc) {
        console.error('图像源为空');
        reject(new Error('图像源为空'));
        return;
      }
      
      // 设置图像源，开始加载
      img.src = imageSrc;
    });
  }

  function clearCapturedTemplateDataUrl() {
    if (!capturedTemplateDataUrl.value) {
      console.log('没有模板数据需要清除');
      return false;
    }
    
    // 先停止模板显示
    if (isDrawingTemplateOnOverlay.value) {
      isDrawingTemplateOnOverlay.value = false;
      templateDataUrlForOverlay.value = null;
      console.log('停止模板显示');
    }
    
    // 再清除模板数据
    capturedTemplateDataUrl.value = null;
    console.log('模板数据已清除');
    
    // 同步清除calibrationStore中的模板
    try {
      const calibrationStore = useCalibrationStore();
      if (calibrationStore.templateMatchingParams && calibrationStore.templateMatchingParams.templateImageSrc) {
        calibrationStore.templateMatchingParams.templateImageSrc = null;
        console.log('已清除calibrationStore中的模板数据');
      }
    } catch (err) {
      console.warn('清除calibrationStore模板数据失败:', err);
    }
    
    // 触发自定义事件，通知模板已删除
    try {
      window.dispatchEvent(new CustomEvent('template-cleared', { 
        detail: { timestamp: Date.now() } 
      }));
      console.log('已触发template-cleared事件');
    } catch (err) {
      console.warn('触发template-cleared事件失败:', err);
    }
    
    // 清除用户定义的模板ROI尺寸
    clearUserDefinedTemplateRoiSize();
    
    console.log('模板数据清除完成');
    return true;
  }

  // Action to toggle template drawing on the overlay
  function toggleTemplateDrawingOnOverlay(templateDataUrl = null) {
    // 如果模板已显示，则隐藏它
    if (isDrawingTemplateOnOverlay.value) {
      console.log('关闭模板显示');
      isDrawingTemplateOnOverlay.value = false;
      templateDataUrlForOverlay.value = null;
    } 
    // 如果提供了新模板，则使用新模板显示
    else if (templateDataUrl) {
      console.log('开始显示模板，DataURL长度:', templateDataUrl.length);
      
      // 确保有有效的ROI坐标
      if (!roiCoords.value || 
          (roiCoords.value.r - roiCoords.value.l <= 0) || 
          (roiCoords.value.b - roiCoords.value.t <= 0)) {
        
        console.log('当前ROI坐标无效，尝试使用最后有效坐标');
        if (lastValidRoiCoords.value) {
          // 恢复有效坐标
          roiCoords.value = {...lastValidRoiCoords.value};
          console.log('已恢复使用有效ROI坐标:', roiCoords.value);
        } else {
          // 使用默认坐标
          roiCoords.value = { l: 150, t: 100, r: 450, b: 400 };
          console.log('使用默认ROI坐标');
        }
      }
      
      isDrawingTemplateOnOverlay.value = true;
      templateDataUrlForOverlay.value = templateDataUrl;
      
      // 确保ROI已启用，以便显示模板
      if (!roiEnabled.value) {
        console.log('自动启用ROI显示以支持模板显示');
        roiEnabled.value = true;
      }
    } 
    // 如果没提供新模板但存在已捕获的模板，使用已有模板
    else if (capturedTemplateDataUrl.value) {
      console.log('使用现有模板显示，DataURL长度:', capturedTemplateDataUrl.value.length);
      
      // 同样确保有有效的ROI坐标
      if (!roiCoords.value || 
          (roiCoords.value.r - roiCoords.value.l <= 0) || 
          (roiCoords.value.b - roiCoords.value.t <= 0)) {
        
        console.log('当前ROI坐标无效，尝试使用最后有效坐标');
        if (lastValidRoiCoords.value) {
          // 恢复有效坐标
          roiCoords.value = {...lastValidRoiCoords.value};
          console.log('已恢复使用有效ROI坐标:', roiCoords.value);
        } else {
          // 使用默认坐标
          roiCoords.value = { l: 150, t: 100, r: 450, b: 400 };
          console.log('使用默认ROI坐标');
        }
      }
      
      isDrawingTemplateOnOverlay.value = true;
      templateDataUrlForOverlay.value = capturedTemplateDataUrl.value;
      
      // 确保ROI已启用，以便显示模板
      if (!roiEnabled.value) {
        console.log('自动启用ROI显示以支持模板显示');
        roiEnabled.value = true;
      }
    } else {
      console.warn('无法显示模板：未提供模板数据且没有已捕获的模板');
    }
    
    // 返回当前显示状态
    return isDrawingTemplateOnOverlay.value;
  }
  
  // 清除ROI
  function clearROI() {
    const cameraStore = useCameraStore();
    // 如果相机未连接且没有模板数据，不允许清除操作
    if (!cameraStore.isConnected && !capturedTemplateDataUrl.value) {
      console.warn('相机未连接，且无模板数据，无需清除ROI');
      return false;
    }
    
    // 备份模板数据 - 在任何操作前先保存
    const templateDataBackup = capturedTemplateDataUrl.value;
    const templateOverlayBackup = templateDataUrlForOverlay.value;
    const wasDrawingTemplate = isDrawingTemplateOnOverlay.value;
    
    console.log('清除ROI - 备份模板数据状态:');
    console.log('- 模板数据:', !!templateDataBackup);
    console.log('- 显示模板:', !!templateOverlayBackup);
    console.log('- 模板显示状态:', wasDrawingTemplate);
    
    // 停止绘制模式(如果正在绘制)
    if (isDrawingROI.value) {
      isDrawingROI.value = false;
    }
    
    // 清除ROI相关的状态
    roiEnabled.value = false;
    
    // 重置ROI坐标到默认值
    roiCoords.value = { l: 150, t: 100, r: 450, b: 400 };
    polygonPoints.value = [];
    // Do NOT clear userDefinedTemplateRoiSize here, as it should persist
    // unless explicitly reset by another action.
    
    // 如果正在绘制模板，先关闭绘制（但保留模板数据）
    if (isDrawingTemplateOnOverlay.value) {
      console.log('停止模板绘制，但保留模板数据');
      isDrawingTemplateOnOverlay.value = false;
      templateDataUrlForOverlay.value = null;
    }
    
    // 保证模板数据不丢失
    if (templateDataBackup) {
      console.log('恢复模板数据 (长度:', templateDataBackup.length, ')');
      capturedTemplateDataUrl.value = templateDataBackup;
    }
    
    // 在短暂延迟后恢复模板显示（如果之前在显示）
    if (wasDrawingTemplate && templateOverlayBackup) {
      console.log('计划恢复模板显示');
      setTimeout(() => {
        // 重新检查是否真的需要恢复模板显示
        if (capturedTemplateDataUrl.value) {
          console.log('恢复模板显示');
          // 确保ROI坐标有效，使用lastValidRoiCoords如果可用
          if (lastValidRoiCoords.value) {
            roiCoords.value = {...lastValidRoiCoords.value};
          }
          isDrawingTemplateOnOverlay.value = true;
          templateDataUrlForOverlay.value = templateOverlayBackup;
          
          // 启用ROI来支持模板显示
          roiEnabled.value = true;
        } else {
          console.log('不再需要恢复模板显示，模板数据已不存在');
        }
      }, 200);
    }
    
    console.log('ROI已清除');
    return true;
  }
  
  // 切换ROI可见性
  function toggleROIVisibility() {
    const cameraStore = useCameraStore();
    if (!cameraStore.isConnected) return false;
    
    roiEnabled.value = !roiEnabled.value;
    return true;
  }
  
  // 设置ROI坐标
  function setROICoords(coords) {
    // 验证坐标有效性
    if (!coords) {
      console.warn('设置ROI坐标失败：提供的坐标为空');
      return false;
    }

    // 对于矩形和多边形ROI，确保宽度和高度不为0
    if (roiType.value === 'rect' || roiType.value === 'polygon') {
      const width = coords.r - coords.l;
      const height = coords.b - coords.t;
      
      if (width <= 0 || height <= 0) {
        if (isDrawingROI.value) {
          // 绘制过程中允许临时的无效值
          roiCoords.value = coords;
        } else {
          console.warn('设置ROI坐标失败：宽度或高度为0', {width, height});
          // 如果有最后有效值且不是在绘制过程中，则使用最后有效值
          if (lastValidRoiCoords.value) {
            roiCoords.value = {...lastValidRoiCoords.value};
          }
          return false;
        }
      } else {
        // 有效坐标，保存并更新最后有效值
        roiCoords.value = coords;
        lastValidRoiCoords.value = {...coords};
      }
    } 
    // 对于椭圆ROI，验证半径
    else if (roiType.value === 'ellipse') {
      if (coords.radius && (coords.radius.x <= 0 || coords.radius.y <= 0)) {
        if (isDrawingROI.value) {
          // 绘制过程中允许临时的无效值
          roiCoords.value = coords;
        } else {
          console.warn('设置ROI椭圆坐标失败：半径无效', coords.radius);
          if (lastValidRoiCoords.value) {
            roiCoords.value = {...lastValidRoiCoords.value};
          }
          return false;
        }
      } else {
        // 有效坐标，保存并更新最后有效值
        roiCoords.value = coords;
        lastValidRoiCoords.value = {...coords};
      }
    }
    else {
      // 其他类型或未知类型，直接设置
      roiCoords.value = coords;
      // 如果坐标看起来有效，保存为最后有效值
      if (coords.l !== undefined && coords.t !== undefined && 
          coords.r !== undefined && coords.b !== undefined) {
        lastValidRoiCoords.value = {...coords};
      }
    }
    
    return true;
  }
  
  // 添加多边形点
  function addPolygonPoint(x, y) {
    polygonPoints.value.push({ x, y });
    return true;
  }
  
  // 完成多边形
  function finishPolygon() {
    if (polygonPoints.value.length < 3) return false;
    
    // 计算多边形的边界框
    const minX = Math.min(...polygonPoints.value.map(p => p.x));
    const minY = Math.min(...polygonPoints.value.map(p => p.y));
    const maxX = Math.max(...polygonPoints.value.map(p => p.x));
    const maxY = Math.max(...polygonPoints.value.map(p => p.y));
    
    // 更新ROI坐标
    roiCoords.value = {
      l: minX,
      t: minY,
      r: maxX,
      b: maxY,
      type: 'polygon',
      points: [...polygonPoints.value]
    };
    
    roiType.value = 'polygon';
    roiEnabled.value = true;
    isDrawingROI.value = false;
    
    return true;
  }
  
  // 切换ROI形状工具
  function switchROITool(tool) {
    activeShapeTool.value = tool;
    return true;
  }
  
  // 切换绘制/编辑模式
  function switchDrawMode(mode) {
    activeDrawMode.value = mode;
    return true;
  }

  function setRoiShape(shape) {
    roiType.value = shape;
  }

  // Action to set the user-defined template ROI size
  function setUserDefinedTemplateRoiSize(size) { // size: { width, height }
    if (size && typeof size.width === 'number' && typeof size.height === 'number') {
      userDefinedTemplateRoiSize.value = { ...size };
      console.log('User defined template ROI size set to:', userDefinedTemplateRoiSize.value);
    } else {
      console.warn('Invalid size provided for userDefinedTemplateRoiSize:', size);
    }
  }

  // Action to clear the user-defined template ROI size
  function clearUserDefinedTemplateRoiSize() {
    userDefinedTemplateRoiSize.value = null;
    console.log('User defined template ROI size cleared.');
  }

  return {
    // 状态
    isDrawingROI,
    roiEnabled,
    roiCoords,
    roiType,
    polygonPoints,
    activeShapeTool,
    activeDrawMode,
    selectionPurpose,
    capturedTemplateDataUrl,
    isDrawingTemplateOnOverlay, // expose new state
    templateDataUrlForOverlay, // expose new state
    userDefinedTemplateRoiSize, // Expose new state
    lastValidRoiCoords, // Expose new state
    
    // 方法
    startRoiSelection, // Renamed from startDrawingROI
    stopDrawingROI,
    confirmROI,
    clearROI,
    toggleROIVisibility,
    setROICoords,
    addPolygonPoint,
    finishPolygon,
    switchROITool,
    clearCapturedTemplateDataUrl,
    toggleTemplateDrawingOnOverlay, // expose new action
    setRoiShape, // expose setRoiShape
    setUserDefinedTemplateRoiSize, // Expose new action
    clearUserDefinedTemplateRoiSize, // Expose new action
    switchDrawMode,
  };
});