<!-- src/components/ControlPanel/FocusControl.vue -->
<template>
    <div class="panel-section requires-connection">
      <hr class="separator">
      <h4>Z轴控制 / 对焦</h4>
      <div class="focus-section-container">
        <!-- 轴选择下拉列表 -->
        <div class="control-item side-by-side">
          <label for="focus-axis-select">选择轴:</label>
          <select id="focus-axis-select" class="compact-select" v-model="selectedAxisId">
            <option v-for="axis in plcAxes" :key="axis.id" :value="axis.id">{{ axis.name }}</option>
          </select>
        </div>
        
        <!-- 当前轴位置显示和点动控制 -->
        <div class="control-item side-by-side">
          <label for="focus-axis-position">轴位置:</label>
          <div class="axis-position-control">
            <button 
              class="jog-btn minus" 
              id="focus-jog-minus" 
              :disabled="!isConnected || isMinLimitReached"
              @click="performJog(-1)"
            >-</button>
            <div class="position-display-container">
              <input 
                type="text" 
                id="focus-axis-position" 
                :value="formattedPosition" 
                readonly
              >
              <span 
                id="unit-display" 
                class="unit-display" 
                title="点击切换单位"
                @click="toggleUnit"
              >{{ displayUnit }}</span>
            </div>
            <button 
              class="jog-btn plus" 
              id="focus-jog-plus" 
              :disabled="!isConnected || isMaxLimitReached"
              @click="performJog(1)"
            >+</button>
          </div>
          <select 
            id="focus-step-select" 
            class="compact-select"
            v-model="stepValue"
          >
            <option v-for="option in stepOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        
        <!-- 搜索范围和对焦步进输入框 -->
        <div class="control-item side-by-side">
          <label for="focus-range">搜索范围:</label>
          <div class="position-display-container">
            <input 
              type="number" 
              id="focus-range" 
              v-model="rangeValue"
              :step="rangeStep" 
              :min="rangeMin"
            >
            <span class="unit-display" id="range-unit-display">{{ displayUnit }}</span>
          </div>
        </div>
        <div class="control-item side-by-side">
          <label for="focus-step">对焦步进:</label>
          <div class="position-display-container">
            <input 
              type="number" 
              id="focus-step" 
              v-model="focusStepValue"
              :step="focusStepStep" 
              :min="focusStepMin"
            >
            <span class="unit-display" id="step-unit-display">{{ displayUnit }}</span>
          </div>
        </div>
  
        <!-- Focus ROI Controls -->
        <div class="roi-header-line">
          <h4 class="roi-heading">对焦ROI区域</h4>
          <div id="focus-roi-button-group" class="roi-button-group">
            <button 
              id="toggle-focus-roi-visibility-btn" 
              class="roi-button icon-button" 
              title="显示/隐藏"
              @click="toggleROIVisibility"
              :disabled="!isConnected || isFocusing"
            >
              <i :class="[roiEnabled ? 'fas fa-eye-slash' : 'fas fa-eye']"></i>
            </button>
            <button 
              id="edit-roi-focus-btn" 
              class="roi-button icon-button" 
              title="编辑"
              @click="editROI"
              :disabled="!isConnected || isFocusing"
              :class="{ active: isDrawingROI }"
            >
              <i class="fas fa-edit"></i>
            </button>
            <button 
              id="clear-roi-focus-btn" 
              class="roi-button icon-button danger-icon" 
              title="删除"
              @click="clearROI"
              :disabled="!isConnected || isFocusing"
            >
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
  
        <div class="control-item focus-controls">
          <button 
            id="start-focus-btn" 
            class="primary-button"
            @click="startAutoFocus"
            :disabled="!isConnected || isFocusing"
            v-show="!isFocusing"
          >
            <i class="fas fa-crosshairs"></i> 开始自动对焦
          </button>
          <button 
            id="stop-focus-btn" 
            class="danger-button"
            @click="stopAutoFocus"
            :disabled="!isConnected || !isFocusing"
            v-show="isFocusing"
          >
            <i class="fas fa-stop-circle"></i> 停止自动对焦
          </button>
          <button 
            id="save-focus-position-btn" 
            class="secondary-button"
            @click="saveFocusPosition"
            :disabled="!isConnected || isFocusing"
            v-show="!isFocusing"
          >
            <i class="fas fa-save"></i> 保存对焦位置
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch } from 'vue';
  import { useCameraStore } from '../../stores/camera';
  import { useAxisStore } from '../../stores/axis';
  import { useFocusStore } from '../../stores/focus';
  import { useRoiStore } from '../../stores/roi';
  import { showMessage } from '../../utils/helpers';
  
  const cameraStore = useCameraStore();
  const axisStore = useAxisStore();
  const focusStore = useFocusStore();
  const roiStore = useRoiStore();
  
  // 本地状态
  const selectedAxisId = ref('3'); // 默认Z轴
  const stepValue = ref(100); // 默认100um步进
  const rangeValue = ref(5000); // 默认5000um范围
  const focusStepValue = ref(500); // 默认500um步进
  
  // 计算属性
  const isConnected = computed(() => cameraStore.isConnected);
  const isFocusing = computed(() => focusStore.isFocusing);
  const displayUnit = computed(() => axisStore.displayUnit);
  const plcAxes = computed(() => axisStore.plcAxes);
  const isDrawingROI = computed(() => roiStore.isDrawingROI);
  const roiEnabled = computed(() => roiStore.roiEnabled);
  
  // 轴位置相关
  const selectedAxisName = computed(() => {
    return axisStore.getAxisNameById(selectedAxisId.value) || 'Z';
  });
  
  const position = computed(() => {
    return axisStore.positions[selectedAxisName.value] || 0;
  });
  
  const positionEncoder = computed(() => {
    return axisStore.positionsEncoder[selectedAxisName.value] || 0;
  });
  
  const formattedPosition = computed(() => {
    if (!isConnected.value) return '--';
    
    if (displayUnit.value === 'mm') {
      return Math.abs(position.value).toFixed(3);
    } else {
      return Math.abs(Math.round(positionEncoder.value));
    }
  });
  
  // 步进选项
  const stepOptions = computed(() => {
    if (displayUnit.value === 'mm') {
      return [
        { value: 0.001, label: '0.001' },
        { value: 0.01, label: '0.01' },
        { value: 0.1, label: '0.1' },
        { value: 0.5, label: '0.5' },
        { value: 1.0, label: '1.0' }
      ];
    } else {
      return [
        { value: 1, label: '1' },
        { value: 10, label: '10' },
        { value: 100, label: '100' },
        { value: 500, label: '500' },
        { value: 1000, label: '1000' }
      ];
    }
  });
  
  // 搜索范围和步进参数
  const rangeStep = computed(() => displayUnit.value === 'mm' ? '0.1' : '100');
  const rangeMin = computed(() => displayUnit.value === 'mm' ? '0.1' : '100');
  const focusStepStep = computed(() => displayUnit.value === 'mm' ? '0.01' : '10');
  const focusStepMin = computed(() => displayUnit.value === 'mm' ? '0.001' : '1');
  
  // 轴限制
  const axisLimits = computed(() => {
    return axisStore.axisLimits[selectedAxisName.value] || { min: 0, max: 100 };
  });
  
  const axisLimitsEncoder = computed(() => {
    return axisStore.axisLimitsEncoder[selectedAxisName.value] || { min: 0, max: 100000 };
  });
  
  const isMinLimitReached = computed(() => {
    if (!isConnected.value) return true;
    
    if (displayUnit.value === 'mm') {
      return position.value - stepValue.value < axisLimits.value.min;
    } else {
      return positionEncoder.value - stepValue.value < axisLimitsEncoder.value.min;
    }
  });
  
  const isMaxLimitReached = computed(() => {
    if (!isConnected.value) return true;
    
    if (displayUnit.value === 'mm') {
      return position.value + stepValue.value > axisLimits.value.max;
    } else {
      return positionEncoder.value + stepValue.value > axisLimitsEncoder.value.max;
    }
  });
  
  // 方法
  // 点动控制
  async function performJog(direction) {
    if (!isConnected.value) return;
    
    const step = stepValue.value;
    
    // 检查是否会超出限制
    if (direction < 0 && isMinLimitReached.value) return;
    if (direction > 0 && isMaxLimitReached.value) return;
    
    // 执行点动
    await axisStore.jogAxis(selectedAxisName.value, direction, step);
    
    // 更新清晰度
    if (selectedAxisName.value === 'Z') {
      const isEncoder = displayUnit.value === 'um';
      const z = isEncoder ? positionEncoder.value : position.value;
      focusStore.clarity = focusStore.calculateClarity(z, isEncoder);
    }
  }
  
  // 切换单位
  function toggleUnit() {
    axisStore.toggleUnit();
  }
  
  // 开始自动对焦
  async function startAutoFocus() {
    if (!isConnected.value || isFocusing.value) return;
    
    const range = parseFloat(rangeValue.value);
    const step = parseFloat(focusStepValue.value);
    
    if (isNaN(range) || range <= 0) {
      showMessage('搜索范围必须大于0', 'error');
      return;
    }
    
    if (isNaN(step) || step <= 0) {
      showMessage('对焦步进必须大于0', 'error');
      return;
    }
    
    const result = await focusStore.startAutoFocus(range, step);
    
    if (result) {
      showMessage('自动对焦开始', 'info');
    } else {
      showMessage('无法开始自动对焦', 'error');
    }
  }
  
  // 停止自动对焦
  async function stopAutoFocus() {
    if (!isConnected.value || !isFocusing.value) return;
    
    const result = await focusStore.stopAutoFocus();
    
    if (result) {
      showMessage('自动对焦已停止', 'warning');
    }
  }
  
  // 保存对焦位置
  async function saveFocusPosition() {
    if (!isConnected.value || isFocusing.value) return;
    
    const result = await focusStore.saveFocusPosition();
    
    if (result) {
      showMessage('对焦位置已保存', 'success');
      
      // 如果对焦已完成且有图像，显示缩略图
      if (focusStore.focusCompleted && focusStore.focusImages.length > 0 && !focusStore.viewingThumbnail) {
        focusStore.loadFocusImages();
      }
    }
  }
  
  // ROI相关操作
  function editROI() {
    if (!isConnected.value || isFocusing.value) return;
    
    if (roiStore.isDrawingROI) {
      roiStore.stopDrawingROI();
    } else {
      roiStore.startDrawingROI();
    }
  }
  
  function clearROI() {
    if (!isConnected.value || isFocusing.value) return;
    
    const result = roiStore.clearROI();
    
    if (result) {
      showMessage('ROI区域已删除', 'info');
    }
  }
  
  function toggleROIVisibility() {
    if (!isConnected.value || isFocusing.value) return;
    
    roiStore.toggleROIVisibility();
    showMessage(`ROI区域已${roiEnabled.value ? '隐藏' : '显示'}`, 'info');
  }
  
  // 监听单位变更，调整步进和范围值
  watch(() => axisStore.displayUnit, (newUnit) => {
    if (newUnit === 'mm') {
      // 从um转到mm
      stepValue.value = 0.1;
      rangeValue.value = Number((parseFloat(rangeValue.value) / 1000).toFixed(3));
      focusStepValue.value = Number((parseFloat(focusStepValue.value) / 1000).toFixed(3));
    } else {
      // 从mm转到um
      stepValue.value = 100;
      rangeValue.value = Math.round(parseFloat(rangeValue.value) * 1000);
      focusStepValue.value = Math.round(parseFloat(focusStepValue.value) * 1000);
    }
  });
  </script>