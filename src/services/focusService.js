// 焦点服务 - 模拟自动对焦功能
export const focusService = {
    // 开始自动对焦
    async startFocus(params) {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('开始自动对焦，参数:', params);
      
      return {
        success: true,
        message: '对焦过程已开始'
      };
    },
    
    // 停止自动对焦
    async stopFocus() {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('停止自动对焦');
      
      return {
        success: true,
        message: '对焦过程已停止'
      };
    },
    
    // 获取对焦图像列表
    async getFocusImages() {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 生成模拟对焦图像
      const images = Array.from({ length: 10 }, (_, i) => {
        // 计算模拟Z位置，假设最佳对焦点在中间
        const zPosition = 10 + i * 0.5;
        // 计算清晰度，最高点在中间
        const clarity = Math.max(0, 1 - Math.abs(i - 5) * 0.15);
        
        return {
          zPosition,
          zPositionEncoder: Math.round(zPosition * 1000),
          clarity,
          imageData: this.generateFocusImage(zPosition, clarity)
        };
      });
      
      return {
        success: true,
        images,
        focusCompleted: true
      };
    },
    
    // 设置对焦位置
    async setFocusPosition(zPosition, zPositionEncoder) {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 400));
      
      console.log(`设置对焦位置: ${zPosition}mm (${zPositionEncoder}编码器值)`);
      
      // 计算清晰度 - 使用高斯模型模拟
      const bestZ = 15.5;
      const diff = zPosition - bestZ;
      const sigma = 5.0;
      const clarity = Math.exp(-(diff * diff) / (2 * sigma * sigma));
      
      return {
        success: true,
        zPosition,
        zPositionEncoder,
        clarity: clarity * this.randomFloat(0.95, 1.05, 3)
      };
    },
    
    // 生成模拟对焦图像
    generateFocusImage(zPosition, clarity) {
      // 使用Canvas生成一个简单的模拟图像
      const canvas = document.createElement('canvas');
      const width = 640;
      const height = 480;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // 黑色背景
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      // 添加网格线
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // 模拟不同清晰度的效果 - 越模糊线条越粗
      const blurLevel = Math.max(0, 10 * (1 - clarity));
      if (blurLevel > 0) {
        ctx.filter = `blur(${blurLevel}px)`;
      }
      
      // 绘制测试图形
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      
      // 圆形
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 100, 0, Math.PI * 2);
      ctx.stroke();
      
      // 矩形
      ctx.strokeRect(width / 2 - 50, height / 2 - 50, 100, 100);
      
      // 重置滤镜
      ctx.filter = 'none';
      
      // 添加信息文本
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.fillText(`Z位置: ${zPosition.toFixed(3)}mm`, 10, 20);
      ctx.fillText(`清晰度: ${clarity.toFixed(3)}`, 10, 40);
      
      return canvas.toDataURL('image/jpeg');
    },
    
    // 辅助方法：生成随机浮点数
    randomFloat(min, max, decimals = 2) {
      const rand = Math.random() * (max - min) + min;
      const factor = Math.pow(10, decimals);
      return Math.round(rand * factor) / factor;
    }
  };