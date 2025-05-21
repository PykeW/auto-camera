<!-- src/components/ControlPanel/CameraConnection.vue -->
<template>
    <div class="panel-section requires-connection">
      <label for="serial-number">相机序列号：</label>
      <div class="input-group">
        <input type="text" id="serial-number" v-model="serialNumber" readonly>
        <button id="connect-btn" class="connect-button" :class="{ connected: isConnected }" @click="toggleConnection">
          {{ isConnected ? '断开' : '连接' }}
        </button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue';
  import { useCameraStore } from '../../stores/camera';
  import { useAxisStore } from '../../stores/axis';
  
  const cameraStore = useCameraStore();
  const axisStore = useAxisStore();
  
  // 本地状态
  const serialNumber = ref('SN_Sim_1');
  
  // 计算属性
  const isConnected = computed(() => cameraStore.isConnected);
  
  // 连接/断开相机
  async function toggleConnection() {
    if (!isConnected.value) {
      // 连接相机
      await cameraStore.connect();
      
      // 初始化轴位置
      axisStore.initializePositions();
    } else {
      // 断开相机连接
      await cameraStore.disconnect();
    }
  }
  </script>