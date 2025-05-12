/**
 * 相机位置调整模拟工具
 * 用于演示相机从当前位置移动到目标拍照位置的效果
 */

class PositionSimulator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`容器元素 ${containerId} 不存在`);
    }
    
    this.setupUI();
    this.setupEvents();
    
    // 默认位置
    this.currentPosition = { x: 100, y: 100 };
    this.targetPosition = { x: 300, y: 200 };
    
    // 模拟相机视图
    this.cameraImage = null;
    
    // 初始化UI状态
    this.updatePositionDisplay();
  }
  
  /**
   * 初始化模拟器UI
   */
  setupUI() {
    this.container.innerHTML = `
      <div class="simulator-container">
        <div class="control-panel">
          <h3>相机位置调整模拟</h3>
          <div class="position-info">
            <div class="current-position">
              <span>当前位置:</span>
              <span>X: <span id="current-x">0</span></span>
              <span>Y: <span id="current-y">0</span></span>
            </div>
            <div class="target-position">
              <span>目标位置:</span>
              <span>X: <input type="number" id="target-x" value="300" min="0" max="1000"></span>
              <span>Y: <input type="number" id="target-y" value="200" min="0" max="1000"></span>
            </div>
          </div>
          <div class="action-buttons">
            <button id="btn-simulate">模拟移动到拍照位</button>
            <button id="btn-reset">重置</button>
          </div>
        </div>
        <div class="simulation-view">
          <div class="camera-view" id="camera-view">
            <div class="camera-image" id="camera-image"></div>
            <div class="view-frame"></div>
          </div>
        </div>
      </div>
    `;
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .simulator-container {
        display: flex;
        flex-direction: column;
        border: 1px solid #ccc;
        border-radius: 5px;
        padding: 15px;
        font-family: Arial, sans-serif;
      }
      .control-panel {
        margin-bottom: 20px;
      }
      .position-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 15px;
      }
      .action-buttons {
        display: flex;
        gap: 10px;
      }
      .simulation-view {
        position: relative;
        border: 1px solid #ddd;
        height: 400px;
        background-color: #f5f5f5;
        overflow: hidden;
      }
      .camera-view {
        position: relative;
        width: 100%;
        height: 100%;
      }
      .camera-image {
        position: absolute;
        width: 200px;
        height: 150px;
        background-color: #333;
        transition: transform 1.5s ease-in-out;
        transform-origin: center;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
      .view-frame {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 220px;
        height: 170px;
        border: 2px dashed red;
        pointer-events: none;
      }
      button {
        padding: 8px 15px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background-color: #45a049;
      }
      input[type="number"] {
        width: 60px;
        padding: 3px;
      }
    `;
    document.head.appendChild(style);
    
    // 初始化相机图像
    const cameraImage = document.getElementById('camera-image');
    cameraImage.innerHTML = '模拟相机图像';
    cameraImage.style.left = `${this.currentPosition.x}px`;
    cameraImage.style.top = `${this.currentPosition.y}px`;
    this.cameraImage = cameraImage;
  }
  
  /**
   * 设置事件监听
   */
  setupEvents() {
    document.getElementById('btn-simulate').addEventListener('click', () => {
      this.simulateMovement();
    });
    
    document.getElementById('btn-reset').addEventListener('click', () => {
      this.resetPosition();
    });
    
    document.getElementById('target-x').addEventListener('change', (e) => {
      this.targetPosition.x = parseInt(e.target.value, 10);
      this.updatePositionDisplay();
    });
    
    document.getElementById('target-y').addEventListener('change', (e) => {
      this.targetPosition.y = parseInt(e.target.value, 10);
      this.updatePositionDisplay();
    });
  }
  
  /**
   * 更新位置显示
   */
  updatePositionDisplay() {
    document.getElementById('current-x').textContent = this.currentPosition.x;
    document.getElementById('current-y').textContent = this.currentPosition.y;
    document.getElementById('target-x').value = this.targetPosition.x;
    document.getElementById('target-y').value = this.targetPosition.y;
  }
  
  /**
   * 模拟移动到拍照位
   */
  simulateMovement() {
    // 更新目标位置
    this.targetPosition.x = parseInt(document.getElementById('target-x').value, 10);
    this.targetPosition.y = parseInt(document.getElementById('target-y').value, 10);
    
    // 显示正在移动的状态
    const btnSimulate = document.getElementById('btn-simulate');
    btnSimulate.disabled = true;
    btnSimulate.textContent = '正在移动...';
    
    // 计算视图中心位置
    const viewContainer = document.querySelector('.simulation-view');
    const centerX = viewContainer.offsetWidth / 2 - this.cameraImage.offsetWidth / 2;
    const centerY = viewContainer.offsetHeight / 2 - this.cameraImage.offsetHeight / 2;
    
    // 计算偏移量
    const offset = {
      x: centerX - this.targetPosition.x,
      y: centerY - this.targetPosition.y
    };
    
    // 动画移动图像
    this.cameraImage.style.transition = 'transform 1.5s ease-in-out';
    this.cameraImage.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
    
    // 移动完成后更新当前位置
    setTimeout(() => {
      this.currentPosition = { ...this.targetPosition };
      this.updatePositionDisplay();
      
      btnSimulate.disabled = false;
      btnSimulate.textContent = '模拟移动到拍照位';
      
      // 显示模拟结果
      this.showSimulationResult();
    }, 1600);
  }
  
  /**
   * 显示模拟结果
   */
  showSimulationResult() {
    // 计算当前图像是否在视野中心
    const viewCenter = {
      x: document.querySelector('.simulation-view').offsetWidth / 2,
      y: document.querySelector('.simulation-view').offsetHeight / 2
    };
    
    const imageCenter = {
      x: this.cameraImage.offsetLeft + this.cameraImage.offsetWidth / 2,
      y: this.cameraImage.offsetTop + this.cameraImage.offsetHeight / 2
    };
    
    // 显示图像与中心的偏差
    const xOffset = Math.abs(viewCenter.x - imageCenter.x);
    const yOffset = Math.abs(viewCenter.y - imageCenter.y);
    
    // 创建或更新结果显示
    let resultEl = document.getElementById('simulation-result');
    if (!resultEl) {
      resultEl = document.createElement('div');
      resultEl.id = 'simulation-result';
      resultEl.style.cssText = `
        position: absolute;
        bottom: 10px;
        left: 10px;
        background-color: rgba(0,0,0,0.7);
        color: white;
        padding: 8px;
        border-radius: 4px;
        font-size: 14px;
      `;
      document.querySelector('.simulation-view').appendChild(resultEl);
    }
    
    // 判断是否居中
    const isCentered = xOffset < 20 && yOffset < 20;
    resultEl.innerHTML = isCentered 
      ? '<span style="color: #4CAF50;">✓ 图像已成功居中</span>' 
      : `<span style="color: #f44336;">⚠ 图像未居中，偏差: X=${xOffset.toFixed(2)}px, Y=${yOffset.toFixed(2)}px</span>`;
  }
  
  /**
   * 重置位置
   */
  resetPosition() {
    this.cameraImage.style.transition = 'none';
    this.cameraImage.style.transform = 'translate(0, 0)';
    this.cameraImage.style.left = `${this.currentPosition.x}px`;
    this.cameraImage.style.top = `${this.currentPosition.y}px`;
    
    // 清除模拟结果
    const resultEl = document.getElementById('simulation-result');
    if (resultEl) {
      resultEl.remove();
    }
  }
}

// 导出模拟器类
export default PositionSimulator; 