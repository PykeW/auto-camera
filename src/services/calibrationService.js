// 在 src/services 目录下创建 calibrationService.js
export const calibrationService = {
    // 检测Mark点
    async detectMark() {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 模拟Mark点检测
      const detected = Math.random() > 0.2; // 80%概率检测成功
      
      if (detected) {
        return {
          success: true,
          markPoints: [
            { x: Math.round(950 + Math.random() * 100), y: Math.round(540 + Math.random() * 100) }
          ]
        };
      } else {
        return {
          success: false,
          message: '未检测到Mark点'
        };
      }
    },
    
    // 居中Mark点
    async centerMark() {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      return {
        success: true,
        position: { x: 960, y: 540 }
      };
    },
    
    // 开始标定
    async startCalibration(params) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const size = params.size || 3;
      const totalPoints = size * size;
      
      return {
        success: true,
        totalPoints,
        message: `已开始${size}x${size}矩阵标定`
      };
    },
    
    // 停止标定
    async stopCalibration() {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        success: true,
        message: '标定已停止'
      };
    },
    
    // 计算当量比例
    async calculateRatio(squareSize) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 生成一个合理的当量值
      const ratio = 0.0047 + Math.random() * 0.0008;
      
      return {
        success: true,
        ratio,
        unit: 'mm/像素'
      };
    }
  };