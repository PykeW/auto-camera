// src/utils/helpers.js

// 格式化数字为指定小数位数的字符串
export function formatNumber(value, decimals = 3) {
    if (value === null || value === undefined) return '--';
    return Number(value).toFixed(decimals);
  }
  
  // 防抖函数
  export function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    };
  }
  
  // 节流函数
  export function throttle(fn, delay) {
    let lastCall = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastCall < delay) return;
      lastCall = now;
      fn.apply(this, args);
    };
  }
  
  // 显示消息提示 (可以在组件中实现)
  export function showMessage(message, type = 'info', duration = 3000) {
    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = `message-toast ${type}`;
    messageEl.textContent = message;
    
    // 添加到页面
    document.body.appendChild(messageEl);
    
    // 动画显示
    setTimeout(() => messageEl.classList.add('show'), 10);
    
    // 3秒后移除
    setTimeout(() => {
      messageEl.classList.remove('show');
      setTimeout(() => messageEl.remove(), 300);
    }, duration);
  }
  
  // 从 RGB 颜色创建 rgba 字符串
  export function createRgba(r, g, b, a) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  
  // 随机数生成（在范围内）
  export function randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }
  
  // 深度克隆对象
  export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }