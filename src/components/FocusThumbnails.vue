<template>
    <div class="focus-thumbnails" v-if="showThumbnails">
      <div class="thumbnails-header">
        <h3>对焦图像序列</h3>
        <button class="close-button" @click="closeThumbnails">×</button>
      </div>
      
      <div class="thumbnails-container" ref="thumbnailsContainer">
        <div
          v-for="(image, index) in focusImages"
          :key="index"
          :class="['thumbnail-item', { selected: currentThumbnailIndex === index }]"
          @click="selectThumbnail(index)"
        >
          <img 
            :src="image.imageData" 
            :alt="`焦点图像 ${index + 1}`" 
            class="thumbnail-image"
          />
          <div class="thumbnail-info">
            <div class="thumbnail-position">Z: {{ image.zPosition.toFixed(3) }} mm</div>
            <div class="thumbnail-clarity">
              清晰度: {{ image.clarity.toFixed(3) }}
              <div class="clarity-bar">
                <div 
                  class="clarity-value" 
                  :style="{ width: `${image.clarity * 100}%` }"
                  :class="{ 'best-clarity': index === bestFocusIndex }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="thumbnails-footer">
        <button 
          class="apply-button"
          :disabled="currentThumbnailIndex === null"
          @click="applySelectedPosition"
        >
          应用选中位置
        </button>
        <button 
          class="apply-best-button"
          :disabled="bestFocusIndex === null"
          @click="applyBestPosition"
        >
          应用最佳位置
        </button>
        <button class="close-button-text" @click="closeThumbnails">
          关闭
        </button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch, onMounted, nextTick } from 'vue'
  import { useFocusStore } from '../stores/focusStore'
  
  const focusStore = useFocusStore()
  const thumbnailsContainer = ref(null)
  
  // 计算属性
  const showThumbnails = computed(() => focusStore.showThumbnails)
  const focusImages = computed(() => focusStore.focusImages)
  const currentThumbnailIndex = computed(() => focusStore.currentThumbnailIndex)
  
  // 计算最佳对焦索引
  const bestFocusIndex = computed(() => {
    if (!focusImages.value || focusImages.value.length === 0) return null
    
    let bestIndex = 0
    let bestClarity = focusImages.value[0].clarity
    
    for (let i = 1; i < focusImages.value.length; i++) {
      if (focusImages.value[i].clarity > bestClarity) {
        bestClarity = focusImages.value[i].clarity
        bestIndex = i
      }
    }
    
    return bestIndex
  })
  
  // 方法
  function selectThumbnail(index) {
    focusStore.selectThumbnail(index)
    
    // 当选择缩略图时滚动到可见
    nextTick(() => {
      if (thumbnailsContainer.value) {
        const thumbnails = thumbnailsContainer.value.children
        if (thumbnails && thumbnails[index]) {
          thumbnails[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }
    })
  }
  
  function closeThumbnails() {
    focusStore.closeThumbnails()
  }
  
  async function applySelectedPosition() {
    if (currentThumbnailIndex.value === null) return
    
    const selectedImage = focusImages.value[currentThumbnailIndex.value]
    if (!selectedImage) return
    
    try {
      const result = await focusStore.setFocusPosition(
        selectedImage.zPosition,
        selectedImage.zPositionEncoder
      )
      
      if (!result.success) {
        alert(`应用选中位置失败: ${result.message}`)
      }
    } catch (error) {
      console.error('应用选中位置出错:', error)
      alert(`应用选中位置出错: ${error.message || '未知错误'}`)
    }
  }
  
  async function applyBestPosition() {
    if (bestFocusIndex.value === null) return
    
    const bestImage = focusImages.value[bestFocusIndex.value]
    if (!bestImage) return
    
    try {
      const result = await focusStore.setFocusPosition(
        bestImage.zPosition,
        bestImage.zPositionEncoder
      )
      
      if (!result.success) {
        alert(`应用最佳位置失败: ${result.message}`)
      } else {
        // 更新当前选中的缩略图为最佳位置
        selectThumbnail(bestFocusIndex.value)
      }
    } catch (error) {
      console.error('应用最佳位置出错:', error)
      alert(`应用最佳位置出错: ${error.message || '未知错误'}`)
    }
  }
  
  // 当显示缩略图面板时，自动选择最佳对焦位置的图像
  watch(showThumbnails, (newValue) => {
    if (newValue && bestFocusIndex.value !== null) {
      nextTick(() => {
        selectThumbnail(bestFocusIndex.value)
      })
    }
  })
  
  // 生命周期钩子
  onMounted(() => {
    // 当组件挂载时，如果缩略图面板已显示且有最佳对焦索引，则选择该索引
    if (showThumbnails.value && bestFocusIndex.value !== null) {
      selectThumbnail(bestFocusIndex.value)
    }
  })
  </script>
  
  <style scoped>
  .focus-thumbnails {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    max-width: 1000px;
    height: 80%;
    max-height: 800px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    z-index: 1000;
    overflow: hidden;
  }
  
  .thumbnails-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
  }
  
  .thumbnails-header h3 {
    margin: 0;
    font-size: 18px;
    color: #333;
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: 24px;
    line-height: 24px;
    cursor: pointer;
    color: #555;
  }
  
  .close-button:hover {
    color: #e74c3c;
  }
  
  .thumbnails-container {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    padding: 20px;
    overflow-y: auto;
    align-content: flex-start;
  }
  
  .thumbnail-item {
    width: calc(33.333% - 10px);
    display: flex;
    flex-direction: column;
    border: 2px solid transparent;
    border-radius: 6px;
    overflow: hidden;
    transition: all 0.2s;
    cursor: pointer;
    background-color: #f9f9f9;
  }
  
  .thumbnail-item:hover {
    border-color: #3498db;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .thumbnail-item.selected {
    border-color: #2ecc71;
    box-shadow: 0 2px 15px rgba(46, 204, 113, 0.3);
  }
  
  .thumbnail-image {
    width: 100%;
    aspect-ratio: 4/3;
    object-fit: cover;
  }
  
  .thumbnail-info {
    padding: 10px;
    background-color: white;
    border-top: 1px solid #eee;
  }
  
  .thumbnail-position {
    font-weight: bold;
    margin-bottom: 5px;
    font-size: 14px;
  }
  
  .thumbnail-clarity {
    font-size: 13px;
    color: #555;
  }
  
  .clarity-bar {
    margin-top: 5px;
    height: 6px;
    background-color: #f0f0f0;
    border-radius: 3px;
    overflow: hidden;
  }
  
  .clarity-value {
    height: 100%;
    background-color: #3498db;
    border-radius: 3px;
  }
  
  .clarity-value.best-clarity {
    background-color: #2ecc71;
  }
  
  .thumbnails-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 15px 20px;
    border-top: 1px solid #eee;
    background-color: #f9f9f9;
  }
  
  .apply-button, .apply-best-button, .close-button-text {
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .apply-button {
    background-color: #3498db;
    color: white;
  }
  
  .apply-button:hover:not(:disabled) {
    background-color: #2980b9;
  }
  
  .apply-best-button {
    background-color: #2ecc71;
    color: white;
  }
  
  .apply-best-button:hover:not(:disabled) {
    background-color: #27ae60;
  }
  
  .close-button-text {
    background-color: #f5f5f5;
    color: #333;
  }
  
  .close-button-text:hover {
    background-color: #e5e5e5;
  }
  
  button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  /* 响应式设计 */
  @media (max-width: 900px) {
    .thumbnail-item {
      width: calc(50% - 10px);
    }
  }
  
  @media (max-width: 600px) {
    .thumbnail-item {
      width: 100%;
    }
  }
  </style>
  