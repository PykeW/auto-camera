// FocusController.js - 对焦相关功能控制器
import { Utilities } from '../utils/Utilities.js';

export class FocusController {
    constructor(cameraController) {
        this.cameraController = cameraController;
        this.utils = new Utilities();
        
        // 照相位置Z坐标，默认为最佳对焦位置
        this.photoPositionZ = null;
        
        // 初始化自动对焦参数
        this.initFocusParameters();
        
        // 绑定事件监听
        this.bindEvents();
    }
    
    // 初始化自动对焦参数
    initFocusParameters() {
        // 获取参数输入元素
        this.startZInput = document.getElementById('focus-start-z');
        this.endZInput = document.getElementById('focus-end-z');
        this.coarseStepInput = document.getElementById('focus-coarse-step');
        this.fineStepInput = document.getElementById('focus-fine-step');
        this.moveToPhotoBtn = document.getElementById('move-to-photo-pos-btn');
        
        // 设置默认值
        if (!this.startZInput.value) this.startZInput.value = "10";
        if (!this.endZInput.value) this.endZInput.value = "40";
        if (!this.coarseStepInput.value) this.coarseStepInput.value = "5";
        if (!this.fineStepInput.value) this.fineStepInput.value = "1";
    }
    
    // 绑定事件监听
    bindEvents() {
        // 绑定移到拍照位按钮事件
        if (this.moveToPhotoBtn) {
            this.moveToPhotoBtn.addEventListener('click', () => this.moveToPhotoPosition());
        }
        
        // 绑定开始对焦按钮事件
        const startFocusBtn = document.getElementById('start-focus-btn');
        if (startFocusBtn) {
            startFocusBtn.addEventListener('click', () => this.startAutofocus());
        }
        
        // 绑定停止对焦按钮事件
        const stopFocusBtn = document.getElementById('stop-focus-btn');
        if (stopFocusBtn) {
            stopFocusBtn.addEventListener('click', () => this.stopAutofocus());
        }
    }
    
    // 开始自动对焦
    async startAutofocus() {
        // 确保CameraController有state对象
        if (!this.cameraController.state) {
            this.cameraController.state = {
                isFocusing: false,
                focusProcessId: 0,
                focusStatus: '空闲',
                focusRoi: null
            };
        }
        
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
                // 模拟ROI区域
                this.cameraController.state.focusRoi = {
                    x: 100,
                    y: 100,
                    width: 200,
                    height: 200
                };
                console.log("模拟: 自动创建ROI区域");
            }
            
            // 请求Z轴控制权
            this.cameraController.updateFocusStatus('请求Z轴控制权');
            await this.cameraController.wait(1000);
            
            if (currentProcessId !== this.cameraController.state.focusProcessId) return;
            
            // 获取参数值
            const startZ = parseFloat(this.startZInput.value);
            const endZ = parseFloat(this.endZInput.value);
            const coarseStep = parseFloat(this.coarseStepInput.value);
            const fineStep = parseFloat(this.fineStepInput.value);
            
            // 检查参数有效性
            if (isNaN(startZ) || isNaN(endZ) || isNaN(coarseStep) || isNaN(fineStep) || 
                startZ >= endZ || coarseStep <= 0 || fineStep <= 0) {
                this.cameraController.updateFocusStatus('错误');
                this.utils.showNotification('error', '参数错误', '对焦参数设置无效，请检查');
                this.stopAutofocus();
                return;
            }
            
            // 粗对焦阶段
            this.cameraController.updateFocusStatus('粗对焦中');
            let bestClarity = -1;
            let bestZ = this.cameraController.state.currentZ;
            
