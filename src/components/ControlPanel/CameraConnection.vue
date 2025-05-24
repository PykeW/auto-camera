<!-- src/components/ControlPanel/CameraConnection.vue -->
<template>
    <div class="panel-section requires-connection">
      <LabeledInputRow label="相机序列号：">
        <div class="connection-group">
          <SimpleInputControl 
            v-model="serialNumber" 
            :readonly="true"
          />
          <ActionButton 
            :text="isConnected ? '断开' : '连接'" 
            :type="isConnected ? 'danger' : 'primary'"
            @click="toggleConnection"
          />
        </div>
      </LabeledInputRow>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue';
  import { useCameraStore } from '../../stores/camera';
  import { useAxisStore } from '../../stores/axis';
  import SimpleInputControl from '../common/SimpleInputControl.vue';
  import ActionButton from '../common/ActionButton.vue';
  import LabeledInputRow from '../common/LabeledInputRow.vue';
  
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
  
  // 组件挂载时自动连接相机
  onMounted(async () => {
    if (!isConnected.value) {
      await cameraStore.connect();
      axisStore.initializePositions();
    }
  });
  </script>

<style scoped>
.panel-section {
  margin-bottom: 16px;
}

.connection-group {
  display: flex;
  gap: 8px;
  width: 100%;
}
</style>