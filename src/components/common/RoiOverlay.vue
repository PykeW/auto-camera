<template>
    <div 
      id="focus-roi-overlay" 
      class="roi-overlay" 
      :class="{ drawing: isDrawingROI && !isAutoTargeting }"
      :style="{ 
        display: roiEnabled || isDrawingROI || roiStore.isDrawingTemplateOnOverlay || calibrationStore.isCalibrating || isAutoTargeting ? 'block' : 'none',
        pointerEvents: roiStore.isDrawingTemplateOnOverlay || calibrationStore.isCalibrating || isAutoTargeting ? 'none' : 'auto'
      }"
      @mousedown="startRoiDraw"
      @mousemove="updateRoiDraw"
      @mouseup="endRoiDraw"
      @mouseleave="endRoiDraw"
      @dblclick="finishPolygon"
    >
      <!-- 添加ROI工具面板 -->
      <RoiToolsPanel
        v-if="!isAutoTargeting"
        @shape-change="handleShapeChange"
        @confirm="handleRoiConfirm"
      />
      
      <!-- ROI矩形 -->
      <div 
        v-if="(roiCoords && (roiType === 'rect' || !roiType) && (roiEnabled || currentRoiRect) && !roiStore.isDrawingTemplateOnOverlay && !isAutoTargeting) || isAutoTargeting"
        class="roi-rect"
        :class="{ drawing: isDrawingROI && !isAutoTargeting }"
        :style="isAutoTargeting ? {
          left: `${props.autoTargetCenter.x - props.autoTargetSize.width / 2}px`,
          top: `${props.autoTargetCenter.y - props.autoTargetSize.height / 2}px`,
          width: `${props.autoTargetSize.width}px`,
          height: `${props.autoTargetSize.height}px`,
          borderColor: 'blue', 
        } : {
          left: `${roiCoords.l}px`,
          top: `${roiCoords.t}px`,
          width: `${roiCoords.r - roiCoords.l}px`,
          height: `${roiCoords.b - roiCoords.t}px`
        }"
      ></div>
      
      <!-- ROI多边形或椭圆 - 使用SVG -->
      <svg 
        v-if="(roiType === 'polygon' || roiType === 'ellipse') && !roiStore.isDrawingTemplateOnOverlay && !isAutoTargeting"
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
        
        <!-- 多边形绘制中的点和线 -->
        <template v-if="roiType === 'polygon' && isDrawingROI && polygonPoints.length > 0">
          <!-- 绘制已添加的点 -->
          <circle
            v-for="(point, index) in polygonPoints"
            :key="index"
            :cx="point.x"
            :cy="point.y"
            r="4"
            fill="#FF5722"
            stroke="#FFF"
            stroke-width="1"
          ></circle>
          
          <!-- 绘制点之间的线段 -->
          <polyline
            v-if="polygonPoints.length >= 2"
            :points="polygonPointsString"
            fill="none"
            stroke="#FF5722"
            stroke-width="2"
            stroke-dasharray="5,5"
          ></polyline>
        </template>
        
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

      <!-- Template Image Overlay -->
      <img 
        v-if="roiStore.isDrawingTemplateOnOverlay && roiStore.templateDataUrlForOverlay"
        :src="roiStore.templateDataUrlForOverlay"
        alt="Template Overlay"
        class="template-on-overlay-img"
        :style="{
          position: 'absolute',
          left: `${roiCoords?.l || 0}px`,
          top: `${roiCoords?.t || 0}px`,
          width: `${(roiCoords?.r || 0) - (roiCoords?.l || 0)}px`,
          height: `${(roiCoords?.b || 0) - (roiCoords?.t || 0)}px`,
          border: '2px dashed #00ff00',
          opacity: 0.8,
          pointerEvents: 'none',
          objectFit: 'contain',
          zIndex: 10
        }"
      />
      
      <!-- Display Detected Template Marks -->
      <template v-if="calibrationStore.detectedTemplatedMarks.length > 0">
        <div 
          v-for="(mark, index) in calibrationStore.detectedTemplatedMarks" 
          :key="index" 
          class="detected-mark-rect"
          :style="{
            left: `${mark.rect.x}px`,
            top: `${mark.rect.y}px`,
            width: `${mark.rect.width}px`,
            height: `${mark.rect.height}px`,
            borderColor: mark.score > 0.9 ? '#00FF00' : (mark.score > 0.7 ? '#FFFF00' : '#FF8C00'), // Green for high, Yellow for mid, Orange for lower scores
            position: 'absolute',
            borderWidth: '2px',
            borderStyle: 'solid',
            boxSizing: 'border-box',
            pointerEvents: 'none'
          }"
        >
          <span class="detected-mark-score">{{ mark.score.toFixed(2) }}</span>
        </div>
      </template>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch, onMounted } from 'vue';
  import { useRoiStore } from '../../stores/roi';
  import { useCalibrationStore } from '../../stores/calibration'; // Import calibration store
  import RoiToolsPanel from './RoiToolsPanel.vue'; // 导入ROI工具面板组件
  
  // Props for automatic targeting
  const props = defineProps({
    autoTargetCenter: { // Mark点中心 { x, y }
      type: Object,
      default: null
    },
    autoTargetSize: { // ROI 框大小 { width, height }
      type: Object,
      default: null // e.g., { width: 50, height: 50 }
    }
  });
  
  // 添加emit定义
  const emit = defineEmits(['roi-confirm', 'shape-change']);
  
  const roiStore = useRoiStore();
  const calibrationStore = useCalibrationStore(); // Initialize calibration store
  
  // 从store获取状态
  const isDrawingROI = computed(() => roiStore.isDrawingROI);
  const roiEnabled = computed(() => roiStore.roiEnabled);
  const roiCoords = computed(() => roiStore.roiCoords); // This will be used for positioning the template
  const roiType = computed(() => roiStore.roiType);
  const polygonPoints = computed(() => roiStore.polygonPoints);
  const activeShapeTool = computed(() => roiStore.activeShapeTool);
  
  // Computed property to check if auto-targeting is active
  const isAutoTargeting = computed(() => {
    return props.autoTargetCenter && props.autoTargetSize && 
           typeof props.autoTargetCenter.x === 'number' &&
           typeof props.autoTargetCenter.y === 'number' &&
           typeof props.autoTargetSize.width === 'number' &&
           typeof props.autoTargetSize.height === 'number';
  });
  
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
  
  // 组件挂载时确保初始ROI坐标有效
  onMounted(() => {
    // 如果存在默认ROI坐标，保存一份作为有效坐标
    if (roiCoords.value && 
        roiCoords.value.l !== undefined && 
        roiCoords.value.t !== undefined &&
        roiCoords.value.r !== undefined && 
        roiCoords.value.b !== undefined) {
      const width = roiCoords.value.r - roiCoords.value.l;
      const height = roiCoords.value.b - roiCoords.value.t;
      
      if (width > 0 && height > 0) {
        console.log('组件挂载时保存初始有效ROI坐标');
        // 保存初始有效坐标
        if (!roiStore.lastValidRoiCoords) {
          roiStore.lastValidRoiCoords = {...roiCoords.value};
        }
      }
    }
  });
  
  // 绘制ROI相关函数
  function startRoiDraw(event) {
    if (isAutoTargeting.value) return; // Disable drawing if auto-targeting
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
        b: startX.value
      };
      
      // 更新ROI信息但不显示
      updateRoiInfo(startX.value, startY.value, startX.value, startY.value);
      // showRoiInfo.value = true; // 注释掉，不显示ROI信息

      // 实时更新store中的ROI信息
      roiStore.setROICoords(currentRoiRect.value);
    } 
    else if (activeShapeTool.value === 'polygon') {
      // 多边形绘制 - 添加新点
      roiStore.addPolygonPoint(startX.value, startY.value);
      
      // 从第一个点开始就更新ROI
      if (polygonPoints.value.length >= 1) {
        // 计算当前多边形的边界框
        const points = [...polygonPoints.value];
        
        // 如果只有一个点，使用点的坐标作为边界
        if (points.length === 1) {
          const point = points[0];
          updateRoiInfo(point.x, point.y, point.x, point.y);
          // showRoiInfo.value = true; // 注释掉，不显示ROI信息
          
          // 更新store中的ROI信息
          roiStore.setROICoords({
            l: point.x,
            t: point.y,
            r: point.x,
            b: point.y,
            type: 'polygon',
            points: [...points]
          });
        } else {
          // 两个或更多点时，计算边界框
          const minX = Math.min(...points.map(p => p.x));
          const minY = Math.min(...points.map(p => p.y));
          const maxX = Math.max(...points.map(p => p.x));
          const maxY = Math.max(...points.map(p => p.y));
          
          updateRoiInfo(minX, minY, maxX, maxY);
          // showRoiInfo.value = true; // 注释掉，不显示ROI信息

          // 实时更新store中的ROI多边形信息
          roiStore.setROICoords({
            l: minX,
            t: minY,
            r: maxX,
            b: maxY,
            type: 'polygon',
            points: [...points]
          });
        }
        
        roiStore.roiType = 'polygon';
      }
    }
    else if (activeShapeTool.value === 'ellipse') {
      // 椭圆绘制
      isDrawing.value = true;
      currentRoiRect.value = {
        l: startX.value,
        t: startY.value,
        r: startX.value,
        b: startX.value,
        center: { x: startX.value, y: startY.value },
        radius: { x: 0, y: 0 }
      };
      
      // 更新ROI信息但不显示
      updateRoiInfo(startX.value, startY.value, startX.value, startY.value);
      // showRoiInfo.value = true; // 注释掉，不显示ROI信息

      // 实时更新store中的ROI信息
      roiStore.setROICoords(currentRoiRect.value);
      roiStore.roiType = 'ellipse';
    }
  }
  
  function updateRoiDraw(event) {
    if (isAutoTargeting.value) return; // Disable drawing if auto-targeting
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
      
      // 更新ROI坐标信息，但不显示
      updateRoiInfo(left, top, left + width, top + height);

      // 实时更新store中的ROI信息
      roiStore.setROICoords(currentRoiRect.value);
    }
    else if (activeShapeTool.value === 'polygon') {
      // 多边形绘制 - 只更新信息不显示
      // if (showRoiInfo.value) { // 注释掉，不以showRoiInfo为条件
        roiInfoText.value = `多边形 (${polygonPoints.value.length}点)`;
        
        // 从第一个点开始就更新多边形信息
        if (polygonPoints.value.length >= 1) {
          const points = [...polygonPoints.value];
          
          // 如果只有一个点，使用点的坐标作为边界
          if (points.length === 1) {
            const point = points[0];
            updateRoiInfo(point.x, point.y, point.x, point.y);
          } else {
            // 两个或更多点时，计算边界框
            const minX = Math.min(...points.map(p => p.x));
            const minY = Math.min(...points.map(p => p.y));
            const maxX = Math.max(...points.map(p => p.x));
            const maxY = Math.max(...points.map(p => p.y));
            
            updateRoiInfo(minX, minY, maxX, maxY);
          }
        }
      // } // 注释掉，不以showRoiInfo为条件
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
      
      // 更新ROI坐标信息但不显示
      updateRoiInfo(cx - rx, cy - ry, cx + rx, cy + ry);

      // 实时更新store中的ROI椭圆信息
      roiStore.setROICoords(currentRoiRect.value);
    }
  }
  
  function endRoiDraw(event) {
    if (isAutoTargeting.value) return; // Disable drawing if auto-targeting
    if (!isDrawingROI.value) return;
    
    if (activeShapeTool.value === 'rect' && isDrawing.value) {
      isDrawing.value = false;
      
      if (!currentRoiRect.value) return;
      
      // 保存ROI坐标到状态
      roiStore.setROICoords(currentRoiRect.value);
      roiStore.roiType = 'rect';
      roiStore.roiEnabled = true;
    }
    else if (activeShapeTool.value === 'ellipse' && isDrawing.value) {
      isDrawing.value = false;
      
      if (!currentRoiRect.value) return;
      
      // 保存椭圆ROI坐标到状态
      roiStore.setROICoords(currentRoiRect.value);
      roiStore.roiType = 'ellipse';
      roiStore.roiEnabled = true;
    }
    // 多边形在点击时不需结束绘制
  }
  
  function finishPolygon() {
    if (isAutoTargeting.value) return; // Disable drawing if auto-targeting
    // 如果是多边形工具且至少有3个点，才完成多边形
    if (activeShapeTool.value === 'polygon' && polygonPoints.value.length >= 3) {
      roiStore.finishPolygon();
      showRoiInfo.value = false;
    }
    // 如果点数不足3个，提示用户
    else if (activeShapeTool.value === 'polygon' && polygonPoints.value.length > 0) {
      // 这里可以添加提示逻辑，例如显示一个提示信息
      roiInfoText.value = "需要至少3个点才能完成多边形";
      // 不清除已有的点，让用户继续添加
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

  // 修改处理ROI工具面板事件的方法
  function handleShapeChange(tool) {
    // 工具已经在roiStore中更新，同时向父组件发送事件
    emit('shape-change', tool);
  }

  function handleRoiConfirm() {
    // 关闭ROI信息显示
    showRoiInfo.value = false;
    
    // 保存当前ROI坐标的副本，以防确认过程中丢失
    const currentRoiData = {
      coords: {...roiCoords.value},
      type: roiType.value,
      points: [...polygonPoints.value]
    };
    
    // 保存确认前的模板显示状态
    const wasShowingTemplate = roiStore.isDrawingTemplateOnOverlay;
    const templateDataUrl = roiStore.capturedTemplateDataUrl;
    
    // 向父组件发送确认事件
    emit('roi-confirm');
    
    // 确保ROI在确认后依然可见，并恢复模板状态
    setTimeout(() => {
      // 确保ROI可见
      if (!roiStore.roiEnabled && currentRoiData.coords) {
        console.log('确保ROI在确认后依然可见');
        roiStore.roiEnabled = true;
        
        // 如果坐标被重置，则恢复保存的坐标
        const currentCoords = roiStore.roiCoords;
        if (!currentCoords || 
            (currentCoords.r - currentCoords.l <= 0) || 
            (currentCoords.b - currentCoords.t <= 0)) {
          console.log('ROI坐标已被重置，正在恢复');
          roiStore.setROICoords(currentRoiData.coords);
          roiStore.roiType = currentRoiData.type;
          
          // 如果是多边形，恢复点
          if (currentRoiData.type === 'polygon' && currentRoiData.points.length > 0) {
            // 清除现有点
            roiStore.polygonPoints = [];
            // 添加保存的点
            currentRoiData.points.forEach(p => roiStore.addPolygonPoint(p.x, p.y));
          }
        }
      }
      
      // 恢复模板显示状态（如果之前正在显示）
      if (wasShowingTemplate && templateDataUrl) {
        console.log('恢复模板显示');
        roiStore.toggleTemplateDrawingOnOverlay(templateDataUrl);
      }
    }, 100);
  }

  // Watch for autoTarget props and update roiStore if active
  watch([() => props.autoTargetCenter, () => props.autoTargetSize, isAutoTargeting], 
    ([newCenter, newSize, autoTargetingActive]) => {
    if (autoTargetingActive && newCenter && newSize) {
      const newRoiCoords = {
        l: newCenter.x - newSize.width / 2,
        t: newCenter.y - newSize.height / 2,
        r: newCenter.x + newSize.width / 2,
        b: newCenter.y + newSize.height / 2,
      };
      roiStore.setROICoords(newRoiCoords);
      roiStore.roiType = 'rect'; // Assume auto-target is always a rect
      roiStore.roiEnabled = true; // Ensure ROI is visible
      roiStore.stopDrawingROI(); // Ensure drawing mode is off
    } else if (!autoTargetingActive) {
      // Optional: handle what happens when auto-targeting is turned off
      // For example, clear the ROI or revert to a previous state if needed.
      // roiStore.clearROI(); // Or some other logic
    }
  }, { deep: true });
  </script>

<style scoped>
.roi-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* pointer-events: none; remove this if direct interaction with overlay is needed for drawing */
  /* background-color: rgba(0,0,0,0.1); for debugging */
}

.roi-overlay.drawing {
  cursor: crosshair;
  /* pointer-events: auto; */ /* Allow events only when actively drawing ROI */
}

.roi-rect {
  position: absolute;
  border: 2px solid #FF5722; /* Orange border */
  background-color: rgba(255, 87, 34, 0.2); /* Semi-transparent orange */
  box-sizing: border-box;
}

.roi-rect.drawing {
  border-style: dashed;
}

.template-on-overlay-img {
  /* Styles are applied inline for now, can be moved here */
  object-fit: contain; /* Or 'cover', 'fill' depending on desired behavior */
}

.detected-mark-rect {
  /* Style for the bounding box of detected marks */
  /* borderColor is set dynamically */
  background-color: rgba(0, 255, 0, 0.1); /* Light green semi-transparent fill */
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.5); /* 添加阴影效果 */
}

.detected-mark-score {
  position: absolute;
  top: -22px; /* Position score above the box */
  left: 0;
  background-color: rgba(0,0,0,0.7);
  color: white;
  padding: 2px 4px;
  font-size: 12px;
  font-weight: bold;
  border-radius: 3px;
  text-shadow: 1px 1px 1px #000; /* 添加文字阴影 */
}

/* 隐藏ROI信息框 */
.roi-info {
  display: none !important;
}
</style>