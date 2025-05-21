<template>
    <div class="app-container">
      <header class="app-header">
        <h1>工业相机控制系统</h1>
        <div class="camera-connection">
          <CameraConnect />
        </div>
      </header>
      
      <main class="app-content">
        <div class="main-panel">
          <CameraView />
        </div>
        
        <div class="control-panel">
          <div class="panel-section">
            <h2>焦点控制</h2>
            <FocusControl />
          </div>
          
          <div class="panel-section">
            <h2>轴控制</h2>
            <AxisControl />
          </div>
          
          <div class="panel-section">
            <h2>ROI 控制</h2>
            <ROIControl />
          </div>
          
          <div class="panel-section">
            <h2>校准</h2>
            <CalibrationPanel />
          </div>
        </div>
      </main>
      
      <!-- 对焦缩略图浏览器 (作为浮层) -->
      <FocusThumbnails />
    </div>
  </template>
  
  <script setup>
  import CameraConnect from './components/CameraConnect.vue'
  import CameraView from './components/CameraView.vue'
  import FocusControl from './components/FocusControl.vue'
  import FocusThumbnails from './components/FocusThumbnails.vue'
  import AxisControl from './components/AxisControl.vue'
  import ROIControl from './components/ROIControl.vue'
  import CalibrationPanel from './components/CalibrationPanel.vue'
  </script>
  
  <style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  body {
    font-family: Arial, sans-serif;
    background-color: #f8f9fa;
    color: #333;
  }
  
  .app-container {
    max-width: 1600px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #ddd;
  }
  
  .app-header h1 {
    font-size: 24px;
    color: #2c3e50;
  }
  
  .app-content {
    display: flex;
    gap: 20px;
    height: calc(100vh - 100px);
  }
  
  .main-panel {
    flex: 2;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    height: 100%;
  }
  
  .control-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
    max-width: 400px;
  }
  
  .panel-section {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    padding: 15px;
  }
  
  .panel-section h2 {
    font-size: 16px;
    margin-bottom: 15px;
    color: #2c3e50;
    border-bottom: 1px solid #eee;
    padding-bottom: 8px;
  }
  
  /* 响应式设计 */
  @media (max-width: 1200px) {
    .app-content {
      flex-direction: column;
      height: auto;
    }
    
    .control-panel {
      max-width: none;
    }
  }
  </style>