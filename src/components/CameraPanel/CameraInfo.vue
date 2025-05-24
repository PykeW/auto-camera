<!-- src/components/ControlPanel/CameraInfo.vue -->
<template>
    <div class="panel-section requires-connection">
      <div class="control-item">
        <LabeledInputRow label="配置文件：">
          <div class="input-group">
            <SimpleInputControl 
              v-model="configFile" 
              :readonly="true" 
              placeholder="未选择文件" 
              :disabled="!isConnected"
            />
            <ActionButton 
              text="选择" 
              type="secondary"
              iconClass="fas fa-folder-open"
              :disabled="!isConnected"
              @click="selectConfig"
            />
          </div>
        </LabeledInputRow>
        <p class="small-description">相机配置文件路径 (.cfg)</p>
      </div>
      <div class="control-item">
        <LabeledInputRow label="图像保存路径：">
          <div class="input-group">
            <SimpleInputControl 
              v-model="savePath" 
              :readonly="true" 
              placeholder="未选择路径" 
              :disabled="!isConnected"
            />
            <ActionButton 
              text="选择" 
              type="secondary"
              iconClass="fas fa-folder"
              :disabled="!isConnected"
              @click="selectSavePath"
            />
          </div>
        </LabeledInputRow>
        <p class="small-description">图像和视频的保存目录</p>
      </div>
      <div class="camera-info-grid">
        <LabeledInputRow label="相机名称：">
          <SimpleInputControl 
            v-model="cameraName" 
            :disabled="true"
          />
        </LabeledInputRow>
        <LabeledInputRow label="相机型号：">
          <SimpleInputControl 
            v-model="cameraModel" 
            :readonly="true" 
            :disabled="true"
          />
        </LabeledInputRow>
      </div>
    </div>
  </template>
  
  <script setup>
  import { computed } from 'vue';
  import { useCameraStore } from '../../stores/camera';
  import SimpleInputControl from '../common/SimpleInputControl.vue';
  import ActionButton from '../ui/ActionButton.vue';
  import LabeledInputRow from '../common/LabeledInputRow.vue';
  
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

<style scoped>
.panel-section {
  margin-bottom: 16px;
}

.control-item {
  margin-bottom: 8px;
}

.input-group {
  display: flex;
  gap: 8px;
  width: 100%;
}

.small-description {
  color: var(--text-medium);
  font-size: .85em;
  margin-top: 4px;
}

.camera-info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
</style>