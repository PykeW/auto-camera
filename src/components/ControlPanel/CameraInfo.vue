<!-- src/components/ControlPanel/CameraInfo.vue -->
<template>
    <div class="panel-section requires-connection">
      <div class="control-item">
        <label for="config-file">配置文件：</label>
        <div class="input-group">
          <input type="text" id="config-file" v-model="configFile" readonly placeholder="未选择文件" :disabled="!isConnected">
          <button id="select-config-btn" class="select-button mini-button" :disabled="!isConnected" @click="selectConfig">
            <i class="fas fa-folder-open"></i> 选择
          </button>
        </div>
        <p class="small-description">相机配置文件路径 (.cfg)</p>
      </div>
      <div class="control-item">
        <label for="save-path">图像保存路径：</label>
        <div class="input-group">
          <input type="text" id="save-path" v-model="savePath" readonly placeholder="未选择路径" :disabled="!isConnected">
          <button id="select-folder-btn" class="select-button mini-button" :disabled="!isConnected" @click="selectSavePath">
            <i class="fas fa-folder"></i> 选择
          </button>
        </div>
        <p class="small-description">图像和视频的保存目录</p>
      </div>
      <div class="camera-info-grid">
        <div class="control-item">
          <label for="camera-name">相机名称：</label>
          <input type="text" id="camera-name" v-model="cameraName" disabled>
        </div>
        <div class="control-item">
          <label for="camera-model">相机型号：</label>
          <input type="text" id="camera-model" v-model="cameraModel" readonly disabled>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { computed } from 'vue';
  import { useCameraStore } from '../../stores/camera';
  
  const cameraStore = useCameraStore();
  
  // 计算属性
  const isConnected = computed(() => cameraStore.isConnected);
  const configFile = computed(() => cameraStore.configFile || '');
  const savePath = computed(() => cameraStore.savePath || '');
  const cameraName = computed(() => cameraStore.cameraName || '');
  const cameraModel = computed(() => cameraStore.cameraModel || '');
  
  // 选择配置文件
  async function selectConfig() {
    if (!isConnected.value) return;
    await cameraStore.selectConfigFile();
  }
  
  // 选择保存路径
  async function selectSavePath() {
    if (!isConnected.value) return;
    await cameraStore.selectSavePath();
  }
  </script>