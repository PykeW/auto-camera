<template>
    <div class="camera-connect">
      <div class="connection-form">
        <input
          type="text"
          v-model="serialNumber"
          placeholder="相机序列号"
          :disabled="isConnected"
        />
        <button
          :class="['connect-button', { connected: isConnected }]"
          @click="toggleConnection"
        >
          {{ isConnected ? '断开' : '连接' }}
        </button>
      </div>
      
      <div v-if="isConnected" class="camera-info">
        <div class="info-item">
          <span class="info-label">相机名称:</span>
          <span class="info-value">{{ cameraName }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">型号:</span>
          <span class="info-value">{{ cameraModel }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">配置文件:</span>
          <input type="text" v-model="configFile" disabled />
          <button class="small-button" @click="selectConfigFile">选择</button>
        </div>
        <div class="info-item">
          <span class="info-label">保存路径:</span>
          <input type="text" v-model="savePath" disabled />
          <button class="small-button" @click="selectSavePath">选择</button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue'
  import { useCameraStore } from '../stores/cameraStore'
  
  const cameraStore = useCameraStore()
  
  // 计算属性，用于连接UI和Store
  const isConnected = computed(() => cameraStore.isConnected)
  const serialNumber = computed({
    get: () => cameraStore.serialNumber,
    set: (value) => cameraStore.serialNumber = value
  })
  const cameraName = computed(() => cameraStore.cameraName)
  const cameraModel = computed(() => cameraStore.cameraModel)
  const configFile = computed({
    get: () => cameraStore.configFile,
    set: (value) => cameraStore.configFile = value
  })
  const savePath = computed({
    get: () => cameraStore.savePath,
    set: (value) => cameraStore.savePath = value
  })
  
  // 方法
  async function toggleConnection() {
    if (!isConnected.value) {
      const result = await cameraStore.connect()
      if (!result.success) {
        alert(`连接失败: ${result.message}`)
      }
    } else {
      const result = await cameraStore.disconnect()
      if (!result.success) {
        alert(`断开失败: ${result.message}`)
      }
    }
  }
  
  function selectConfigFile() {
    // 在纯前端模拟中，这只是一个示例
    alert('在纯前端模式下，文件选择功能不可用')
    // 实际项目中，您可能会使用Dialog API或自定义文件选择器
  }
  
  function selectSavePath() {
    // 在纯前端模拟中，这只是一个示例
    alert('在纯前端模式下，文件夹选择功能不可用')
    // 实际项目中，您可能会使用Dialog API或自定义文件夹选择器
  }
  </script>
  
  <style scoped>
  .camera-connect {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .connection-form {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  
  .connect-button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background-color: #42b983;
    color: white;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .connect-button:hover {
    background-color: #3aa876;
  }
  
  .connect-button.connected {
    background-color: #e74c3c;
  }
  
  .connect-button.connected:hover {
    background-color: #c0392b;
  }
  
  .camera-info {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  
  .info-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .info-label {
    min-width: 80px;
    font-weight: bold;
  }
  
  .info-value {
    font-family: monospace;
  }
  
  input {
    padding: 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .small-button {
    padding: 4px 8px;
    border: none;
    border-radius: 4px;
    background-color: #f0f0f0;
    cursor: pointer;
  }
  
  .small-button:hover {
    background-color: #e0e0e0;
  }
  </style>