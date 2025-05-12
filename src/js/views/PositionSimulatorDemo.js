/**
 * 相机位置模拟器演示页面
 */
import PositionSimulator from '../utils/positionSimulator.js';

class PositionSimulatorDemo {
  constructor() {
    this.initPage();
  }
  
  /**
   * 初始化页面
   */
  initPage() {
    // 创建容器
    const demoContainer = document.createElement('div');
    demoContainer.id = 'position-simulator-demo';
    demoContainer.innerHTML = `
      <div class="demo-header">
        <h2>相机定位功能模拟演示</h2>
        <p>本演示展示了相机如何移动到不同拍照位置，以及位置调整对图像居中的影响。</p>
      </div>
      <div class="demo-content">
        <div id="simulator-container"></div>
        <div class="instruction-panel">
          <h3>操作说明</h3>
          <ol>
            <li>调整目标X和Y坐标值</li>
            <li>点击"模拟移动到拍照位"按钮</li>
            <li>观察相机图像的移动过程</li>
            <li>查看图像是否成功居中</li>
            <li>点击"重置"可以恢复初始状态</li>
          </ol>
          <div class="preset-positions">
            <h4>预设位置</h4>
            <button class="preset-btn" data-x="200" data-y="150">位置1</button>
            <button class="preset-btn" data-x="300" data-y="250">位置2</button>
            <button class="preset-btn" data-x="100" data-y="300">位置3</button>
          </div>
        </div>
      </div>
    `;
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      #position-simulator-demo {
        max-width: 1000px;
        margin: 0 auto;
        padding: 20px;
        font-family: Arial, sans-serif;
      }
      .demo-header {
        margin-bottom: 30px;
        text-align: center;
      }
      .demo-content {
        display: flex;
        gap: 20px;
      }
      #simulator-container {
        flex: 2;
      }
      .instruction-panel {
        flex: 1;
        padding: 15px;
        background-color: #f8f8f8;
        border-radius: 5px;
        border: 1px solid #e0e0e0;
      }
      .preset-positions {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid #ddd;
      }
      .preset-btn {
        margin-right: 10px;
        margin-bottom: 10px;
        padding: 5px 10px;
        background-color: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      .preset-btn:hover {
        background-color: #0b7dda;
      }
      @media (max-width: 768px) {
        .demo-content {
          flex-direction: column;
        }
      }
    `;
    document.head.appendChild(style);
    
    // 添加到页面
    document.body.appendChild(demoContainer);
    
    // 初始化模拟器
    this.simulator = new PositionSimulator('simulator-container');
    
    // 设置预设位置按钮事件
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const x = parseInt(btn.dataset.x, 10);
        const y = parseInt(btn.dataset.y, 10);
        document.getElementById('target-x').value = x;
        document.getElementById('target-y').value = y;
        // 触发change事件
        const eventX = new Event('change');
        const eventY = new Event('change');
        document.getElementById('target-x').dispatchEvent(eventX);
        document.getElementById('target-y').dispatchEvent(eventY);
      });
    });
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new PositionSimulatorDemo();
});

export default PositionSimulatorDemo; 