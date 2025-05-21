// src/stores/roi.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useCameraStore } from './camera';

export const useRoiStore = defineStore('roi', () => {
  // 状态
  const isDrawingROI = ref(false);
  const roiEnabled = ref(false);
  const roiCoords = ref({ l: 150, t: 100, r: 450, b: 400 });
  const roiType = ref('rect'); // 'rect', 'ellipse', 'polygon'
  const polygonPoints = ref([]);
  const activeShapeTool = ref('rect');
  const activeDrawMode = ref('draw');
  
  // 方法
  // 开始绘制ROI
  function startDrawingROI() {
    const cameraStore = useCameraStore();
    if (!cameraStore.isConnected) return false;
    
    isDrawingROI.value = true;
    return true;
  }
  
  // 停止绘制ROI
  function stopDrawingROI() {
    isDrawingROI.value = false;
    return true;
  }
  
  // 确认ROI
  function confirmROI() {
    if (!isDrawingROI.value) return false;
    
    roiEnabled.value = true;
    isDrawingROI.value = false;
    return true;
  }
  
  // 清除ROI
  function clearROI() {
    const cameraStore = useCameraStore();
    if (!cameraStore.isConnected) return false;
    
    roiEnabled.value = false;
    isDrawingROI.value = false;
    roiCoords.value = { l: 150, t: 100, r: 450, b: 400 };
    polygonPoints.value = [];
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
    roiCoords.value = coords;
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

  return {
    // 状态
    isDrawingROI,
    roiEnabled,
    roiCoords,
    roiType,
    polygonPoints,
    activeShapeTool,
    activeDrawMode,
    
    // 方法
    startDrawingROI,
    stopDrawingROI,
    confirmROI,
    clearROI,
    toggleROIVisibility,
    setROICoords,
    addPolygonPoint,
    finishPolygon,
    switchROITool,
    switchDrawMode
  };
});