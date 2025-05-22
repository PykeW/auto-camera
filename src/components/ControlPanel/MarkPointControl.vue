<template>
  <div class="mark-point-control">
    <h3>Mark点设置</h3>
    <div class="setting-item">
      <label for="mark-point-mode">选择方式:</label>
      <select id="mark-point-mode" v-model="selectedMode">
        <option value="templateMatching">模板匹配</option>
        <option value="contourExtraction">轮廓提取</option>
      </select>
    </div>

    <div v-if="selectedMode === 'templateMatching'" class="parameters">
      <h4>模板匹配参数</h4>
      <div class="setting-item">
        <label for="template-image">模板图片:</label>
        <input type="file" id="template-image" @change="handleTemplateImageUpload">
      </div>
      <div class="setting-item">
        <label for="matching-threshold">匹配阈值:</label>
        <input type="number" id="matching-threshold" v-model="templateMatchingParams.threshold" min="0" max="1" step="0.01">
      </div>
      <!-- 更多模板匹配参数 -->
    </div>

    <div v-if="selectedMode === 'contourExtraction'" class="parameters">
      <h4>轮廓提取参数</h4>
      <div class="setting-item">
        <label for="contour-min-area">最小面积:</label>
        <input type="number" id="contour-min-area" v-model="contourExtractionParams.minArea">
      </div>
      <div class="setting-item">
        <label for="contour-max-area">最大面积:</label>
        <input type="number" id="contour-max-area" v-model="contourExtractionParams.maxArea">
      </div>
      <!-- 更多轮廓提取参数 -->
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const selectedMode = ref('templateMatching'); // 默认选择模板匹配
const templateMatchingParams = ref({
  templateImage: null,
  threshold: 0.8,
});
const contourExtractionParams = ref({
  minArea: 100,
  maxArea: 1000,
});

function handleTemplateImageUpload(event) {
  const file = event.target.files[0];
  if (file) {
    templateMatchingParams.value.templateImage = URL.createObjectURL(file);
    // 在实际应用中，您可能需要将文件上传到服务器或在客户端处理
  }
}
</script>

<style scoped>
.mark-point-control {
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.mark-point-control h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.2em;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.setting-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.setting-item label {
  min-width: 100px;
  margin-right: 10px;
  font-weight: bold;
  color: #555;
}

.setting-item select,
.setting-item input[type="number"],
.setting-item input[type="file"] {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.parameters {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px dashed #ddd;
}

.parameters h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1em;
  color: #444;
}
</style>
