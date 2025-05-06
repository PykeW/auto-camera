// FocusController.js - 对焦相关功能控制器
import { Utilities } from '../utils/Utilities.js';

export class FocusController {
    constructor(cameraController) {
        this.cameraController = cameraController;
        this.utils = new Utilities();
    }
    
    // 开始自动对焦
    async startAutofocus() {
        if (this.cameraController.state.isFocusing) return;
        
        // 更新状态
        this.cameraController.state.isFocusing = true;
        this.cameraController.state.focusProcessId++; // 增加进程ID，以便可以取消此过程
        const currentProcessId = this.cameraController.state.focusProcessId;
        
        // 更新UI状态
        document.getElementById('start-focus-btn').disabled = true;
        document.getElementById('stop-focus-btn').disabled = false;
        
        try {
            // 对焦开始
            this.cameraController.updateFocusStatus('初始化-检查');
            await this.cameraController.wait(800);
            
            if (currentProcessId !== this.cameraController.state.focusProcessId) return;
            
            // 检查ROI区域
            if (!this.cameraController.state.focusRoi) {
                // 如果没有设置ROI，提示用户先设置ROI
                this.cameraController.updateFocusStatus('错误');
                alert('请先设置对焦ROI区域');
                this.stopAutofocus();
                return;
            }
            
            // 请求Z轴控制权
            this.cameraController.updateFocusStatus('请求Z轴控制权');
            await this.cameraController.wait(1000);
            
            if (currentProcessId !== this.cameraController.state.focusProcessId) return;
            
            // 粗对焦阶段
            this.cameraController.updateFocusStatus('粗对焦中');
            let bestClarity = -1;
            let bestZ = this.cameraController.state.currentZ;
            
            // 搜索范围
            const searchRange = 30;
            const startZ = Math.max(10, this.cameraController.state.currentZ - searchRange / 2);
            const endZ = startZ + searchRange;
            const step = 5;
            
            // 粗搜索
            for (let z = startZ; z <= endZ; z += step) {
                // 移动Z轴到目标位置
                await this.cameraController.simulateZMovement(z);
                
                if (currentProcessId !== this.cameraController.state.focusProcessId) return;
                
                // 计算当前位置的清晰度
                const clarity = this.cameraController.calculateClarity(z);
                
                // 更新最佳位置
                if (clarity > bestClarity) {
                    bestClarity = clarity;
                    bestZ = z;
                }
                
                await this.cameraController.wait(200);
                if (currentProcessId !== this.cameraController.state.focusProcessId) return;
            }
            
            // 精细对焦阶段
            this.cameraController.updateFocusStatus('精细对焦中');
            
            // 在最佳位置附近进行精细搜索
            const fineStartZ = Math.max(10, bestZ - step);
            const fineEndZ = bestZ + step;
            const fineStep = 1;
            
            bestClarity = -1;
            
            for (let z = fineStartZ; z <= fineEndZ; z += fineStep) {
                // 移动Z轴到目标位置
                await this.cameraController.simulateZMovement(z);
                
                if (currentProcessId !== this.cameraController.state.focusProcessId) return;
                
                // 计算当前位置的清晰度
                const clarity = this.cameraController.calculateClarity(z);
                
                // 更新最佳位置
                if (clarity > bestClarity) {
                    bestClarity = clarity;
                    bestZ = z;
                }
                
                await this.cameraController.wait(200);
                if (currentProcessId !== this.cameraController.state.focusProcessId) return;
            }
            
            // 移动到最佳位置
            this.cameraController.updateFocusStatus('移动到最佳位置');
            await this.cameraController.simulateZMovement(bestZ);
            
            if (currentProcessId !== this.cameraController.state.focusProcessId) return;
            
            // 保存最佳Z位置
            this.cameraController.state.bestZ = bestZ;
            
            // 对焦完成
            this.cameraController.updateFocusStatus('已对焦');
            
            // 保存状态
            this.cameraController.saveState();
            
        } catch (error) {
            console.error('自动对焦过程出错:', error);
            this.cameraController.updateFocusStatus('错误');
        } finally {
            // 确保状态被重置
            if (currentProcessId === this.cameraController.state.focusProcessId) {
                this.stopAutofocus();
            }
        }
    }
    
    // 停止自动对焦
    stopAutofocus() {
        // 增加进程ID以取消当前对焦过程
        this.cameraController.state.focusProcessId++;
        
        // 如果不在对焦中，直接返回
        if (!this.cameraController.state.isFocusing) return;
        
        // 更新状态
        this.cameraController.state.isFocusing = false;
        
        // 仅当当前状态不是'已对焦'或'错误'时才更新为'已停止'
        if (this.cameraController.state.focusStatus !== '已对焦' && 
            this.cameraController.state.focusStatus !== '错误') {
            this.cameraController.updateFocusStatus('已停止');
        }
        
        // 更新UI状态
        document.getElementById('start-focus-btn').disabled = false;
        document.getElementById('stop-focus-btn').disabled = true;
        
        // 保存状态
        this.cameraController.saveState();
    }
    
