<template>
    <div 
      id="focus-roi-overlay" 
      class="roi-overlay" 
      :class="{ drawing: isDrawingROI }"
      :style="{ display: roiEnabled || isDrawingROI ? 'block' : 'none' }"
      @mousedown="startRoiDraw"
      @mousemove="updateRoiDraw"
      @mouseup="endRoiDraw"
      @mouseleave="endRoiDraw"
      @dblclick="finishPolygon"
    >
      <!-- ROI矩形 -->
      <div 
        v-if="roiCoords && (roiType === 'rect' || !roiType) && (roiEnabled || currentRoiRect)"
        class="roi-rect"
        :class="{ drawing: isDrawingROI }"
        :style="{
          left: `${roiCoords.l}px`,
          top: `${roiCoords.t}px`,
          width: `${roiCoords.r - roiCoords.l}px`,
          height: `${roiCoords.b - roiCoords.t}px`
        }"
      ></div>
      
      <!-- ROI多边形或椭圆 - 使用SVG -->
      <svg 
        v-if="roiType === 'polygon' || roiType === 'ellipse'"
        style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none;"
      >
        <!-- 多边形 -->
        <polygon
          v-if="roiType === 'polygon' && polygonPoints.length >= 3"
          :points="polygonPointsString"
          fill="rgba(255, 87, 34, 0.2)"
          stroke="#FF5722"
          stroke-width="2"
          :stroke-dasharray="isDrawingROI ? '5,5' : ''"
        ></polygon>
        
        <!-- 椭圆 -->
        <ellipse
          v-if="roiType === 'ellipse' && roiCoords && roiCoords.center"
          :cx="roiCoords.center.x"
          :cy="roiCoords.center.y"
          :rx="roiCoords.radius.x"
          :ry="roiCoords.radius.y"
          fill="rgba(255, 87, 34, 0.2)"
          stroke="#FF5722"
          stroke-width="2"
        ></ellipse>
      </svg>
      
      <!-- ROI信息显示 -->
      <div 
        v-if="showRoiInfo"
        class="roi-info"
        :style="{
          display: showRoiInfo ? 'block' : 'none'
        }"
      >
        {{ roiInfoText }}
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch } from 'vue';
  import { useRoiStore } from '../../stores/roi';
  
  const roiStore = useRoiStore();
  
  // 从store获取状态
  const isDrawingROI = computed(() => roiStore.isDrawingROI);
  const roiEnabled = computed(() => roiStore.roiEnabled);
  const roiCoords = computed(() => roiStore.roiCoords);
  const roiType = computed(() => roiStore.roiType);
  const polygonPoints = computed(() => roiStore.polygonPoints);
  const activeShapeTool = computed(() => roiStore.activeShapeTool);
  
  // 本地状态
  const currentRoiRect = ref(null);
  const isDrawing = ref(false);
  const startX = ref(0);
  const startY = ref(0);
  const showRoiInfo = ref(false);
  const roiInfoText = ref('');
  
  // 多边形点字符串
  const polygonPointsString = computed(() => {
    return polygonPoints.value.map(p => `${p.x},${p.y}`).join(' ');
  });
  
  // 绘制ROI相关函数
  function startRoiDraw(event) {
    if (!isDrawingROI.value || isDrawing.value) return;
    
    const rect = event.target.getBoundingClientRect();
    startX.value = event.clientX - rect.left;
    startY.value = event.clientY - rect.top;
    
    if (activeShapeTool.value === 'rect') {
      // 矩形绘制
      isDrawing.value = true;
      currentRoiRect.value = {
        l: startX.value,
        t: startY.value,
        r: startX.value,
        b: startY.value
      };
      
      // 显示ROI信息
      updateRoiInfo(startX.value, startY.value, startX.value, startY.value);
      showRoiInfo.value = true;
    } 
    else if (activeShapeTool.value === 'polygon') {
      // 多边形绘制 - 添加新点
      roiStore.addPolygonPoint(startX.value, startY.value);
      
      // 如果有至少3个点，显示信息
      if (polygonPoints.value.length >= 3) {
        const minX = Math.min(...polygonPoints.value.map(p => p.x));
        const minY = Math.min(...polygonPoints.value.map(p => p.y));
        const maxX = Math.max(...polygonPoints.value.map(p => p.x));
        const maxY = Math.max(...polygonPoints.value.map(p => p.y));
        
        updateRoiInfo(minX, minY, maxX, maxY);
        showRoiInfo.value = true;
      }
    }
    else if (activeShapeTool.value === 'ellipse') {
      // 椭圆绘制
      isDrawing.value = true;
      currentRoiRect.value = {
        l: startX.value,
        t: startY.value,
        r: startX.value,
        b: startY.value,
        center: { x: startX.value, y: startY.value },
        radius: { x: 0, y: 0 }
      };
      
      // 显示ROI信息
      updateRoiInfo(startX.value, startY.value, startX.value, startY.value);
      showRoiInfo.value = true;
    }
  }
  
  function updateRoiDraw(event) {
    if (!isDrawingROI.value) return;
    
    const rect = event.target.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    
    if (activeShapeTool.value === 'rect' && isDrawing.value) {
      // 矩形绘制更新
      const width = Math.abs(currentX - startX.value);
      const height = Math.abs(currentY - startY.value);
      const left = Math.min(startX.value, currentX);
      const top = Math.min(startY.value, currentY);
      
      currentRoiRect.value = {
        l: left,
        t: top,
        r: left + width,
        b: top + height
      };
      
      // 更新ROI坐标信息
      updateRoiInfo(left, top, left + width, top + height);
    }
    else if (activeShapeTool.value === 'polygon') {
      // 多边形绘制 - 只更新信息位置
      if (showRoiInfo.value) {
        roiInfoText.value = `多边形 (${polygonPoints.value.length}点)`;
      }
    }
    else if (activeShapeTool.value === 'ellipse' && isDrawing.value) {
      // 椭圆绘制更新
      const rx = Math.abs(currentX - startX.value) / 2;
      const ry = Math.abs(currentY - startY.value) / 2;
      const cx = (startX.value + currentX) / 2;
      const cy = (startY.value + currentY) / 2;
      
      currentRoiRect.value = {
        l: cx - rx,
        t: cy - ry,
        r: cx + rx,
        b: cy + ry,
        center: { x: cx, y: cy },
        radius: { x: rx, y: ry }
      };
      
      // 更新ROI坐标信息
      updateRoiInfo(cx - rx, cy - ry, cx + rx, cy + ry);
    }
  }
  
  function endRoiDraw(event) {
    if (!isDrawingROI.value) return;
    
    if (activeShapeTool.value === 'rect' && isDrawing.value) {
      isDrawing.value = false;
      
      if (!currentRoiRect.value) return;
      
      // 保存ROI坐标到状态
      roiStore.setROICoords(currentRoiRect.value);
      roiStore.roiType = 'rect';
    }
    else if (activeShapeTool.value === 'ellipse' && isDrawing.value) {
      isDrawing.value = false;
      
      if (!currentRoiRect.value) return;
      
      // 保存椭圆ROI坐标到状态
      roiStore.setROICoords(currentRoiRect.value);
      roiStore.roiType = 'ellipse';
    }
    // 多边形在点击时不需结束绘制
  }
  
  function finishPolygon() {
    if (activeShapeTool.value === 'polygon' && polygonPoints.value.length >= 3) {
      roiStore.finishPolygon();
      showRoiInfo.value = false;
    }
  }
  
  function updateRoiInfo(left, top, right, bottom) {
    const width = right - left;
    const height = bottom - top;
    
    roiInfoText.value = `L:${Math.round(left)} T:${Math.round(top)} W:${Math.round(width)} H:${Math.round(height)}`;
  }
  
  // 监听ROI状态变化
  watch(() => roiStore.isDrawingROI, (newVal) => {
    if (!newVal) {
      showRoiInfo.value = false;
    }
  });
  </script>