            // 粗搜索
            for (let z = startZ; z <= endZ; z += coarseStep) {
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
            const fineStartZ = Math.max(10, bestZ - coarseStep);
            const fineEndZ = bestZ + coarseStep;
            
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
            
            // 保存最佳Z位置为照相位置
            this.photoPositionZ = bestZ;
            
            // 保存最佳Z位置
            this.cameraController.state.bestZ = bestZ;
            
            // 对焦完成
            this.cameraController.updateFocusStatus('已对焦');
            this.utils.showNotification('success', '对焦完成', `成功找到最佳对焦位置: ${bestZ.toFixed(3)}mm`);
            
            // 保存状态
            this.cameraController.saveState();
            
        } catch (error) {
            console.error('自动对焦过程出错:', error);
            this.cameraController.updateFocusStatus('错误');
            this.utils.showNotification('error', '对焦失败', error.message || '自动对焦过程中发生错误');
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
    
    // 移动到拍照位置
    async moveToPhotoPosition() {
        // 检查是否有照相位置
        if (this.photoPositionZ === null) {
            this.utils.showNotification('warning', '未设置拍照位', '请先执行自动对焦以确定最佳拍照位置');
            return;
        }
        
        try {
            // 更新状态
            this.cameraController.updateFocusStatus('移动到拍照位');
            
            // 移动到照相位置
            await this.cameraController.simulateZMovement(this.photoPositionZ);
            
            // 更新状态
            this.cameraController.updateFocusStatus('已到达拍照位');
            this.utils.showNotification('info', '已到达拍照位', `已移动到Z: ${this.photoPositionZ.toFixed(3)}mm`);
            
        } catch (error) {
            console.error('移动到拍照位出错:', error);
            this.cameraController.updateFocusStatus('错误');
            this.utils.showNotification('error', '移动失败', error.message || '移动到拍照位过程中发生错误');
        }
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
        
        // 添加绘制提示
        container.classList.add('drawing-roi-mode');
        this.utils.showNotification('info', '绘制ROI', '请在图像上按住鼠标左键并拖动以绘制矩形对焦区域');
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
        
        // 更新ROI宽度和高度
        const roi = this.cameraController.state.focusRoi;
        roi.width = coords.x - roi.startX;
        roi.height = coords.y - roi.startY;
        
        // 更新ROI显示
        this.cameraController.uiController.updateRoiDisplay(roi, 'focus-roi-overlay', 'focus');
    }
    
    // 处理ROI鼠标松开事件
    handleRoiMouseUp(event) {
        if (!this.cameraController.state.isDrawingRoi) return;
        
        // 移除事件监听器
        document.removeEventListener('mousemove', this.handleRoiMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleRoiMouseUp.bind(this));
        
        // 检查ROI有效性
        const roi = this.cameraController.state.focusRoi;
        if (roi && (Math.abs(roi.width) < 5 || Math.abs(roi.height) < 5)) {
            // ROI太小，显示警告
            this.utils.showNotification('warning', 'ROI太小', '绘制的区域太小，请重新绘制');
            this.cameraController.state.focusRoi = null;
            document.getElementById('focus-roi-overlay').style.display = 'none';
        } else if (roi) {
            // 规范化ROI (确保宽度和高度为正值)
            if (roi.width < 0) {
                roi.startX += roi.width;
                roi.width = Math.abs(roi.width);
            }
            if (roi.height < 0) {
                roi.startY += roi.height;
                roi.height = Math.abs(roi.height);
            }
            
            // 显示确认和重绘按钮
            document.getElementById('confirm-roi-focus-btn').style.display = 'block';
            document.getElementById('redraw-roi-focus-btn').style.display = 'block';
            document.getElementById('focus-roi-button-group').style.display = 'flex';
        }
        
        // 标记绘制完成
        this.cameraController.state.isDrawingRoi = false;
        
        // 移除绘制提示
        const container = document.getElementById('camera-display-container');
        container.classList.remove('drawing-roi-mode');
        container.style.cursor = 'default';
    }
    
    // 确认焦点ROI
    confirmFocusRoi() {
        if (!this.cameraController.state.focusRoi) return;
        
        // 更新UI状态
        document.getElementById('draw-roi-focus-btn').disabled = false;
        document.getElementById('confirm-roi-focus-btn').style.display = 'none';
        document.getElementById('redraw-roi-focus-btn').style.display = 'none';
        document.getElementById('clear-roi-focus-btn').style.display = 'block';
        document.getElementById('toggle-focus-roi-visibility-btn').style.display = 'block';
        
        // 显示成功通知
        this.utils.showNotification('success', 'ROI已确认', '对焦ROI区域已设置成功');
        
        // 保存状态
        this.cameraController.saveState();
    }
    
    // 清除焦点ROI
    clearFocusRoi() {
        // 清除ROI数据
        this.cameraController.state.focusRoi = null;
        
        // 更新UI
        document.getElementById('focus-roi-overlay').style.display = 'none';
        document.getElementById('draw-roi-focus-btn').disabled = false;
        document.getElementById('confirm-roi-focus-btn').style.display = 'none';
        document.getElementById('redraw-roi-focus-btn').style.display = 'none';
        document.getElementById('clear-roi-focus-btn').style.display = 'none';
        document.getElementById('toggle-focus-roi-visibility-btn').style.display = 'none';
        
        // 显示通知
        this.utils.showNotification('info', '已清除', '对焦ROI区域已清除');
        
        // 保存状态
        this.cameraController.saveState();
    }
    
    // 切换焦点ROI可见性
    toggleFocusRoiVisibility() {
        const overlay = document.getElementById('focus-roi-overlay');
        const button = document.getElementById('toggle-focus-roi-visibility-btn');
        
        if (overlay.style.opacity === '0' || overlay.style.opacity === '') {
            overlay.style.opacity = '1';
            button.title = '隐藏对焦ROI';
            button.innerHTML = '<i class="fas fa-eye"></i>';
        } else {
            overlay.style.opacity = '0';
            button.title = '显示对焦ROI';
            button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        }
    }
} 