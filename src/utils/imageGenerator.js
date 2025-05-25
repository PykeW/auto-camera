// src/utils/imageGenerator.js

// 使用Canvas API生成模拟图像
export function generateCameraImage(width = 640, height = 480) {
    return new Promise((resolve) => {
      // 使用统一的图片路径
      resolve('/9dian/12_161833.png');
    });
  }
  
  // 生成对焦图像
  export function generateFocusImage(zPosition, clarity) {
    return new Promise((resolve) => {
      // 使用统一的图片路径
      resolve('/9dian/12_161833.png');
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
  
  // 根据图片编号分配固定坐标（显示坐标，已适应640x480的显示尺寸）
  // 微调了所有坐标以匹配实际mark点位置
  const coordinates = {
    '25': { x: 160, y: 115 },  // 左上
    '27': { x: 320, y: 115 },  // 上中
    '29': { x: 480, y: 115 },  // 右上
    '31': { x: 160, y: 240 },  // 左中 - 调整以匹配截图
    '33': { x: 320, y: 240 },  // 中心 
    '35': { x: 480, y: 240 },  // 右中
    '37': { x: 160, y: 360 },  // 左下
    '39': { x: 320, y: 360 },  // 下中
    '41': { x: 480, y: 360 }   // 右下
  };
  
  // 检查特定图片并记录日志
  if (imageNumber === '31') {
    console.log(`图片 12_161831.png (第4张) 使用坐标: (${coordinates[imageNumber].x}, ${coordinates[imageNumber].y})`);
  }
  
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
  
  // 使用精确的预定义坐标，无随机偏移
  const finalX = coordinates.x;
  const finalY = coordinates.y;
  
  // 固定mark尺寸
  const markSize = 50;
  
  console.log(`[simulate9PointMatching] 图片${fileName}的mark点固定坐标:`, {x: finalX, y: finalY});
  
  // 生成匹配结果，使用精确坐标
  return {
    x: Math.round(finalX),
    y: Math.round(finalY),
    score: 0.95, // 固定高匹配度，移除随机性
    rect: {
      x: Math.round(finalX - markSize/2),
      y: Math.round(finalY - markSize/2),
      width: markSize,
      height: markSize
    }
  };
}