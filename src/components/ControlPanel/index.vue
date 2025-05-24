<!-- src/components/ControlPanel/index.vue -->
<template>
    <aside class="control-panel" id="control-panel-content">
      <CameraConnection />
      <CameraInfo />
      <CameraProperties />
      <FocusControl />
      <CalibrationControl />
    </aside>
  </template>
  
  <script setup>
  import CameraConnection from '../CameraPanel/CameraConnection.vue';
  import CameraInfo from '../CameraPanel/CameraInfo.vue';
  import CameraProperties from '../CameraPanel/CameraProperties.vue';
  import FocusControl from '../FocusPanel/FocusControl.vue';
  import CalibrationControl from '../CalibrationPanel/CalibrationControl.vue';
  </script>