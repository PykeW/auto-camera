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
      
      // 确保清晰度在有效范围内
      clarity = Math.max(0, Math.min(1, clarity));
      
      // 绘制白色背景
      ctx.fillStyle = '#f2f2f2';
      ctx.fillRect(0, 0, width, height);
      
      // 添加随机纹理以增加真实感
      const textureOpacity = 0.03;
      ctx.fillStyle = `rgba(0, 0, 0, ${textureOpacity})`;
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = 1 + Math.random() * 2;
        ctx.fillRect(x, y, size, size);
      }
      
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
      
      // 绘制分辨率测试图案
      ctx.font = '20px Arial';
      const testText = "1234567890 ABCDEFGHIJKLM";
      ctx.fillText(testText, width / 2 - 150, height / 2 + 100);
      
      // 根据清晰度模拟焦点效果
      if (clarity < 1.0) {
        // 首先，模拟Bokeh效果（光晕效果）
        if (clarity < 0.7) {
          const bokehCount = Math.floor((1 - clarity) * 15);
          for (let i = 0; i < bokehCount; i++) {
            const bokehX = width / 2 + (Math.random() - 0.5) * width * 0.7;
            const bokehY = height / 2 + (Math.random() - 0.5) * height * 0.7;
            const bokehSize = 10 + Math.random() * 20;
            const gradient = ctx.createRadialGradient(
              bokehX, bokehY, 0,
              bokehX, bokehY, bokehSize
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${0.3 * (1 - clarity)})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(bokehX, bokehY, bokehSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        // 模拟模糊效果
        // 1. 使用白色半透明叠加
        const blurOpacity = Math.min(0.7, (1 - clarity) * 0.5);
        ctx.fillStyle = `rgba(255, 255, 255, ${blurOpacity})`;
        ctx.fillRect(0, 0, width, height);
        
        // 2. 绘制模糊圆环，模拟不同程度的散焦
        const maxBlurRings = 3;
        for (let i = 1; i <= maxBlurRings; i++) {
          const blurRadius = 80 + i * 40;
          const ringOpacity = (1 - clarity) * 0.15;
          
          ctx.strokeStyle = `rgba(150, 150, 150, ${ringOpacity})`;
          ctx.lineWidth = 1 + (1 - clarity) * 5;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, blurRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 3. 根据清晰度，添加色差效果，模拟色差像差
        if (clarity < 0.7) {
          const aberrationOffset = (1 - clarity) * 5;
          
          // 保存原始画布内容
          const imageData = ctx.getImageData(0, 0, width, height);
          
          // 红色通道偏移
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = `rgba(255, 0, 0, 0.3)`;
          ctx.fillRect(aberrationOffset, 0, width, height);
          
          // 蓝色通道偏移
          ctx.fillStyle = `rgba(0, 0, 255, 0.3)`;
          ctx.fillRect(-aberrationOffset, 0, width, height);
          
          // 恢复正常混合模式
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      
      // 显示在最佳焦点位置会出现的更多细节
      if (clarity > 0.85) {
        // 绘制精细线条和细节，这些只有在接近最佳焦点时才能看到
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 0.5;
        
        // 绘制放射线
        const rayCount = 12;
        for (let i = 0; i < rayCount; i++) {
          const angle = (i / rayCount) * Math.PI * 2;
          const endX = width / 2 + Math.cos(angle) * 200;
          const endY = height / 2 + Math.sin(angle) * 200;
          
          ctx.beginPath();
          ctx.moveTo(width / 2, height / 2);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        
        // 添加更多的细节文字
        ctx.font = '8px Arial';
        ctx.fillStyle = '#000000';
        for (let i = 0; i < 360; i += 30) {
          const angle = i * Math.PI / 180;
          const textX = width / 2 + Math.cos(angle) * 150;
          const textY = height / 2 + Math.sin(angle) * 150;
          ctx.fillText(`${i}°`, textX, textY);
        }
      }
      
      // 转换为base64数据URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
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