 <!-- src/components/ControlPanel/CameraProperties.vue -->
<template>
    <div class="panel-section requires-connection">
      <h3>相机属性与控制</h3>
  
      <div class="property-grid">
        <!-- 模拟属性 -->
        <div class="control-item">
          <label>Y反转:</label>
          <select class="compact-select" disabled><option>否</option><option>是</option></select>
        </div>
        <div class="control-item">
          <label>X反转:</label>
          <select class="compact-select" disabled><option>否</option><option>是</option></select>
        </div>
        <div class="control-item">
          <label>触发模式:</label>
          <select id="trigger-mode-select" disabled>
            <option value="连续采集">连续采集</option>
            <option value="软件触发">软件触发</option>
            <option>外部触发</option>
          </select>
        </div>
        <div class="control-item">
          <label>触发信号:</label>
          <select disabled><option>上升沿</option><option>下降沿</option></select>
        </div>
        <div class="control-item">
          <label>触发源:</label>
          <select disabled><option>通道0</option><option>通道1</option><option>软件</option></select>
        </div>
        <div class="control-item">
          <label>图像格式:</label>
          <select disabled><option>MONO8</option><option>RGB8</option></select>
        </div>
        <div class="control-item">
          <label for="exposure-time">曝光时间(us):</label>
          <input type="number" id="exposure-time" v-model="exposureTime" :disabled="!isConnected">
        </div>
        <div class="control-item">
          <label for="gain">增益:</label>
          <input type="number" id="gain" v-model="gain" :disabled="!isConnected">
        </div>
        <div class="control-item toggle-item">
          <label for="enable-camera-cb">使能:</label>
          <label class="switch">
            <input type="checkbox" id="enable-camera-cb" v-model="enableCamera" :disabled="!isConnected">
            <span class="slider round"></span>
          </label>
        </div>
        <div class="control-item toggle-item">
          <label for="white-balance-cb">自动白平衡:</label>
          <label class="switch">
            <input type="checkbox" id="white-balance-cb" v-model="autoWhiteBalance" :disabled="!isConnected">
            <span class="slider round"></span>
          </label>
        </div>
        <!-- 白平衡滑块 -->
        <div class="control-item range-item manual-wb-control" style="display: flex;">
          <label>红(R):</label>
          <input type="range" id="wb-red" v-model="wbRed" :disabled="!isConnected || autoWhiteBalance" min="0" max="255">
          <span class="range-value">({{ wbRed }})</span>
        </div>
        <div class="control-item range-item manual-wb-control" style="display: flex;">
          <label>绿(G):</label>
          <input type="range" id="wb-green" v-model="wbGreen" :disabled="!isConnected || autoWhiteBalance" min="0" max="255">
          <span class="range-value">({{ wbGreen }})</span>
        </div>
        <div class="control-item range-item manual-wb-control" style="display: flex;">
          <label>蓝(B):</label>
          <input type="range" id="wb-blue" v-model="wbBlue" :disabled="!isConnected || autoWhiteBalance" min="0" max="255">
          <span class="range-value">({{ wbBlue }})</span>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch } from 'vue';
  import { useCameraStore } from '../../stores/camera';
  
  const cameraStore = useCameraStore();
  
  // 计算属性
  const isConnected = computed(() => cameraStore.isConnected);
  
  // 本地状态
  const exposureTime = ref(-1);
  const gain = ref(-1);
  const enableCamera = ref(false);
  const autoWhiteBalance = ref(false);
  const wbRed = ref(128);
  const wbGreen = ref(128);
  const wbBlue = ref(128);
  
  // 监听连接状态变化，更新属性
  watch(() => cameraStore.isConnected, (connected) => {
    if (connected) {
      // 相机连接后获取属性
      const properties = cameraStore.properties;
      if (properties['曝光时间(us)']) {
        exposureTime.value = properties['曝光时间(us)'].value;
      }
      if (properties['增益']) {
        gain.value = properties['增益'].value;
      }
      
      // 默认启用相机
      enableCamera.value = true;
    } else {
      // 相机断开时重置属性
      exposureTime.value = -1;
      gain.value = -1;
      enableCamera.value = false;
      autoWhiteBalance.value = false;
    }
  });
  
  // 监听属性变化，更新store
  watch(exposureTime, (newValue) => {
    if (isConnected.value && newValue !== -1) {
      cameraStore.updateProperty('曝光时间(us)', newValue);
    }
  });
  
  watch(gain, (newValue) => {
    if (isConnected.value && newValue !== -1) {
      cameraStore.updateProperty('增益', newValue);
    }
  });
  </script>