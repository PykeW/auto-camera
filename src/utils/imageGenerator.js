// src/utils/imageGenerator.js

// 使用Canvas API生成模拟图像
export function generateCameraImage(width = 640, height = 480) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // 绘制深灰色背景
      ctx.fillStyle = '#222222';
      ctx.fillRect(0, 0, width, height);
      
      // 添加网格线
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 1;
      
      // 横线
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // 竖线
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // 添加中心十字线
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.strokeStyle = '#777777';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, height);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
      
      // 添加一些文本
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText(`模拟相机图像 (${width}x${height})`, 10, 20);
      ctx.fillText(`时间: ${new Date().toLocaleTimeString()}`, 10, 40);
      
      // 转换为base64数据URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      resolve(dataUrl);
    });
  }
  
  // 生成对焦图像
  export function generateFocusImage(zPosition, clarity) {
    return new Promise((resolve) => {
      const width = 640;
      const height = 480;
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // 绘制白色背景
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      
      // 绘制网格线
      ctx.strokeStyle = '#AAAAAA';
      ctx.lineWidth = 1;
      
      // 横线
      for (let y = 0; y < height; y += 40) {
        const lineWidth = y % 120 === 0 ? 1 : 0.5;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // 竖线
      for (let x = 0; x < width; x += 40) {
        const lineWidth = x % 120 === 0 ? 1 : 0.5;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // 在中心区域绘制一些文本和形状
      const centerX = width / 2;
      const centerY = height / 2;
      
      // 根据清晰度模拟环状效果
      const ringsIntensity = Math.max(0, 1 - clarity) * 0.8;
      
      if (ringsIntensity > 0.05) {
        // 绘制多个同心圆，模拟Momus焦平面效果
        const maxRings = 5;
        for (let i = 1; i <= maxRings; i++) {
          const ringRadius = i * 30;
          const ringOpacity = ringsIntensity * (maxRings - i + 1) / maxRings;
          
          // 设置圆环颜色
          ctx.strokeStyle = `rgba(0, 120, 255, ${ringOpacity})`;
          
          // 计算环的厚度 - 清晰度越低环越宽
          const thickness = Math.max(1, Math.floor(3 * ringsIntensity));
          
          // 绘制圆环
          for (let t = 0; t < thickness; t++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, ringRadius + t, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      
      // 绘制文本框
      const text = `Z: ${(zPosition/1000).toFixed(3)}mm`;
      const fontSize = 40;
      const textWidth = text.length * fontSize / 2;
      const textHeight = fontSize;
      
      ctx.fillStyle = '#EEEEEE';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(centerX - textWidth/2, centerY - textHeight/2, textWidth, textHeight);
      ctx.fill();
      ctx.stroke();
      
      // 绘制一些形状
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(centerX - 100, centerY - 100, 200, 200);
      ctx.stroke();
      
      ctx.strokeStyle = 'blue';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
      ctx.stroke();
      
      // 模拟模糊效果 - 通过简化的方法模拟，因为Canvas不支持直接的高斯模糊
      if (clarity < 1) {
        // 模拟模糊效果，可以根据需要实现
        // 1. 可以使用filter: blur() CSS属性在前端展示
        // 2. 可以实现简单的盒子模糊算法
        // 3. 这里我们通过半透明白色矩形来简单模拟
        
        const blurAmount = (1 - clarity) * 0.6;
        ctx.fillStyle = `rgba(255, 255, 255, ${blurAmount})`;
        ctx.fillRect(0, 0, width, height);
      }
      
      // 转换为base64数据URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      resolve(dataUrl);
    });
  }
  
  // 生成校准图案
  export function generateCalibrationPattern(width = 600, height = 600, squareSize = 50) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // 白色背景
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      
      // 计算行列数
      const rows = Math.floor(height / squareSize);
      const cols = Math.floor(width / squareSize);
      
      // 绘制黑白方格
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          if ((i + j) % 2 === 0) {
            ctx.fillStyle = 'black';
            ctx.fillRect(j * squareSize, i * squareSize, squareSize, squareSize);
          }
        }
      }
      
      // 绘制交点标记
      const pointRadius = 3;
      ctx.fillStyle = 'red';
      
      for (let i = 1; i < rows; i++) {
        for (let j = 1; j < cols; j++) {
          const x = j * squareSize;
          const y = i * squareSize;
          ctx.beginPath();
          ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // 转换为base64数据URL
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    });
  }