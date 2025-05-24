<!-- src/App.vue -->
<template>
    <div class="app-container">
      <AppHeader />
      <main class="main-content">
        <CameraView />
        <ControlPanel />
      </main>
      <StatusBar />
    </div>
  </template>
  
  <script setup>
  import AppHeader from './components/Layout/AppHeader.vue';
  import StatusBar from './components/Layout/StatusBar.vue';
  import CameraView from './components/CameraPanel/CameraView.vue';
  import ControlPanel from './components/ControlPanel/index.vue';
  </script>
  
  <style>
  @import './assets/styles.css';
  </style>