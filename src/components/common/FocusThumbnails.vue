 <!-- src/components/common/FocusThumbnails.vue -->
<template>
    <div class="focus-thumbnails-container" :class="{ show, hide: !show }" :style="{ display: show ? 'flex' : 'none' }">
      <div class="thumbnails-header">
        <span>对焦图像预览</span>
        <button class="thumbnails-close-btn" title="关闭预览" @click="$emit('close')">&times;</button>
      </div>
      <div class="focus-thumbnails" ref="thumbnailsContainer">
        <div
          v-for="(image, index) in focusImages"
          :key="index"
          :class="[
            'focus-thumbnail',
            { 'best': image.isBest },
            { 'selected': index === currentDisplayedImageIndex }
          ]"
          @click="selectThumbnail(index)"
          @contextmenu.prevent="showMenu($event, index)"
        >
          <img :src="image.imageData" :alt="`Focus Position ${image.zPosition}`">
          <div class="focus-thumbnail-info">
            <div>Z: {{ image.zPosition.toFixed(3) }} mm</div>
            <div>清晰度: {{ image.clarity.toFixed(3) }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 缩略图右键菜单 -->
    <div class="focus-thumbnail-menu" v-if="menuVisible" :style="{ left: menuX + 'px', top: menuY + 'px' }">
      <div class="focus-thumbnail-menu-item" data-action="set-focus" @click="handleMenuAction('set-focus', menuIndex)">
        <i class="fas fa-crosshairs"></i>设为对焦位置
      </div>
      <div class="focus-thumbnail-menu-item" data-action="view-large" @click="handleMenuAction('view-large', menuIndex)">
        <i class="fas fa-search-plus"></i>查看大图
      </div>
    </div>
    <div class="context-menu-overlay" v-if="menuVisible" @click="hideMenu"></div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
  import { useFocusStore } from '../../stores/focus';
  import { showMessage } from '../../utils/helpers';
  
  const props = defineProps({
    show: {
      type: Boolean,
      default: false
    }
  });
  
  const emit = defineEmits(['close']);
  
  const focusStore = useFocusStore();
  const thumbnailsContainer = ref(null);
  
  // 菜单状态
  const menuVisible = ref(false);
  const menuX = ref(0);
  const menuY = ref(0);
  const menuIndex = ref(0);
  
  // 从store获取状态
  const focusImages = computed(() => focusStore.focusImages);
  const currentDisplayedImageIndex = computed(() => focusStore.currentDisplayedImageIndex);
  
  // 选中缩略图
  function selectThumbnail(index) {
    focusStore.selectThumbnail(index);
  }
  
  // 显示右键菜单
  function showMenu(event, index) {
    menuX.value = event.clientX;
    menuY.value = event.clientY;
    menuIndex.value = index;
    menuVisible.value = true;
    
    // 选中该缩略图
    selectThumbnail(index);
  }
  
  // 隐藏菜单
  function hideMenu() {
    menuVisible.value = false;
  }
  
  // 处理菜单操作
  async function handleMenuAction(action, index) {
    if (action === 'set-focus') {
      await focusStore.saveFocusPosition();
      showMessage('成功设置对焦位置', 'success');
    } else if (action === 'view-large') {
      selectThumbnail(index);
    }
    
    hideMenu();
  }
  
  // 实现水平滚动
  function setupHorizontalScroll() {
    if (!thumbnailsContainer.value) return;
    
    thumbnailsContainer.value.addEventListener('wheel', (e) => {
      e.preventDefault();
      thumbnailsContainer.value.scrollLeft += (e.deltaY * 3);
    }, { passive: false });
  }
  
  // 在组件挂载后设置水平滚动
  onMounted(() => {
    setupHorizontalScroll();
  });
  
  // 监听点击事件，当点击页面其他位置时隐藏菜单
  function handleClickOutside(event) {
    if (menuVisible.value) {
      const menu = document.querySelector('.focus-thumbnail-menu');
      if (menu && !menu.contains(event.target)) {
        hideMenu();
      }
    }
  }
  
  onMounted(() => {
    document.addEventListener('click', handleClickOutside);
  });
  
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
  });
  </script>