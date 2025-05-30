// src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './assets/styles.css';

// 导入stagewise工具栏（仅在开发模式下）
import { StagewiseToolbar } from '@stagewise/toolbar-vue';

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.mount('#app');

// 仅在开发模式下初始化stagewise工具栏
if (import.meta.env.DEV) {
  const stagewiseConfig = {
    plugins: []
  };
  
  // 创建stagewise工具栏组件并挂载到DOM
  const stagewiseApp = createApp(StagewiseToolbar, {
    config: stagewiseConfig
  });
  
  // 创建一个独立DOM元素用于挂载工具栏
  const stagewiseElement = document.createElement('div');
  stagewiseElement.id = 'stagewise-toolbar';
  document.body.appendChild(stagewiseElement);
  
  // 挂载工具栏
  stagewiseApp.mount('#stagewise-toolbar');
}