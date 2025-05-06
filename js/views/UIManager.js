export class UIManager {
    constructor() {
        // --- DOM Element References ---
        this.connectBtn = document.getElementById('connect-btn');
        this.serialNumberSelect = document.getElementById('serial-number');
        this.footerStatus = document.getElementById('footer-status');
        this.configAxisBtn = document.getElementById('config-axis-btn');
        this.axisDropdown = document.getElementById('axis-config-dropdown');
        this.axisListUl = document.getElementById('axis-list');
        this.dropdownCameraSN = document.getElementById('dropdown-camera-sn');
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
        this.configFileInput = document.getElementById('config-file');
        this.savePathInput = document.getElementById('save-path');
        this.cameraNameInput = document.getElementById('camera-name');
        this.cameraModelInput = document.getElementById('camera-model');
        this.currentZInput = document.getElementById('current-z');
        this.clarityValueInput = document.getElementById('clarity-value');
        this.footerZPos = document.getElementById('footer-z-pos');

        // Query all controls within the panel for bulk enable/disable
        this.panelControls = document.querySelectorAll('#control-panel-content button, #control-panel-content select, #control-panel-content input');
        
        console.log("UIManager initialized and DOM elements cached.");
    }
    
    // --- Moved UI update methods ---

    applyBlur(clarity, maxBlur) {
        if (!this.simulatedImage) return;

        const normalizedClarity = Math.max(0, Math.min(1, clarity || 0));
        const blurPx = (1 - normalizedClarity) * maxBlur;
        this.simulatedImage.style.filter = `blur(${blurPx.toFixed(1)}px)`;
        // Also update the clarity display input if it exists
        if (this.clarityValueInput) {
            this.clarityValueInput.value = normalizedClarity.toFixed(3);
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
        if (this.dropdownCameraSN && this.serialNumberSelect) {
             this.dropdownCameraSN.textContent = `相机: ${this.serialNumberSelect.value}`;
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

    // --- Camera Select Dropdown Updates ---
    showCameraSelectLoading() {
        if (this.serialNumberSelect) {
            this.serialNumberSelect.innerHTML = '<option value="">加载中...</option>';
            this.serialNumberSelect.disabled = true;
        }
        // Also disable connect button while loading cameras
        if (this.connectBtn) {
            this.connectBtn.disabled = true;
        }
    }

    populateCameraDropdown(cameraList) {
        if (!this.serialNumberSelect) return;
        this.serialNumberSelect.innerHTML = ''; // Clear existing options

        if (cameraList && cameraList.length > 0) {
            this.serialNumberSelect.appendChild(new Option('请选择相机...', '')); // Add placeholder
            cameraList.forEach(sn => {
                this.serialNumberSelect.appendChild(new Option(sn, sn));
            });
        } else {
            this.serialNumberSelect.appendChild(new Option('未找到相机', ''));
        }
    }

    setCameraSelectReady(hasCameras) {
         if (this.serialNumberSelect) {
             this.serialNumberSelect.disabled = !hasCameras;
         }
         // Connect button state will be handled by updateControlStates in Controller
    }

    setCameraSelectError() {
        if (this.serialNumberSelect) {
            this.serialNumberSelect.innerHTML = '<option value="">加载失败</option>';
            this.serialNumberSelect.disabled = true;
        }
         if (this.connectBtn) {
             this.connectBtn.disabled = true;
         }
    }
    // -------------------------------------

    // More UI update methods will be moved here later...
} 