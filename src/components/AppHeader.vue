 <!-- src/components/AppHeader.vue -->
<template>
    <header class="header">
      <div class="header-controls">
        <button class="header-button" id="btn-play" title="连续采集" :disabled="!isConnected">
          <i class="fas fa-play"></i>
        </button>
        <button class="header-button" id="btn-stop" title="停止采集" :disabled="!isConnected">
          <i class="fas fa-stop"></i>
        </button>
        <button class="header-button" id="btn-capture" title="单张拍照" :disabled="!isConnected">
          <i class="fas fa-camera"></i>
        </button>
        <button class="header-button" id="btn-record" title="开始录制" :disabled="!isConnected">
          <i class="fas fa-video"></i>
        </button>
        <button class="header-button" id="btn-trigger" title="软件触发" :disabled="!isConnected">
          <i class="fas fa-bolt"></i>
        </button>
        <button class="header-button" id="btn-settings" title="设置">
          <i class="fas fa-cog"></i>
        </button>
      </div>
      <div class="header-title">相机操作</div>
    </header>
  </template>
  
  <script setup>
  import { computed } from 'vue';
  import { useCameraStore } from '../stores/camera';
  
  const cameraStore = useCameraStore();
  const isConnected = computed(() => cameraStore.isConnected);
  </script>