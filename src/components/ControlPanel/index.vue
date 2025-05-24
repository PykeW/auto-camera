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
  import CameraConnection from './CameraConnection.vue';
  import CameraInfo from './CameraInfo.vue';
  import CameraProperties from './CameraProperties.vue';
  import FocusControl from './FocusControl.vue';
  import CalibrationControl from './CalibrationControl.vue';
  </script>