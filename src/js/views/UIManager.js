export class UIManager {
    constructor() {
        // --- DOM Element References ---
        this.footerStatus = document.getElementById('footer-status');
        this.configAxisBtn = document.getElementById('config-axis-btn');
        this.axisDropdown = document.getElementById('axis-config-dropdown');
        this.axisListUl = document.getElementById('axis-list');
        this.startFocusBtn = document.getElementById('start-focus-btn');
        this.stopFocusBtn = document.getElementById('stop-focus-btn');
        this.focusStatusText = document.getElementById('focus-status-text');
        this.simulatedImage = document.getElementById('simulated-image');
        this.btnPlay = document.getElementById('btn-play');
        this.btnStop = document.getElementById('btn-stop');
        this.btnCapture = document.getElementById('btn-capture');
        this.btnRecord = document.getElementById('btn-record');
        this.btnTrigger = document.getElementById('btn-trigger');
        this.selectConfigBtn = document.getElementById('select-config-btn');
        this.selectFolderBtn = document.getElementById('select-folder-btn');
        this.focusRoiOverlay = document.getElementById('focus-roi-overlay');
        this.drawRoiFocusBtn = document.getElementById('draw-roi-focus-btn');
        this.confirmFocusRoiBtn = document.getElementById('confirm-roi-focus-btn');
        this.redrawFocusRoiBtn = document.getElementById('redraw-roi-focus-btn');
        this.clearFocusRoiBtn = document.getElementById('clear-roi-focus-btn');
        this.toggleFocusRoiVisibilityBtn = document.getElementById('toggle-focus-roi-visibility-btn');
        this.focusRoiButtonGroup = document.getElementById('focus-roi-button-group');
        this.calibrateBtn = document.getElementById('calibrate-btn');
        this.toggleViewBtn = document.getElementById('toggle-view-btn');
        this.clearAxisBtn = document.getElementById('clear-axis-btn');
        this.statusBarImageDims = document.getElementById('image-dims');
        this.statusBarMouse = document.getElementById('mouse-coords');
        this.calibrationPatternDisplay = document.getElementById('calibration-pattern-display');
        this.calibRoiOverlay = document.getElementById('calibration-roi-overlay');
        this.calibSquareSizeInput = document.getElementById('calib-square-size');
        this.calibrationResultValue = document.getElementById('calibration-result-value');
        this.drawCalibRoiBtn = document.getElementById('draw-roi-calib-btn');
        this.confirmCalibRoiBtn = document.getElementById('confirm-roi-calib-btn');
        this.redrawCalibRoiBtn = document.getElementById('redraw-roi-calib-btn');
        this.toggleCalibRoiVisibilityBtn = document.getElementById('toggle-calib-roi-visibility-btn');
        this.calibRoiButtonGroup = document.getElementById('calib-roi-button-group');
        this.configFileDisplay = document.getElementById('config-file');
        this.savePathDisplay = document.getElementById('save-path');
        this.cameraNameInput = document.getElementById('camera-name');
        this.cameraModelInput = document.getElementById('camera-model');
        this.currentZInput = document.getElementById('current-z');
        this.clarityValueDisplay = document.getElementById('clarity-value');
        this.footerZPos = document.getElementById('footer-z-pos');
        this.wbRedSlider = document.getElementById('wb-red');
        this.wbGreenSlider = document.getElementById('wb-green');
        this.wbBlueSlider = document.getElementById('wb-blue');
        this.wbRedValueSpan = this.wbRedSlider?.nextElementSibling;
        this.wbGreenValueSpan = this.wbGreenSlider?.nextElementSibling;
        this.wbBlueValueSpan = this.wbBlueSlider?.nextElementSibling;

        // --- New element reference ---
        this.imageFormatSelect = document.getElementById('image-format-select');
        this.exposureInput = document.getElementById('exposure-time');
        this.gainInput = document.getElementById('gain');
        this.triggerModeSelect = document.getElementById('trigger-mode-select');
        this.enableCameraCheckbox = document.getElementById('enable-camera-cb');
        this.autoWhiteBalanceCheckbox = document.getElementById('white-balance-cb');
        this.manualWBControls = document.querySelectorAll('.manual-wb-control');

        // Cache other potentially needed elements
        this.currentZDisplay = document.getElementById('current-z');
        this.clarityValueDisplay = document.getElementById('clarity-value');

        // Collect all panel controls for easy enabling/disabling (can be refined)
        // Query only within the control panel to avoid selecting header buttons etc.
        const controlPanel = document.getElementById('control-panel-content');
        if (controlPanel) {
            this.panelControls = controlPanel.querySelectorAll(
                'input, select, button:not(#connect-btn)' // Select inputs, selects, and buttons inside the panel (excluding connect)
            );
        } else {
            this.panelControls = [];
            console.error("Control panel element not found!");
        }
        
        console.log("UIManager initialized and DOM elements cached.");

        this.addEventListeners();
    }
    
    addEventListeners() {
        // Add listeners to update WB value spans when sliders change
        if (this.wbRedSlider) {
            this.wbRedSlider.addEventListener('input', () => this.updateWBValues());
        }
        if (this.wbGreenSlider) {
            this.wbGreenSlider.addEventListener('input', () => this.updateWBValues());
        }
        if (this.wbBlueSlider) {
            this.wbBlueSlider.addEventListener('input', () => this.updateWBValues());
        }
        // Add listener for auto WB checkbox to toggle manual controls
        if (this.autoWhiteBalanceCheckbox) {
            this.autoWhiteBalanceCheckbox.addEventListener('change', (event) => {
                this.toggleManualWBControls(!event.target.checked);
            });
        }
    }

    /**
     * Updates the text content of the white balance value spans based on the current slider values.
     */
    updateWBValues() {
        if (this.wbRedValueSpan && this.wbRedSlider) {
            this.wbRedValueSpan.textContent = `(${this.wbRedSlider.value})`;
        }
        if (this.wbGreenValueSpan && this.wbGreenSlider) {
            this.wbGreenValueSpan.textContent = `(${this.wbGreenSlider.value})`;
        }
        if (this.wbBlueValueSpan && this.wbBlueSlider) {
            this.wbBlueValueSpan.textContent = `(${this.wbBlueSlider.value})`;
        }
    }

    /**
     * Shows or hides the manual white balance control elements.
     * @param {boolean} show - True to show, false to hide.
     */
    toggleManualWBControls(show) {
        this.manualWBControls.forEach(control => {
            control.style.display = show ? 'flex' : 'none'; // Assuming 'flex' is the default display
        });
    }

    // --- Moved UI update methods ---

    applyBlur(clarity, maxBlur) {
        if (!this.simulatedImage) return;

        const normalizedClarity = Math.max(0, Math.min(1, clarity || 0));
        const blurPx = (1 - normalizedClarity) * maxBlur;
        this.simulatedImage.style.filter = `blur(${blurPx.toFixed(1)}px)`;
        // Also update the clarity display input if it exists
        if (this.clarityValueDisplay) {
            this.clarityValueDisplay.value = normalizedClarity.toFixed(3);
        }
    }

    updateFocusStatus(status) {
         if (!this.focusStatusText) return;

         // Define valid status strings
         const validStatuses = ['未连接', '初始化检查', '请求Z轴控制权', '粗对焦中', '精细对焦中', '移动到最佳位置', '保存参数中', '已对焦', '错误', '已停止', '空闲'];
         const finalStatus = validStatuses.includes(status) ? status : '未知';

         this.focusStatusText.textContent = finalStatus;

         // Update CSS class for styling based on status
         this.focusStatusText.className = 'status-text'; // Reset to base class
         switch(finalStatus) {
             case '已对焦':
                  this.focusStatusText.classList.add('status-已对焦');
                  break;
             case '错误':
             case '已停止':
                  this.focusStatusText.classList.add('status-错误');
                  break;
             case '未连接':
                   this.focusStatusText.classList.add('status-未连接');
                   break;
               case '空闲':
                   this.focusStatusText.classList.add('status-空闲');
                   break;
              default: // For intermediate focusing steps
                  this.focusStatusText.classList.add('status-对焦中');
                  break;
         }
     }

    updateConfigAxisButtonDisplay(axisId) {
        if (this.configAxisBtn) {
            if (axisId) {
                this.configAxisBtn.textContent = `轴: ${axisId}`;
                this.configAxisBtn.title = `当前选择的Z轴: ${axisId} - 点击修改`;
            } else {
                this.configAxisBtn.textContent = '配置轴';
                this.configAxisBtn.title = '配置相机Z轴';
            }
        } else {
            console.warn("无法找到 configAxisBtn 元素进行更新。");
        }
    }

    showAxisDropdownVisuals() {
        if (this.axisDropdown) {
            this.axisDropdown.classList.add('show');
        }
         if (this.axisListUl) {
             this.axisListUl.innerHTML = '<li class="axis-list-loading">加载中...</li>';
         }
    }

    hideAxisDropdownVisuals() {
        if (this.axisDropdown) {
            this.axisDropdown.classList.remove('show');
        }
    }

    populateAxisDropdown(availableAxes) {
         if (!this.axisListUl) return;
         this.axisListUl.innerHTML = ''; // Clear loading/previous content

         if (availableAxes && availableAxes.length > 0) {
             availableAxes.forEach(axis => {
                 const li = document.createElement('li');
                 li.textContent = `${axis.name} (${axis.id})`;
                 li.dataset.axisId = axis.id;
                 // The controller will add the actual event listener later
                 this.axisListUl.appendChild(li);
             });
         } else {
             this.axisListUl.innerHTML = '<li class="axis-list-empty">未找到可用轴</li>';
         }
    }
    
    setAxisDropdownError() {
         if (this.axisListUl) {
             this.axisListUl.innerHTML = '<li class="axis-list-error">加载轴列表失败</li>';
         }
    }

    /**
     * Updates the footer status bar based on the provided state object.
     * @param {object} state - The current state object containing status, fps, z_pos, etc.
     */
    updateFooterStatus(state) {
        if (!state) return;
        const isConnected = state.camera_info?.status === 'connected';

        if (this.footerStatus) {
            let statusText = '状态: 未连接';
            if (isConnected) {
                if (state.is_recording) statusText = '状态: 录制中...';
                else if (state.is_streaming) statusText = '状态: 采集中...';
                else if (state.focus?.status && state.focus.status !== '空闲' && state.focus.status !== '已对焦' && state.focus.status !== '错误') statusText = `状态: ${state.focus.status}...`;
                else statusText = '状态: 已连接 (空闲)';
            } else if (state.isConnecting) { // Hypothetical state for connecting process
                 statusText = '状态: 连接中...';
            }
            this.footerStatus.textContent = statusText;
        }

        // Assuming fps element exists
        const fpsElement = this.footerStatus?.parentElement?.querySelector('span:nth-child(2)'); 
        if (fpsElement) {
            fpsElement.textContent = `帧率: ${state.fps ?? '--'} FPS`; // Use state.fps if available
        }

        if (this.footerZPos) {
            const zPos = state.z_axis?.position;
            this.footerZPos.textContent = (typeof zPos === 'number') ? zPos.toFixed(3) : '--';
        }

        // Update image dimensions (redundant? UIManager might handle this elsewhere)
        if (this.statusBarImageDims) {
            // You might need a way to get current image dimensions if not directly in state
            // Example: if (this.simulatedImage) {
            // this.statusBarImageDims.textContent = `${this.simulatedImage.naturalWidth || '---'}, ${this.simulatedImage.naturalHeight || '---'}`; }
             this.statusBarImageDims.textContent = `${state.image_width || '---'}, ${state.image_height || '---'}`; // Assuming state contains dims
        }

        // Zoom level (assuming a state property exists or is fixed)
        const zoomElement = this.footerStatus?.parentElement?.querySelector('span:nth-child(6)');
        if(zoomElement) {
             zoomElement.textContent = `缩放: ${state.zoom_level || '100%'}`; // Use state.zoom_level if available
        }
    }

    // More UI update methods will be moved here later...
} 