    // 开始绘制焦点ROI
    startFocusRoiDraw(isRedraw = false) {
        // 如果已经在绘制中，返回
        if (this.cameraController.state.isDrawingRoi) {
            return;
        }
        
        // 设置状态
        this.cameraController.state.isDrawingRoi = true;
        
        // 更新按钮状态
        document.getElementById('draw-roi-focus-btn').disabled = true;
        document.getElementById('confirm-roi-focus-btn').style.display = 'block';
        document.getElementById('focus-roi-button-group').style.display = 'flex';
        
        // 如果是重绘，需要清除原来的ROI
        if (isRedraw && this.cameraController.state.focusRoi) {
            this.cameraController.state.focusRoi = null;
            document.getElementById('focus-roi-overlay').style.opacity = '0';
        }
        
        // 添加鼠标事件监听器
        const container = document.getElementById('camera-display-container');
        container.addEventListener('mousedown', this.handleRoiMouseDown.bind(this));
        container.style.cursor = 'crosshair';
    }
    
    // 处理ROI鼠标按下事件
    handleRoiMouseDown(event) {
        if (!this.cameraController.state.isDrawingRoi) return;
        
        // 获取鼠标在图像上的坐标
        const coords = this.cameraController.uiController.getImageCoordinates(event, document.getElementById('simulated-image'));
        if (!coords) return;
        
        // 创建新的ROI对象
        this.cameraController.state.focusRoi = {
            startX: coords.x,
            startY: coords.y,
            width: 0,
            height: 0
        };
        
        // 添加鼠标移动和松开事件
        document.addEventListener('mousemove', this.handleRoiMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleRoiMouseUp.bind(this));
    }
    
    // 处理ROI鼠标移动事件
    handleRoiMouseMove(event) {
        if (!this.cameraController.state.isDrawingRoi || !this.cameraController.state.focusRoi) return;
        
        // 获取鼠标在图像上的坐标
        const coords = this.cameraController.uiController.getImageCoordinates(event, document.getElementById('simulated-image'));
        if (!coords) return;
        
        // 更新ROI尺寸
        this.cameraController.state.focusRoi.width = coords.x - this.cameraController.state.focusRoi.startX;
        this.cameraController.state.focusRoi.height = coords.y - this.cameraController.state.focusRoi.startY;
        
        // 更新ROI显示
        this.cameraController.uiController.updateRoiOverlay();
    }
    
    // 处理ROI鼠标松开事件
    handleRoiMouseUp(event) {
        if (!this.cameraController.state.isDrawingRoi) return;
        
        // 移除鼠标事件监听器
        document.removeEventListener('mousemove', this.handleRoiMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleRoiMouseUp.bind(this));
        
        // 恢复鼠标指针
        document.getElementById('camera-display-container').style.cursor = 'default';
        
        // 确保ROI有效
        if (this.cameraController.state.focusRoi) {
            const roi = this.cameraController.state.focusRoi;
            
            // 确保宽度和高度为正值
            if (roi.width < 0) {
                roi.startX += roi.width;
                roi.width = Math.abs(roi.width);
            }
            
            if (roi.height < 0) {
                roi.startY += roi.height;
                roi.height = Math.abs(roi.height);
            }
            
            // 更新ROI显示
            this.cameraController.uiController.updateRoiOverlay();
        }
    }
    
    // 确认焦点ROI
    confirmFocusRoi() {
        // 确保有有效的ROI
        if (!this.cameraController.state.focusRoi || 
            Math.abs(this.cameraController.state.focusRoi.width) < 10 || 
            Math.abs(this.cameraController.state.focusRoi.height) < 10) {
            alert('请绘制有效的ROI区域（至少10x10像素）');
            return;
        }
        
        // 结束绘制模式
        this.cameraController.state.isDrawingRoi = false;
        
        // 移除事件监听器
        const container = document.getElementById('camera-display-container');
        container.removeEventListener('mousedown', this.handleRoiMouseDown.bind(this));
        container.style.cursor = 'default';
        
        // 更新UI
        this.cameraController.uiController.updateRoiControlsUI();
        
        // 保存状态
        this.cameraController.saveState();
    }
    
    // 清除焦点ROI
    clearFocusRoi() {
        // 清除ROI数据
        this.cameraController.state.focusRoi = null;
        
        // 隐藏ROI显示
        document.getElementById('focus-roi-overlay').style.opacity = '0';
        
        // 更新UI
        this.cameraController.uiController.updateRoiControlsUI();
        
        // 保存状态
        this.cameraController.saveState();
    }
    
    // 切换焦点ROI可见性
    toggleFocusRoiVisibility() {
        if (!this.cameraController.state.focusRoi) return;
        
        this.cameraController.state.focusRoiVisible = !this.cameraController.state.focusRoiVisible;
        
        // 更新ROI显示
        document.getElementById('focus-roi-overlay').style.opacity = 
            this.cameraController.state.focusRoiVisible ? '1' : '0';
        
        // 更新按钮图标
        const toggleButton = document.getElementById('toggle-focus-roi-visibility-btn');
        toggleButton.innerHTML = this.cameraController.state.focusRoiVisible ? 
            '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        
        // 保存状态
        this.cameraController.saveState();
    }
} 