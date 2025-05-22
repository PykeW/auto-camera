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

/**
 * 模拟模板匹配检测
 * @param {string} mainImageSrc - 主图像的DataURL
 * @param {string} templateImageSrc - 模板图像的DataURL
 * @param {number} threshold - 匹配阈值 (0-1)
 * @param {object} [roi] - 可选的感兴趣区域 { l, t, r, b }，在主图像中进行搜索
 * @returns {Promise<Array<{x: number, y: number, score: number}>>} - 匹配结果数组，包含位置和分数
 */
export async function simulateTemplateMatching(mainImageSrc, templateImageSrc, threshold, roi = null) {
  return new Promise(async (resolve) => {
    if (!mainImageSrc || !templateImageSrc) {
      console.warn('Main image or template image source is missing for template matching.');
      resolve([]);
      return;
    }

    try {
      const mainImg = await loadImageData(mainImageSrc);
      const templateImg = await loadImageData(templateImageSrc);

      const mainCanvas = document.createElement('canvas');
      mainCanvas.width = mainImg.width;
      mainCanvas.height = mainImg.height;
      const mainCtx = mainCanvas.getContext('2d');
      mainCtx.drawImage(mainImg, 0, 0);

      const templateCanvas = document.createElement('canvas');
      templateCanvas.width = templateImg.width;
      templateCanvas.height = templateImg.height;
      const templateCtx = templateCanvas.getContext('2d');
      templateCtx.drawImage(templateImg, 0, 0);

      const matches = [];
      const searchArea = roi || { l: 0, t: 0, r: mainImg.width, b: mainImg.height };
      
      // 检查图片是否是9点图片（根据路径判断）
      const is9PointImage = typeof mainImageSrc === 'string' && 
                         (mainImageSrc.includes('/9dian/') || 
                          mainImageSrc.includes('12_1618'));
      
      console.log('进行模板匹配:', {
        图片类型: is9PointImage ? '9点标定图片' : '普通图片',
        搜索区域: searchArea,
        阈值: threshold,
        模板尺寸: `${templateImg.width}x${templateImg.height}`
      });
      
      if (is9PointImage) {
        // 使用新的9点图片匹配函数
        const match = simulate9PointMatching(mainImageSrc);
        matches.push(match);
        
        // 可能添加一些额外的低分匹配点，使结果更真实
        const numAdditionalMatches = Math.floor(Math.random() * 3); // 0-2个额外匹配点
        for (let i = 0; i < numAdditionalMatches; i++) {
          // 生成周围区域的点，避开中心
          const randomX = searchArea.l + Math.random() * (searchArea.r - searchArea.l - templateImg.width);
          const randomY = searchArea.t + Math.random() * (searchArea.b - searchArea.t - templateImg.height);
          
          const score = 0.5 + Math.random() * 0.3; // 确保周围点匹配度较低（0.5-0.8）
          if (score >= threshold) { // 只有超过阈值才添加
            matches.push({
              x: Math.round(randomX + templateImg.width / 2),
              y: Math.round(randomY + templateImg.height / 2),
              score: score,
              rect: {
                x: Math.round(randomX),
                y: Math.round(randomY),
                width: templateImg.width,
                height: templateImg.height
              }
            });
          }
        }
      } else {
        // 对于非9点图片，使用原来的随机方法
        const numAttempts = 50; // 尝试检测的次数
        
        for (let i = 0; i < numAttempts; i++) {
          // 在搜索区域内随机生成一个左上角点
          const x = searchArea.l + Math.random() * (searchArea.r - searchArea.l - templateImg.width);
          const y = searchArea.t + Math.random() * (searchArea.b - searchArea.t - templateImg.height);
  
          if (x < searchArea.l || y < searchArea.t || x + templateImg.width > searchArea.r || y + templateImg.height > searchArea.b) {
            continue; // 超出搜索边界
          }
  
          // 模拟一个匹配分数，可以基于例如颜色相似性或只是随机
          const simulatedScore = 0.5 + Math.random() * 0.5; // 产生 0.5 到 1.0 之间的分数
  
          if (simulatedScore >= threshold) {
            matches.push({
              x: Math.round(x + templateImg.width / 2), // 匹配中心点X
              y: Math.round(y + templateImg.height / 2), // 匹配中心点Y
              score: simulatedScore,
              rect: { // 边界框
                x: Math.round(x),
                y: Math.round(y),
                width: templateImg.width,
                height: templateImg.height
              }
            });
          }
        }
      }
      
      // 模拟处理延迟
      await new Promise(r => setTimeout(r, 300 + Math.random() * 500));

      resolve(matches);
    } catch (error) {
      console.error('Error during simulated template matching:', error);
      resolve([]);
    }
  });
}

// Helper to load image data
function loadImageData(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 为9点标定图片分配固定的中心坐标
 * @param {string} imageName - 图片文件名
 * @returns {object} - 包含x和y坐标的对象
 */
export function get9PointCoordinates(imageName) {
  // 提取图片名称中的数字部分
  const match = imageName.match(/12_1618(\d+)\.png$/);
  if (!match) return { x: 320, y: 240 }; // 默认中心点
  
  const imageNumber = match[1];
  
  // 根据图片编号分配固定坐标
  const coordinates = {
    '25': { x: 160, y: 120 },  // 左上
    '27': { x: 320, y: 120 },  // 上中
    '29': { x: 480, y: 120 },  // 右上
    '31': { x: 160, y: 240 },  // 左中
    '33': { x: 320, y: 240 },  // 中心
    '35': { x: 480, y: 240 },  // 右中
    '37': { x: 160, y: 360 },  // 左下
    '39': { x: 320, y: 360 },  // 下中
    '41': { x: 480, y: 360 }   // 右下
  };
  
  return coordinates[imageNumber] || { x: 320, y: 240 };
}

/**
 * 获取9点图片的模拟匹配结果
 * @param {string} imageSrc - 图片路径
 * @returns {object} - 匹配结果对象
 */
export function simulate9PointMatching(imageSrc) {
  // 从路径中提取文件名
  const fileName = imageSrc.split('/').pop();
  
  // 获取预定义的坐标
  const coordinates = get9PointCoordinates(fileName);
  
  // 添加一些随机偏移，使结果更真实
  const offsetX = Math.random() * 10 - 5;
  const offsetY = Math.random() * 10 - 5;
  
  // 镜像x坐标（以图片宽度640为基准）
  const mirroredX = 640 - coordinates.x;
  
  // 生成匹配结果
  return {
    x: Math.round(mirroredX + offsetX),
    y: Math.round(coordinates.y + offsetY),
    score: 0.85 + Math.random() * 0.15, // 85%-100%的匹配度
    rect: {
      x: Math.round(mirroredX - 25 + offsetX),
      y: Math.round(coordinates.y - 25 + offsetY),
      width: 50,
      height: 50
    }
  };
}