// 模拟相机服务，在纯前端模式下使用Canvas生成图像
const cameraService = {
    // 连接相机
    async connect(params) {
      // 模拟连接延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 生成相机初始状态
      const cameraState = {
        success: true,
        isConnected: true,
        isCapturing: false,
        isRecording: false,
        serialNumber: params.serialNumber || 'SN_Sim_1',
        cameraName: '工业相机 MV-CH120-10GM',
        cameraModel: 'MV-CH120-10GM',
        configFile: 'C:/CameraConfigs/sim.cfg',
        savePath: 'D:/Captures/Sim/',
        
        // 位置数据
        XPosition: this.randomFloat(-100.0, 100.0, 3),
        YPosition: this.randomFloat(-100.0, 100.0, 3),
        ZPosition: this.randomFloat(0.0, 50.0, 3),
        UPosition: this.randomFloat(-180.0, 180.0, 3),
        
        // 编码器值
        XPositionEncoder: null,
        YPositionEncoder: null,
        ZPositionEncoder: null,
        UPositionEncoder: null,
        
        // 轴限制
        axisLimits: {
          X: { min: 0.0, max: 200.0 },
          Y: { min: 0.0, max: 200.0 },
          Z: { min: 0.0, max: 50.0 },
          U: { min: 0.0, max: 360.0 }
        },
        
        // ROI相关
        roiEnabled: false,
        roiCoords: { l: 150, t: 100, r: 450, b: 400 },
        
        // 对焦相关
        currentZ: 10.0,
        currentZEncoder: 10000,
        bestZ: 15.5,
        bestZEncoder: 15500,
        clarity: 0.85,
      };
      
      // 计算编码器值
      cameraState.XPositionEncoder = Math.round(cameraState.XPosition * 1000);
      cameraState.YPositionEncoder = Math.round(cameraState.YPosition * 1000);
      cameraState.ZPositionEncoder = Math.round(cameraState.ZPosition * 1000);
      cameraState.UPositionEncoder = Math.round(cameraState.UPosition * 1000);
      
      // 生成相机图像
      cameraState.cameraImageUrl = this.generateCameraImage();
      
      console.log('相机已连接:', cameraState.serialNumber);
      
      return cameraState;
    },
    
    // 断开相机
    async disconnect() {
      // 模拟断开延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('相机已断开');
      
      return {
        success: true,
        isConnected: false,
        message: '相机已断开连接'
      };
    },
    
    // 获取状态
    async getStatus() {
      // 这个方法应该返回当前相机的状态
      // 在纯前端模式下，我们只返回一些简单的模拟状态
      // 在真实应用中，这里应该从相机获取实时状态
      
      // 生成随机变化的位置值
      const xPos = this.randomFloat(-100.0, 100.0, 3);
      const yPos = this.randomFloat(-100.0, 100.0, 3);
      const zPos = this.randomFloat(0.0, 50.0, 3);
      const uPos = this.randomFloat(-180.0, 180.0, 3);
      
      // 计算清晰度
      const clarity = this.calculateClarity(zPos);
      
      // 生成相机图像
      const cameraImageUrl = this.generateCameraImage();
      
      return {
        success: true,
        isConnected: true,
        XPosition: xPos,
        YPosition: yPos,
        ZPosition: zPos,
        UPosition: uPos,
        XPositionEncoder: Math.round(xPos * 1000),
        YPositionEncoder: Math.round(yPos * 1000),
        ZPositionEncoder: Math.round(zPos * 1000),
        UPositionEncoder: Math.round(uPos * 1000),
        currentZ: zPos,
        currentZEncoder: Math.round(zPos * 1000),
        clarity: clarity,
        cameraImageUrl: cameraImageUrl
      };
    },
    
    // 轴移动
    async jogAxis(axisId, step, isEncoder = true, absolutePosition = null) {
      // 模拟轴移动响应
      // 在真实应用中，这里应该与硬件通信实现轴移动
      
      // 轴ID到名称的映射
      const axisMapping = {
        '1': 'X',
        '2': 'Y',
        '3': 'Z',
        '4': 'U'
      };
      
      // 获取轴名称
      const axisName = axisMapping[axisId] || axisId;
      
      // 轴限制范围
      let min_limit, max_limit;
      if (axisName === 'X' || axisName === 'Y') {
        min_limit = 0;
        max_limit = 200;
      } else if (axisName === 'Z') {
        min_limit = 0;
        max_limit = 50;
      } else { // U轴
        min_limit = 0;
        max_limit = 360;
      }
      
      // 编码器值限制
      const min_limit_encoder = min_limit * 1000;
      const max_limit_encoder = max_limit * 1000;
      
      // 计算新位置
      let new_pos_encoder;
      if (absolutePosition !== null) {
        // 使用绝对位置
        new_pos_encoder = Math.min(max_limit_encoder, Math.max(min_limit_encoder, absolutePosition));
      } else {
        // 使用相对位置
        // 模拟当前位置
        const current_pos_encoder = Math.round(Math.random() * max_limit_encoder);
        new_pos_encoder = current_pos_encoder + step;
        new_pos_encoder = Math.min(max_limit_encoder, Math.max(min_limit_encoder, new_pos_encoder));
      }
      
      // 计算毫米值
      const new_pos_mm = new_pos_encoder / 1000;
      
      // 生成响应
      const response = {
        success: true,
        [`${axisName}Position`]: new_pos_mm,
        [`${axisName}PositionEncoder`]: new_pos_encoder
      };
      
      // 如果是Z轴移动，同时更新清晰度
      if (axisName === 'Z') {
        response.currentZ = new_pos_mm;
        response.currentZEncoder = new_pos_encoder;
        response.clarity = this.calculateClarity(new_pos_mm);
      }
      
      console.log(`轴${axisName}移动至: ${new_pos_mm.toFixed(3)}mm (${new_pos_encoder}编码器值)`);
      
      return response;
    },
    
    // 更新ROI
    async updateROI(roi) {
      // 在纯前端模式下，我们只模拟响应
      console.log('更新ROI:', roi);
      
      return {
        success: true,
        roiEnabled: true,
        roiCoords: roi
      };
    },
    
    // 清除ROI
    async clearROI() {
      console.log('清除ROI');
      
      return {
        success: true,
        roiEnabled: false,
        roiCoords: { l: 150, t: 100, r: 450, b: 400 }
      };
    },
    
    // 开始采集
    async startCapture() {
      console.log('开始连续采集');
      
      return {
        success: true,
        isCapturing: true,
        isRecording: false
      };
    },
    
    // 停止采集
    async stopCapture() {
      console.log('停止采集/录制');
      
      return {
        success: true,
        isCapturing: false,
        isRecording: false
      };
    },
    
    // 单张拍照
    async singleShot() {
      console.log('执行单张拍照');
      
      return {
        success: true,
        message: '拍照成功'
      };
    },
    
    // 开始录制
    async startRecording() {
      console.log('开始录制');
      
      return {
        success: true,
        isCapturing: false,
        isRecording: true
      };
    },
    
    // 生成相机图像
    generateCameraImage() {
      // 使用Canvas生成一个简单的模拟相机图像
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
      
      // 添加十字中心线
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      
      // 添加一些测试图形
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      
      // 圆形
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 100, 0, Math.PI * 2);
      ctx.stroke();
      
      // 矩形
      ctx.strokeRect(width / 2 - 50, height / 2 - 50, 100, 100);
      
      // 添加时间戳
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      const timestamp = new Date().toLocaleTimeString();
      ctx.fillText(`时间: ${timestamp}`, 10, 20);
      
      // 模拟焦点位置
      ctx.fillText(`Z位置: 15.234mm`, 10, 40);
      ctx.fillText(`清晰度: 0.875`, 10, 60);
      
      return canvas.toDataURL('image/jpeg', 0.9);
    },
    
    // 计算清晰度
    calculateClarity(z) {
      // 使用高斯模型模拟清晰度 - 最佳焦点在15.5mm处
      const bestZ = 15.5;
      const diff = z - bestZ;
      const sigma = 5.0; // 标准差
      
      // 高斯函数: exp(-(x^2)/(2*sigma^2))
      const clarity = Math.exp(-(diff * diff) / (2 * sigma * sigma));
      
      // 添加少量随机波动
      return Math.max(0, Math.min(1, clarity * this.randomFloat(0.95, 1.05, 3)));
    },
    
    // 辅助方法：生成随机浮点数
    randomFloat(min, max, decimals = 2) {
      const rand = Math.random() * (max - min) + min;
      const factor = Math.pow(10, decimals);
      return Math.round(rand * factor) / factor;
    }
  };
  
  export { cameraService };