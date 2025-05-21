<template>
    <div class="axis-control">
      <div class="axis-display">
        <div class="axis-position">
          <div 
            v-for="axis in ['X', 'Y', 'Z', 'U']" 
            :key="axis"
            class="position-item"
          >
            <span class="axis-label">{{ axis }}:</span>
            <span class="position-value">{{ getAxisPosition(axis)?.toFixed(3) || '--' }} mm</span>
            <span class="encoder-value">{{ getAxisEncoder(axis) || '--' }}</span>
          </div>
        </div>
      </div>
      
      <div class="axis-selection">
        <span class="section-label">轴选择:</span>
        <div class="axis-buttons">
          <button 
            v-for="axis in ['X', 'Y', 'Z', 'U']" 
            :key="axis"
            :class="['axis-button', { active: selectedAxis === axis }]"
            @click="selectAxis(axis)"
          >
            {{ axis }}
          </button>
        </div>
      </div>
      
      <div class="axis-parameters">
        <div class="parameter-row">
          <label for="step-value">步长:</label>
          <div class="input-with-unit">
            <input 
              id="step-value" 
              type="number" 
              v-model.number="stepValue" 
              :disabled="!isConnected"
            />
            <span>{{ isEncoderMode ? '步' : 'mm' }}</span>
          </div>
        </div>
        
        <div class="parameter-row checkbox-row">
          <input 
            id="encoder-mode" 
            type="checkbox" 
            v-model="isEncoderMode"
            :disabled="!isConnected"
          />
          <label for="encoder-mode">使用编码器单位</label>
        </div>
        
        <div class="parameter-row">
          <label for="absolute-position">绝对位置:</label>
          <div class="input-group">
            <input 
              id="absolute-position" 
              type="number" 
              v-model.number="absolutePosition" 
              :disabled="!isConnected || !isAbsoluteMode" 
            />
            <button 
              class="goto-button"
              :disabled="!isConnected || !isAbsoluteMode" 
              @click="gotoAbsolutePosition"
            >
              移动
            </button>
          </div>
        </div>
        
        <div class="parameter-row checkbox-row">
          <input 
            id="absolute-mode" 
            type="checkbox" 
            v-model="isAbsoluteMode"
            :disabled="!isConnected"
          />
          <label for="absolute-mode">绝对移动模式</label>
        </div>
      </div>
      
      <div class="axis-movement">
        <div class="jog-buttons">
          <!-- 负向移动按钮 -->
          <button 
            class="jog-button minus-button"
            :disabled="!isConnected || !canJog"
            @click="jogAxis(-1)"
          >
            <span class="button-icon">-</span>
          </button>
          
          <!-- 步长选择快捷按钮 -->
          <div class="step-buttons">
            <button 
              v-for="step in stepOptions"
              :key="step"
              :class="['step-button', { active: stepValue === step }]"
              :disabled="!isConnected"
              @click="stepValue = step"
            >
              {{ step }}{{ isEncoderMode ? '步' : 'mm' }}
            </button>
          </div>
          
          <!-- 正向移动按钮 -->
          <button 
            class="jog-button plus-button"
            :disabled="!isConnected || !canJog"
            @click="jogAxis(1)"
          >
            <span class="button-icon">+</span>
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue'
  import { useCameraStore } from '../stores/cameraStore'
  
  const cameraStore = useCameraStore()
  
  // 状态
  const selectedAxis = ref('Z') // 默认选择Z轴
  const stepValue = ref(1000) // 默认步长
  const isEncoderMode = ref(true) // 默认使用编码器单位
  const isAbsoluteMode = ref(false) // 默认相对移动
  const absolutePosition = ref(0) // 默认绝对位置
  const stepOptions = ref([10, 100, 1000, 10000]) // 步长选项
  
  // 计算属性
  const isConnected = computed(() => cameraStore.isConnected)
  
  // 轴位置获取
  function getAxisPosition(axis) {
    return cameraStore[`${axis}Position`] || null
  }
  
  function getAxisEncoder(axis) {
    return cameraStore[`${axis}PositionEncoder`] || null
  }
  
  // 判断是否可以移动轴
  const canJog = computed(() => {
    // 检查是否连接，以及是否在对焦过程中等限制条件
    return isConnected.value
  })
  
  // 方法
  function selectAxis(axis) {
    selectedAxis.value = axis
    
    // 更新当前选中轴的绝对位置
    if (isConnected.value) {
      if (isEncoderMode.value) {
        absolutePosition.value = getAxisEncoder(axis) || 0
      } else {
        absolutePosition.value = getAxisPosition(axis) || 0
      }
    }
  }
  
  async function jogAxis(direction) {
    if (!isConnected.value || !canJog.value) return
    
    try {
      // 获取轴ID
      const axisId = getAxisId(selectedAxis.value)
      // 计算步长
      const step = direction * stepValue.value
      
      // 如果是绝对移动模式，则设置绝对位置
      const absPos = isAbsoluteMode.value ? 
        (isEncoderMode.value ? absolutePosition.value : null) : 
        null
      
      // 执行轴移动
      const result = await cameraStore.jogAxis(axisId, step, isEncoderMode.value, absPos)
      
      if (!result.success) {
        console.error(`轴${selectedAxis.value}移动失败:`, result.message)
      }
    } catch (error) {
      console.error(`轴${selectedAxis.value}移动出错:`, error)
    }
  }
  
  async function gotoAbsolutePosition() {
    if (!isConnected.value || !isAbsoluteMode.value) return
    
    try {
      // 获取轴ID
      const axisId = getAxisId(selectedAxis.value)
      
      // 执行绝对位置移动
      const result = await cameraStore.jogAxis(
        axisId, 
        0, // 步长为0，因为使用绝对位置
        isEncoderMode.value, 
        absolutePosition.value
      )
      
      if (!result.success) {
        console.error(`轴${selectedAxis.value}绝对移动失败:`, result.message)
      }
    } catch (error) {
      console.error(`轴${selectedAxis.value}绝对移动出错:`, error)
    }
  }
  
  // 轴名称转换为轴ID
  function getAxisId(axisName) {
    const axisMapping = {
      'X': '1',
      'Y': '2',
      'Z': '3',
      'U': '4'
    }
    
    return axisMapping[axisName] || axisName
  }
  </script>
  
  <style scoped>
  .axis-control {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .axis-display {
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
  }
  
  .axis-position {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .position-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .axis-label {
    font-weight: bold;
    width: 20px;
  }
  
  .position-value {
    font-family: monospace;
    font-size: 16px;
    min-width: 80px;
  }
  
  .encoder-value {
    font-family: monospace;
    font-size: 12px;
    color: #777;
  }
  
  .axis-selection {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .section-label {
    font-size: 14px;
    color: #555;
  }
  
  .axis-buttons {
    display: flex;
    gap: 8px;
  }
  
  .axis-button {
    flex: 1;
    padding: 8px 0;
    border: none;
    border-radius: 4px;
    background-color: #f0f0f0;
    cursor: pointer;
    transition: all 0.3s;
  }
  
  .axis-button.active {
    background-color: #42b983;
    color: white;
    font-weight: bold;
  }
  
  .axis-parameters {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background-color: #f9f9f9;
    padding: 10px;
    border-radius: 4px;
  }
  
  .parameter-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .checkbox-row {
    flex-direction: row-reverse;
    justify-content: flex-end;
    gap: 8px;
  }
  
  .checkbox-row input {
    margin: 0;
  }
  
  .input-with-unit {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .input-with-unit input {
    width: 80px;
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
    text-align: right;
  }
  
  .input-with-unit span {
    font-size: 12px;
    color: #555;
    min-width: 20px;
  }
  
  .input-group {
    display: flex;
    gap: 5px;
  }
  
  .input-group input {
    width: 80px;
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
    text-align: right;
  }
  
  .goto-button {
    padding: 5px 8px;
    border: none;
    border-radius: 4px;
    background-color: #42b983;
    color: white;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .goto-button:hover:not(:disabled) {
    background-color: #3aa876;
  }
  
  .axis-movement {
    margin-top: 10px;
  }
  
  .jog-buttons {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .jog-button {
    width: 60px;
    height: 60px;
    border: none;
    border-radius: 50%;
    background-color: #3498db;
    color: white;
    font-size: 24px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.3s;
  }
  
  .jog-button:hover:not(:disabled) {
    background-color: #2980b9;
    transform: scale(1.05);
  }
  
  .jog-button:active:not(:disabled) {
    transform: scale(0.95);
  }
  
  .minus-button {
    background-color: #e74c3c;
  }
  
  .minus-button:hover:not(:disabled) {
    background-color: #c0392b;
  }
  
  .plus-button {
    background-color: #2ecc71;
  }
  
  .plus-button:hover:not(:disabled) {
    background-color: #27ae60;
  }
  
  .button-icon {
    line-height: 1;
    font-size: 28px;
  }
  
  .step-buttons {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 5px;
  }
  
  .step-button {
    padding: 6px 0;
    border: none;
    border-radius: 4px;
    background-color: #f0f0f0;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .step-button.active {
    background-color: #3498db;
    color: white;
  }
  
  .step-button:hover:not(:disabled):not(.active) {
    background-color: #e0e0e0;
  }
  
  button:disabled {
    background-color: #cccccc !important;
    cursor: not-allowed;
    opacity: 0.7;
  }
  </style>