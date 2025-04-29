class CameraController {
    constructor() {
        // Get references to elements
        this.simulatedImage = document.getElementById('simulated-image');
        this.currentZInput = document.getElementById('current-z');
        this.clarityValueInput = document.getElementById('clarity-value');
        this.startFocusBtn = document.getElementById('start-focus-btn');
        this.stopFocusBtn = document.getElementById('stop-focus-btn');
        this.focusStatusText = document.getElementById('focus-status-text');
        this.footerZPos = document.getElementById('footer-z-pos');
        this.footerStatus = document.getElementById('footer-status');
        this.statusBarStatus = document.querySelector('.status-bar span:first-child');
        this.statusBarFps = document.querySelector('.status-bar span:nth-child(2)');
        this.statusBarMouse = document.getElementById('mouse-coords');
        this.statusBarImageDims = document.getElementById('image-dims');
        // References for data population
        this.serialNumberSelect = document.getElementById('serial-number');
        this.configFileInput = document.getElementById('config-file');
        this.savePathInput = document.getElementById('save-path');
        this.cameraNameInput = document.getElementById('camera-name');
        this.cameraModelInput = document.getElementById('camera-model');

        // --- Control References ---
        this.connectBtn = document.getElementById('connect-btn');
        this.configAxisBtn = document.getElementById('config-axis-btn');
        this.clearAxisBtn = document.getElementById('clear-axis-btn');
        this.headerButtons = document.querySelectorAll('.header-controls .header-button:not(#btn-settings)'); // Exclude settings button
        this.panelControls = document.querySelectorAll('.requires-connection input, .requires-connection select, .requires-connection button, .requires-connection table input, .requires-connection table select');
        this.calibrateBtn = document.getElementById('calibrate-btn');
        // Header Buttons
        this.btnPlay = document.getElementById('btn-play');
        this.btnStop = document.getElementById('btn-stop');
        this.btnCapture = document.getElementById('btn-capture');
        this.btnRecord = document.getElementById('btn-record');
        this.btnTrigger = document.getElementById('btn-trigger');
        this.selectConfigBtn = document.getElementById('select-config-btn');
        this.selectFolderBtn = document.getElementById('select-folder-btn');

        // --- Focus ROI Elements ---
        this.focusRoiOverlay = document.getElementById('focus-roi-overlay');
        this.confirmFocusRoiBtn = document.getElementById('confirm-roi-focus-btn');
        this.redrawFocusRoiBtn = document.getElementById('redraw-roi-focus-btn');
        this.drawRoiFocusBtn = document.getElementById('draw-roi-focus-btn');
        this.toggleFocusRoiVisibilityBtn = document.getElementById('toggle-focus-roi-visibility-btn');
        this.clearFocusRoiBtn = document.getElementById('clear-roi-focus-btn'); // Added Clear Button reference
        this.focusRoiButtonGroup = document.getElementById('focus-roi-button-group'); // Added reference to the button group (assuming you add this ID)

        // --- Calibration ROI Elements ---
        this.drawCalibRoiBtn = document.getElementById('draw-roi-calib-btn'); // Renamed from enableCalibRoiBtn
        this.calibRoiOverlay = document.getElementById('calibration-roi-overlay');
        this.confirmCalibRoiBtn = document.getElementById('confirm-roi-calib-btn');
        this.redrawCalibRoiBtn = document.getElementById('redraw-roi-calib-btn');
        this.toggleCalibRoiVisibilityBtn = document.getElementById('toggle-calib-roi-visibility-btn');
        this.calibRoiButtonGroup = document.getElementById('calib-roi-button-group'); // Added direct reference

        // Calibration elements
        this.calibrationPatternDisplay = document.getElementById('calibration-pattern-display');
        this.calibrationResultValue = document.getElementById('calibration-result-value');
        this.cameraDisplayContainer = document.getElementById('camera-display-container');
        this.toggleViewBtn = document.getElementById('toggle-view-btn');
        this.calibSquareSizeInput = document.getElementById('calib-square-size');

        // Dropdown elements
        this.axisDropdown = document.getElementById('axis-config-dropdown');
        this.axisListUl = document.getElementById('axis-list');
        this.dropdownCameraSN = document.getElementById('dropdown-camera-sn');

        // --- Simulation Parameters ---
        this.Z_RANGE = { min: 5, max: 25 }; // mm
        this.Z_STEP_ROUGH = 1.0; // mm
        this.Z_STEP_FINE = 0.1; // mm
        this.SCAN_DELAY_ROUGH = 100; // ms
        this.SCAN_DELAY_FINE = 80; // ms
        this.CONTROL_REQUEST_DELAY = 150; // ms
        this.INIT_DELAY = 80; // ms
        this.SAVE_DELAY = 100; // ms
        this.CONNECT_DELAY = 500; // ms
        this.MAX_BLUR = 5; // px
        this.CALIBRATION_DELAY = 1500; // ms total for simulated calibration steps
        this.SIMULATED_SQUARE_SIZE_PX = 37.5; // Simulated pixel size of square at best focus
        this.CHECKERBOARD_SVG = `<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="checkerboard" width="75" height="75" patternUnits="userSpaceOnUse"><rect width="37.5" height="37.5" fill="black"/><rect x="37.5" y="37.5" width="37.5" height="37.5" fill="black"/></pattern></defs><rect width="300" height="300" fill="white"/><rect width="300" height="300" fill="url(#checkerboard)"/><style>rect { stroke: grey; stroke-width: 0.5; }</style></svg>`;
        this.QUADRANT_BEST_Z = { TL: 15.0, TR: 16.5, BL: 14.0, BR: 15.8 };

        // --- State Variables ---
        this.selectedAxisId = null;
        this.currentZ = 10.0;
        this.isFocusing = false;
        this.focusProcessId = null;
        this.currentClarity = 0;
        this.bestZFound = null;
        this.isConnected = false;
        this.connectionProcessId = null;
        this.isCapturing = false;
        this.isRecording = false;
        this.isAxisDropdownVisible = false;
        this.isCalibrating = false;
        this.calibrationRatio = null;
        this.isShowingCalibrationPattern = false;

        // --- Focus ROI State ---
        // Possible states: 'idle', 'drawing', 'drawn', 'confirmed'
        this.focusRoiState = 'idle'; // Initial state
        this.isDrawingRoi = false; // Internal flag for mouse down/up tracking during 'drawing' state
        this.roiStartX = 0;
        this.roiStartY = 0;
        this.currentRoiX = 0;
        this.currentRoiY = 0;
        this.finalRoiRect = null; // Focus ROI final rect (after confirmation)
        this.pendingRoiRect = null; // Focus ROI pending rect (after drawing, before confirmation)
        this.isFocusRoiVisible = true; // Default visibility for existing ROI

        // --- Calibration ROI State ---
        this.isDrawingCalibRoi = false;      // Is mouse currently down for drawing Calib ROI
        this.isInCalibRoiDrawMode = false;   // Has user clicked "Enable Calib ROI" button
        this.calibRoiStartX = 0;
        this.calibRoiStartY = 0;
        this.currentCalibRoiX = 0;
        this.currentCalibRoiY = 0;
        this.finalCalibRoiRect = null;     // The confirmed calibration ROI
        this.pendingCalibRoiRect = null;    // The drawn calibration ROI waiting for confirmation

        // --- ROI Visibility State ---
        this.isCalibRoiVisible = true; // Default to visible when exists

        this.backendUrl = 'http://localhost:5000';

        this.initializeEventListeners();
        this.initUI();
    }

    // --- Utility Functions ---
    calculateClarity(z) {
        let effectiveBestZ = this.getEffectiveBestZ(); // Get best Z based on ROI or center
        const diff = z - effectiveBestZ;
        const focusSharpness = 1.5; // Make focus sharper for better distinction
        let clarity = Math.exp(-(diff * diff) / (2 * focusSharpness * focusSharpness));

        // Add slight noise to make it less perfect
        clarity = Math.max(0, Math.min(1, clarity - (Math.random() * 0.05)));

        return clarity;
    }

    applyBlur(clarity) {
        const blurValue = (1 - clarity) * this.MAX_BLUR;
        this.simulatedImage.style.filter = `blur(${blurValue.toFixed(2)}px)`;
    }

    updateUI() {
        this.currentZInput.value = this.isConnected ? this.currentZ.toFixed(2) : '--';
        this.footerZPos.textContent = this.isConnected ? this.currentZ.toFixed(2) : '--';
        if (this.isConnected) {
            this.currentClarity = this.calculateClarity(this.currentZ);
            this.clarityValueInput.value = this.currentClarity.toFixed(3);
            this.applyBlur(this.currentClarity);
        } else {
            this.clarityValueInput.value = '--';
            this.simulatedImage.style.filter = 'none'; // Remove blur when disconnected
        }
    }

    // Central function to update status text and button states
    updateFocusStatus(status) {
        this.focusStatusText.textContent = status;
        this.isFocusing = ![ '空闲', '已对焦', '已停止', '错误', '未连接' ].includes(status);

        // Update button states based on connection AND focus state
        this.updateControlStates(this.isConnected);

        const className = `status-${status.replace(/[ /]/g, '-')}`;
        this.focusStatusText.className = className;
    }

    // Simulates waiting for a duration, interruptible by stopAutofocus
    async wait(duration, processIdRef = 'focusProcessId') {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                // Check if the *specific* process ID for this wait is still active
                if (this[processIdRef] === timeoutId) {
                    this[processIdRef] = null; // Clear the ID once done
                    resolve();
                } else {
                    // Another process (likely stop) cleared the ID, meaning it was interrupted
                     reject(new Error(`Stopped during wait`));
                }
            }, duration);
            // Store the timeout ID for potential cancellation
            this[processIdRef] = timeoutId;
        });
    }

    // --- Simulation Logic ---
    async simulateZMovement(target) {
        // In this simulation, Z movement is instant for simplicity during scans
        this.currentZ = target;
        this.updateUI();
        // In a real scenario, this would involve communication and waiting
        return true; // Assume movement finishes instantly
    }

    // --- Connection and Initialization --- 
    async connectCamera() {
        if (this.isConnected || this.connectionProcessId) return; 
        console.log("开始连接相机 (请求后端)..." );
        this.connectBtn.textContent = "连接中...";
        this.connectBtn.disabled = true;
        this.footerStatus.textContent = "状态: 连接中...";
        this.connectionProcessId = true;

        try {
            const connectResponse = await fetch(`${this.backendUrl}/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (!connectResponse.ok) {
                let errorMsg = `连接请求失败，状态码: ${connectResponse.status}`;
                try {
                    const errorData = await connectResponse.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (parseError) { }
                throw new Error(errorMsg);
            }
            
            const backendState = await connectResponse.json(); 
            console.log("后端连接成功，状态:", backendState);

            this.isConnected = backendState.isConnected;
            this.selectedAxisId = backendState.selectedAxisId;

            this.updateUIFromState(backendState);
            this.updateControlStates(true); 
            this.updateFocusStatus(backendState.focusStatus || '空闲'); 

            this.footerStatus.textContent = "状态: 已连接";
            this.connectBtn.textContent = "断开连接";

        } catch(error) {
             console.error("连接相机时出错:", error);
             this.footerStatus.textContent = `状态: 连接失败 (${error.message})`;
             this.isConnected = false;
             this.updateControlStates(false);
             this.serialNumberSelect.disabled = false;
        } finally {
             this.connectBtn.disabled = this.isFocusing || this.isCapturing || this.isRecording;
             this.connectionProcessId = null;
        }

        if (this.isConnected) {
            this.loadState();
        }
    }

    async disconnectCamera() {
        if (!this.isConnected || this.connectionProcessId) return;
        console.log("断开相机连接 (请求后端)...");
        this.connectBtn.textContent = "断开中..."; 
        this.connectBtn.disabled = true;
        this.connectionProcessId = true;

        try {
            const response = await fetch(`${this.backendUrl}/disconnect`, {
                method: 'POST'
            });

            if (!response.ok) {
                let errorMsg = `断开连接请求失败，状态码: ${response.status}`;
                try {
                     const errorData = await response.json();
                     errorMsg = errorData.message || errorMsg;
                } catch (parseError) { }
                throw new Error(errorMsg);
            }

            const backendState = await response.json();
            console.log("后端确认断开连接，状态:", backendState);

            this.stopAutofocus(); 
            this.stopCapture();   

            this.updateUIFromState(backendState);
            this.updateControlStates(false);
            this.updateFocusStatus('未连接');
            if (this.focusRoiOverlay) this.focusRoiOverlay.style.display = 'none'; 
            if (this.enableCalibRoiBtn) this.enableCalibRoiBtn.textContent = "启用对焦ROI";
            this.hideAxisDropdown(); 
            console.log("前端状态已更新为断开");
            this.fetchAvailableCameras();

            this.pendingCalibRoiRect = null;
            this.finalCalibRoiRect = null;
            this.isInCalibRoiDrawMode = false;
            this.isDrawingCalibRoi = false;
            if (this.calibRoiOverlay) this.calibRoiOverlay.style.display = 'none';
            if (this.calibrationPatternDisplay) this.calibrationPatternDisplay.style.cursor = 'default';

        } catch (error) {
            console.error("断开相机时出错:", error);
            alert(`断开连接时出错: ${error.message}`);
            if (this.isConnected) {
                 this.connectBtn.textContent = "断开连接";
            } else {
                 this.connectBtn.textContent = "连接";
            }
        } finally {
             this.connectBtn.disabled = this.isFocusing || this.isCapturing || this.isRecording;
             this.connectionProcessId = null;
        }
        this.saveState();
    }

    // Enables/disables controls based on connection status AND other states
    updateControlStates(connected) {
        const isIdle = connected && !this.isFocusing && !this.isCapturing && !this.isRecording;
        const canStartActivity = isIdle;

        const hasSelectedCamera = this.serialNumberSelect && this.serialNumberSelect.value !== '';
        const canConnect = !this.isConnected && hasSelectedCamera && !this.connectionProcessId;
        if(this.connectBtn) this.connectBtn.disabled = !(canConnect || this.isConnected) || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;
        if(this.connectBtn) this.connectBtn.textContent = this.isConnected ? "断开" : "连接";

        if(this.serialNumberSelect) this.serialNumberSelect.disabled = this.isConnected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;

        const isIdleAndConnected = this.isConnected && !this.isFocusing && !this.isCapturing && !this.isRecording && !this.isCalibrating;
        if(this.btnPlay) this.btnPlay.disabled = !canStartActivity || this.isCapturing || this.isRecording || this.isCalibrating;
        if(this.btnStop) this.btnStop.disabled = !(this.isCapturing || this.isRecording);
        if(this.btnCapture) this.btnCapture.disabled = !canStartActivity || this.isCapturing || this.isRecording || this.isCalibrating;
        if(this.btnRecord) this.btnRecord.disabled = !canStartActivity || this.isCapturing || this.isRecording || this.isCalibrating;
        if(this.btnTrigger) this.btnTrigger.disabled = !canStartActivity || this.isCapturing || this.isRecording || this.isCalibrating;

        this.panelControls.forEach(ctrl => {
             const excludedIds = ['connect-btn', 'start-focus-btn', 'stop-focus-btn', 'calibrate-btn', 'toggle-view-btn', 'confirm-roi-focus-btn', 'redraw-roi-focus-btn', 'calib-square-size'];
             if (!excludedIds.includes(ctrl.id) && !ctrl.classList.contains('header-button')) {
                  ctrl.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;
             }
        });

        if(this.selectConfigBtn) this.selectConfigBtn.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;
        if(this.selectFolderBtn) this.selectFolderBtn.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;

        this.startFocusBtn.disabled = !isIdle || !this.selectedAxisId || this.isCalibrating;
        this.stopFocusBtn.disabled = !this.isFocusing;

        const focusComplete = connected && this.focusStatusText.textContent === '已对焦';
        this.calibrateBtn.disabled = !focusComplete || !this.selectedAxisId || this.isCapturing || this.isRecording || this.isCalibrating || this.isFocusing;

        if(this.toggleViewBtn) this.toggleViewBtn.disabled = !connected || this.isCalibrating || this.isFocusing;

        if(this.calibSquareSizeInput) this.calibSquareSizeInput.disabled = !connected || this.isCalibrating || this.isFocusing;

        const isFocusRoiPending = connected && this.focusRoiState === 'drawn';
        const hasFocusRoiConfirmed = connected && this.focusRoiState === 'confirmed';
        const canDrawRoi = isIdle && this.focusRoiState === 'idle';

        if (this.drawRoiFocusBtn) {
            this.drawRoiFocusBtn.disabled = !canDrawRoi || this.isCalibrating;
        }

        const canInteractWithRoi = isIdle && !this.isCalibrating;

        if (this.confirmFocusRoiBtn) {
            this.confirmFocusRoiBtn.disabled = !isFocusRoiPending || !canInteractWithRoi;
        }
        if (this.redrawFocusRoiBtn) {
            const canRedraw = (isFocusRoiPending || hasFocusRoiConfirmed) && canInteractWithRoi;
            this.redrawFocusRoiBtn.disabled = !canRedraw;
        }
        if (this.clearFocusRoiBtn) {
            const canClear = (isFocusRoiPending || hasFocusRoiConfirmed) && canInteractWithRoi;
            this.clearFocusRoiBtn.disabled = !canClear;
        }
        if (this.toggleFocusRoiVisibilityBtn) {
            this.toggleFocusRoiVisibilityBtn.disabled = !hasFocusRoiConfirmed;
            const icon = this.toggleFocusRoiVisibilityBtn.querySelector('i');
            if(icon){
                if (this.isFocusRoiVisible) {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                    this.toggleFocusRoiVisibilityBtn.title = "隐藏对焦ROI";
                } else {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                    this.toggleFocusRoiVisibilityBtn.title = "显示对焦ROI";
                }
            }
        }

        const isCalibRoiPending = connected && this.pendingCalibRoiRect;
        const hasCalibRoiConfirmed = connected && this.finalCalibRoiRect;
        const canEnableCalibRoi = isIdle && this.isShowingCalibrationPattern && !this.isInCalibRoiDrawMode && !hasCalibRoiConfirmed && !isCalibRoiPending;

        if (this.drawCalibRoiBtn) {
            this.drawCalibRoiBtn.disabled = !canEnableCalibRoi;
            this.drawCalibRoiBtn.style.display = (this.isShowingCalibrationPattern && !isCalibRoiPending && !hasCalibRoiConfirmed) ? 'inline-block' : 'none';
            if(this.isInCalibRoiDrawMode) this.drawCalibRoiBtn.disabled = true;
        }

        const calibRoiGroup = this.confirmCalibRoiBtn?.closest('.roi-button-group');
         if (calibRoiGroup) {
             calibRoiGroup.style.display = (isCalibRoiPending || hasCalibRoiConfirmed) ? 'flex' : 'none';
             if (this.confirmCalibRoiBtn) {
                 this.confirmCalibRoiBtn.disabled = !isCalibRoiPending;
                 this.confirmCalibRoiBtn.style.display = isCalibRoiPending ? 'inline-block' : 'none';
             }
             if (this.redrawCalibRoiBtn) {
                  const canRedrawCalib = isIdle && this.isShowingCalibrationPattern && (isCalibRoiPending || hasCalibRoiConfirmed);
                  this.redrawCalibRoiBtn.disabled = !canRedrawCalib;
                 this.redrawCalibRoiBtn.style.display = (isCalibRoiPending || hasCalibRoiConfirmed) ? 'inline-block' : 'none';
             }
              if (this.toggleCalibRoiVisibilityBtn) {
                 this.toggleCalibRoiVisibilityBtn.disabled = !hasCalibRoiConfirmed;
                 this.toggleCalibRoiVisibilityBtn.style.display = hasCalibRoiConfirmed ? 'inline-block' : 'none';
                 this.toggleCalibRoiVisibilityBtn.innerHTML = this.isCalibRoiVisible ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
                 this.toggleCalibRoiVisibilityBtn.title = this.isCalibRoiVisible ? '隐藏校准ROI' : '显示校准ROI';
             }
         }

        document.querySelectorAll('#property-table input, #property-table select').forEach(ctrl => {
             ctrl.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;
         });

        if (this.configAxisBtn) this.configAxisBtn.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;

        if (this.clearAxisBtn) this.clearAxisBtn.disabled = !connected || !this.selectedAxisId || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;

        if (this.toggleCalibRoiVisibilityBtn) {
            this.toggleCalibRoiVisibilityBtn.disabled = !hasCalibRoiConfirmed;
            this.toggleCalibRoiVisibilityBtn.style.display = hasCalibRoiConfirmed ? 'inline-block' : 'none';
            this.toggleCalibRoiVisibilityBtn.innerHTML = this.isCalibRoiVisible ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            this.toggleCalibRoiVisibilityBtn.title = this.isCalibRoiVisible ? '隐藏校准ROI' : '显示校准ROI';
        }
    }

    // --- Event Listeners ---
    initializeEventListeners() {
        if (this.connectBtn) {
             this.connectBtn.addEventListener('click', () => {
                if (this.isConnected) {
                    this.disconnectCamera();
                } else {
                    this.connectCamera();
                }
            });
        }
        
        if (this.serialNumberSelect) {
             this.serialNumberSelect.addEventListener('change', () => {
                this.updateControlStates(this.isConnected);
            });
        }
        
        this.configAxisBtn?.addEventListener('click', (e) => {
             e.stopPropagation();
             this.fetchAndShowAxisDropdown()
         });
         
        this.startFocusBtn?.addEventListener('click', () => this.startAutofocus());
        this.stopFocusBtn?.addEventListener('click', () => this.stopAutofocus());

        this.btnPlay?.addEventListener('click', () => this.startCapture());
        this.btnStop?.addEventListener('click', () => this.stopCapture());
        this.btnCapture?.addEventListener('click', () => this.singleShot());
        this.btnRecord?.addEventListener('click', () => this.startRecording());
        this.btnTrigger?.addEventListener('click', () => this.softwareTrigger());
        document.getElementById('btn-settings')?.addEventListener('click', () => alert("模拟：打开设置面板（未实现）"));

        this.selectConfigBtn?.addEventListener('click', () => alert("模拟：打开文件选择器选择配置文件"));
        this.selectFolderBtn?.addEventListener('click', () => alert("模拟：打开文件夹选择器选择保存路径"));

        this.simulatedImage?.addEventListener('mousedown', this.handleRoiMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleRoiMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleRoiMouseUp.bind(this));

        this.drawRoiFocusBtn?.addEventListener('click', () => {
            console.log("点击绘制对焦 ROI 按钮");
            this.startFocusRoiDraw();
        });

        this.confirmFocusRoiBtn?.addEventListener('click', this.confirmFocusRoi.bind(this));
        this.redrawFocusRoiBtn?.addEventListener('click', () => {
             console.log("点击重绘对焦 ROI 按钮");
             this.startFocusRoiDraw(true);
        });
        this.clearFocusRoiBtn?.addEventListener('click', this.clearFocusRoi.bind(this));
        this.toggleFocusRoiVisibilityBtn?.addEventListener('click', this.toggleFocusRoiVisibility.bind(this));

        this.calibrateBtn?.addEventListener('click', () => {
            if (this.calibrateBtn.disabled) return;
            this.startCalibration();
        });
        this.toggleViewBtn?.addEventListener('click', () => {
            if (this.toggleViewBtn.disabled) return;
            this.toggleCalibrationView();
        });

        this.clearAxisBtn?.addEventListener('click', () => {
            if (this.clearAxisBtn.disabled) return;
            this.clearAxisConfig();
        });

        document.body.addEventListener('click', (e) => {
            if (this.isAxisDropdownVisible &&
                !this.axisDropdown.contains(e.target) &&
                e.target !== this.configAxisBtn) {
                this.hideAxisDropdown();
            }
        });

        this.simulatedImage?.addEventListener('mousemove', (e) => {
            const rect = this.simulatedImage.getBoundingClientRect();
            const scaleX = this.simulatedImage.naturalWidth / rect.width;
            const scaleY = this.simulatedImage.naturalHeight / rect.height;
            const x = Math.round((e.clientX - rect.left) * scaleX);
            const y = Math.round((e.clientY - rect.top) * scaleY);
            const clampedX = Math.max(0, Math.min(x, this.simulatedImage.naturalWidth));
            const clampedY = Math.max(0, Math.min(y, this.simulatedImage.naturalHeight));
            if(this.statusBarMouse) this.statusBarMouse.textContent = `${clampedX}, ${clampedY}`;
        });
        this.simulatedImage?.addEventListener('mouseleave', () => {
             if(this.statusBarMouse) this.statusBarMouse.textContent = `---, ---`;
        });

        this.drawCalibRoiBtn?.addEventListener('click', () => this.enableCalibRoi());
        this.confirmCalibRoiBtn?.addEventListener('click', () => this.confirmCalibRoi());
        this.redrawCalibRoiBtn?.addEventListener('click', () => this.redrawCalibRoi());

        this.toggleCalibRoiVisibilityBtn?.addEventListener('click', () => {
            if(this.toggleCalibRoiVisibilityBtn.disabled) return;
            this.isCalibRoiVisible = !this.isCalibRoiVisible;
             console.log(`校准 ROI 可见性切换为: ${this.isCalibRoiVisible}`);
            this.updateCalibRoiControlsUI();
        });
    }

    getEffectiveBestZ() {
        let refX, refY;
        if (this.finalRoiRect) {
            refX = this.finalRoiRect.x + this.finalRoiRect.width / 2;
            refY = this.finalRoiRect.y + this.finalRoiRect.height / 2;
        } else {
            refX = this.simulatedImage.naturalWidth / 2;
            refY = this.simulatedImage.naturalHeight / 2;
        }
        const quadrant = this.getCoordinateQuadrant(refX, refY);
        return this.QUADRANT_BEST_Z[quadrant] || 15.0;
    }

    handleRoiMouseDown(event) {
        if (this.focusRoiState !== 'drawing' || this.isShowingCalibrationPattern) return;

        const imageRect = this.simulatedImage?.getBoundingClientRect();
        if (!imageRect || event.clientX < imageRect.left || event.clientX > imageRect.right || event.clientY < imageRect.top || event.clientY > imageRect.bottom) {
            return;
        }
        event.preventDefault();

        this.isDrawingRoi = true;
        const coords = this.getImageCoordinates(event, this.simulatedImage);
        if (!coords) {
            this.isDrawingRoi = false;
            return;
        }
        this.roiStartX = coords.x;
        this.roiStartY = coords.y;
        this.pendingRoiRect = { x: this.roiStartX, y: this.roiStartY, width: 0, height: 0 };
        this.updateRoiOverlay();
        console.log("Focus ROI Mouse Down - Start Drawing");
    }

    handleRoiMouseMove(event) {
        if (!this.isDrawingRoi || this.focusRoiState !== 'drawing' || this.isShowingCalibrationPattern) return;

        const coords = this.getImageCoordinates(event, this.simulatedImage);
        if (!coords) return;
        this.currentRoiX = coords.x;
        this.currentRoiY = coords.y;

        const x = Math.min(this.roiStartX, this.currentRoiX);
        const y = Math.min(this.roiStartY, this.currentRoiY);
        const width = Math.abs(this.currentRoiX - this.roiStartX);
        const height = Math.abs(this.currentRoiY - this.roiStartY);

        this.pendingRoiRect = { x, y, width, height };
        this.updateRoiOverlay();
    }

    handleRoiMouseUp(event) {
        if (!this.isDrawingRoi || this.focusRoiState !== 'drawing' || this.isShowingCalibrationPattern) return;

        this.isDrawingRoi = false;

        if (this.pendingRoiRect && (this.pendingRoiRect.width < 5 || this.pendingRoiRect.height < 5)) {
            console.log("Focus ROI too small, canceling draw.");
            this.focusRoiState = 'idle';
            this.pendingRoiRect = null;
        } else if (this.pendingRoiRect) {
            this.focusRoiState = 'drawn';
            console.log("Focus ROI 绘制完成，等待确认:", this.pendingRoiRect);
        } else {
            console.log("Focus ROI mouse up without drawing.");
            this.focusRoiState = 'idle';
            this.pendingRoiRect = null;
        }

        if (this.simulatedImage) {
            this.simulatedImage.style.cursor = 'default';
        }
        this.updateRoiControlsUI();
        this.updateRoiOverlay();
        console.log("Focus ROI Mouse Up");
    }

    // --- Initial Setup ---
    initUI() {
        this.updateUI();
        this.updateFocusStatus('未连接');
        this.updateControlStates(false);
        this.fetchAvailableCameras();

        if (this.simulatedImage) {
            this.simulatedImage.onload = () => {
                if(this.statusBarImageDims) this.statusBarImageDims.textContent = `${this.simulatedImage.naturalWidth}, ${this.simulatedImage.naturalHeight}`;
                this.updateRoiOverlay();
                this.updateCalibRoiOverlay();
            };
            if (this.simulatedImage.complete && this.simulatedImage.naturalWidth > 0) {
                 if(this.statusBarImageDims) this.statusBarImageDims.textContent = `${this.simulatedImage.naturalWidth}, ${this.simulatedImage.naturalHeight}`;
            }
        }

        this.updateRoiOverlay();
        this.updateCalibRoiOverlay();
        this.updateRoiControlsUI();
        this.updateCalibRoiControlsUI();
        this.loadState();
        this.updateRoiOverlay();
        this.updateCalibRoiOverlay();
    }

    getImageCoordinates(event, targetElement) {
        if (!targetElement) {
            console.error("getImageCoordinates: targetElement is missing!");
            return { x: 0, y: 0 };
        }

        const rect = targetElement.getBoundingClientRect();

        const isSvgElement = targetElement.tagName?.toLowerCase() === 'svg' || targetElement === this.calibrationPatternDisplay;
        const naturalWidth = isSvgElement ? rect.width : targetElement.naturalWidth;
        const naturalHeight = isSvgElement ? rect.height : targetElement.naturalHeight;

        if (rect.width === 0 || rect.height === 0 || naturalWidth === 0 || naturalHeight === 0) {
            console.warn("getImageCoordinates: Invalid dimensions for target element or rect.", { rect, naturalWidth, naturalHeight });
            return null;
        }

        const scaleX = naturalWidth / rect.width;
        const scaleY = naturalHeight / rect.height;

        let clientX = event.clientX;
        let clientY = event.clientY;
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        }
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        const clampedX = Math.max(0, Math.min(x, naturalWidth));
        const clampedY = Math.max(0, Math.min(y, naturalHeight));

        return { x: clampedX, y: clampedY };
    }

    updateRoiOverlay() {
        if (!this.focusRoiOverlay || !this.simulatedImage || !this.simulatedImage.parentElement || this.isShowingCalibrationPattern) {
             if(this.focusRoiOverlay) this.focusRoiOverlay.style.display = 'none';
             return;
        }

        let rectToDraw = null;
        let isVisible = false;

        if (this.focusRoiState === 'confirmed' && this.finalRoiRect && this.isFocusRoiVisible) {
            rectToDraw = this.finalRoiRect;
            isVisible = true;
        } else if (this.focusRoiState === 'drawn' && this.pendingRoiRect) {
             rectToDraw = this.pendingRoiRect;
             isVisible = true;
         } else if (this.focusRoiState === 'drawing' && this.pendingRoiRect && this.isDrawingRoi) {
              rectToDraw = this.pendingRoiRect;
              isVisible = true;
         }

        if (rectToDraw && isVisible) {
            const overlay = this.focusRoiOverlay;
            const image = this.simulatedImage;
            const imageRect = image.getBoundingClientRect();
            const container = image.parentElement;
            const containerRect = container.getBoundingClientRect();
            const naturalWidth = image.naturalWidth;
            const naturalHeight = image.naturalHeight;

            if (imageRect.width > 0 && imageRect.height > 0 && naturalWidth > 0 && naturalHeight > 0) {
                const scaleX = imageRect.width / naturalWidth;
                const scaleY = imageRect.height / naturalHeight;

                const displayX = (imageRect.left - containerRect.left) + (rectToDraw.x * scaleX);
                const displayY = (imageRect.top - containerRect.top) + (rectToDraw.y * scaleY);
                const displayW = rectToDraw.width * scaleX;
                const displayH = rectToDraw.height * scaleY;

                overlay.style.left = `${displayX}px`;
                overlay.style.top = `${displayY}px`;
                overlay.style.width = `${displayW}px`;
                overlay.style.height = `${displayH}px`;
                overlay.style.opacity = '1';
                overlay.style.display = 'block';
            } else {
                overlay.style.display = 'none';
            }
        } else {
            this.focusRoiOverlay.style.display = 'none';
            this.focusRoiOverlay.style.opacity = '0';
        }
    }

    updateCalibRoiOverlay() {
        if (!this.calibRoiOverlay || !this.calibrationPatternDisplay || !this.calibrationPatternDisplay.parentElement) {
             if(this.calibRoiOverlay) this.calibRoiOverlay.style.display = 'none';
             return;
        }

        if (!this.isShowingCalibrationPattern) {
              this.calibRoiOverlay.style.display = 'none';
              return;
         }

        let rectToDraw = null;
        let isVisible = false;

        if (this.finalCalibRoiRect && this.isCalibRoiVisible) {
             rectToDraw = this.finalCalibRoiRect;
             isVisible = true;
        } else if (this.pendingCalibRoiRect) {
             rectToDraw = this.pendingCalibRoiRect;
             isVisible = true;
        }

        if (rectToDraw && isVisible) {
             const overlay = this.calibRoiOverlay;
             const patternDisplay = this.calibrationPatternDisplay;
             const patternRect = patternDisplay.getBoundingClientRect();
             const container = patternDisplay.parentElement;
             const containerRect = container.getBoundingClientRect();

             const naturalWidth = patternRect.width;
             const naturalHeight = patternRect.height;

             if (patternRect.width > 0 && patternRect.height > 0) {
                 const scaleX = 1;
                 const scaleY = 1;

                 const displayX = (patternRect.left - containerRect.left) + (rectToDraw.x * scaleX);
                 const displayY = (patternRect.top - containerRect.top) + (rectToDraw.y * scaleY);
                 const displayW = rectToDraw.width * scaleX;
                 const displayH = rectToDraw.height * scaleY;

                 overlay.style.left = `${displayX}px`;
                 overlay.style.top = `${displayY}px`;
                 overlay.style.width = `${displayW}px`;
                 overlay.style.height = `${displayH}px`;
                 overlay.style.opacity = '1';
                 overlay.style.display = 'block';

             } else {
                 overlay.style.display = 'none';
             }
         } else {
             this.calibRoiOverlay.style.display = 'none';
             this.calibRoiOverlay.style.opacity = '0';
         }
     }

    // --- New Calibration Simulation Logic ---
    async startCalibration() {
        if (this.isCalibrating || this.isFocusing || this.isCapturing || this.isRecording || !this.isConnected || this.focusStatusText.textContent !== '已对焦') {
            console.warn('无法开始当量计算：状态不满足 (需要连接、已对焦、空闲)');
            return;
        }

        console.log("--------- 开始当量计算流程 --------- ");
        this.isCalibrating = true;
        this.footerStatus.textContent = "状态: 当量计算中...";
        this.updateControlStates(true);
        this.calibrationResultValue.textContent = "计算中...";
        if (!this.isShowingCalibrationPattern) {
            this.switchToPatternView();
        }


        try {
            console.log("模拟: (已显示标准棋盘格图像)");
            await this.wait(this.CALIBRATION_DELAY / 3, 'calibrationProcessId');

            console.log("模拟: 捕获图像并分析棋盘格特征...");
            await this.wait(this.CALIBRATION_DELAY / 3, 'calibrationProcessId');
            console.log(`模拟: 检测到特征间距为 ${this.SIMULATED_SQUARE_SIZE_PX} 像素`);

            const knownSquareSizeMm = parseFloat(this.calibSquareSizeInput.value);
            if (isNaN(knownSquareSizeMm) || knownSquareSizeMm <= 0) {
                console.error("输入的方格尺寸无效:", this.calibSquareSizeInput.value);
                throw new Error("输入的方格尺寸无效");
            }

            this.calibrationRatio = this.SIMULATED_SQUARE_SIZE_PX / knownSquareSizeMm;
            console.log(`计算当量: ${this.SIMULATED_SQUARE_SIZE_PX} px / ${knownSquareSizeMm} mm = ${this.calibrationRatio.toFixed(2)} pixels/mm`);
            this.calibrationResultValue.textContent = `${this.calibrationRatio.toFixed(2)} px/mm`;
            await this.wait(this.CALIBRATION_DELAY / 3, 'calibrationProcessId');

            console.log("--------- 当量计算流程完成 --------- ");

        } catch (error) {
            console.error("当量计算过程中出错:", error);
            this.calibrationResultValue.textContent = `计算失败`;
        } finally {
            console.log("模拟: 当量计算状态结束");
            this.isCalibrating = false;
            this.footerStatus.textContent = this.isConnected ? "状态: 已连接" : "状态: 未连接";
            this.updateControlStates(this.isConnected);
        }
        this.saveState();
    }
    // ----------------------------------------

    // --- View Toggling Logic ---
    toggleCalibrationView() {
        this.isShowingCalibrationPattern = !this.isShowingCalibrationPattern;
        if (this.isShowingCalibrationPattern) {
            this.switchToPatternView();
        } else {
            this.switchToCameraView();
        }
        this.updateRoiOverlay();
        this.updateCalibRoiOverlay();
    }

    switchToPatternView() {
        console.log("切换到标定板视图");
        this.simulatedImage.style.display = 'none';
        this.calibrationPatternDisplay.innerHTML = this.CHECKERBOARD_SVG;
        this.calibrationPatternDisplay.style.display = 'flex';
        this.toggleViewBtn.innerHTML = '<i class="fas fa-camera"></i> 显示相机视图';
        this.isShowingCalibrationPattern = true;
        if (this.focusRoiState === 'drawing') {
           this.cancelFocusRoiDraw();
        }
        this.updateRoiOverlay();
        this.updateCalibRoiOverlay();
        this.updateControlStates(this.isConnected);
        this.updateCalibRoiControlsUI();
    }

    switchToCameraView() {
        console.log("切换到相机视图");
        this.calibrationPatternDisplay.style.display = 'none';
        this.calibrationPatternDisplay.innerHTML = '';
        this.simulatedImage.style.display = 'block';
        this.toggleViewBtn.innerHTML = '<i class="fas sync-alt"></i> 显示标定板';
        this.isShowingCalibrationPattern = false;
        if (this.isInCalibRoiDrawMode) {
            this.cancelCalibRoiDraw();
        }
        this.updateCalibRoiOverlay();
        this.updateRoiOverlay();
        this.updateControlStates(this.isConnected);
        this.updateCalibRoiControlsUI();
    }
    // -------------------------

    // --- Autofocus Logic ---
    async startAutofocus() {
        if (this.isFocusing || !this.isConnected || !this.selectedAxisId) return;

        console.log("--------- 开始自动对焦流程 ---------");
        this.isFocusing = true;
        this.bestZFound = null;
        let bestClarityRough = -1;
        let bestZRough = null;
        this.updateFocusStatus('初始化检查');
        await this.wait(this.INIT_DELAY);

        try {
            this.updateFocusStatus('请求Z轴控制权');
            await this.wait(this.CONTROL_REQUEST_DELAY);

            this.updateFocusStatus('粗对焦中');
            console.log('粗对焦: 扫描范围', this.Z_RANGE, '步长', this.Z_STEP_ROUGH);
            for (let z = this.Z_RANGE.min; z <= this.Z_RANGE.max; z += this.Z_STEP_ROUGH) {
                if (!this.isFocusing) throw new Error('对焦已手动停止');
                await this.simulateZMovement(z);
                const clarity = this.calculateClarity(z);
                console.log(`  Z=${z.toFixed(2)}, 清晰度=${clarity.toFixed(3)}`);
                if (clarity > bestClarityRough) {
                    bestClarityRough = clarity;
                    bestZRough = z;
                }
                await this.wait(this.SCAN_DELAY_ROUGH);
            }
            console.log(`粗对焦完成: 最佳 Z ≈ ${bestZRough?.toFixed(2)}, 清晰度 ≈ ${bestClarityRough.toFixed(3)}`);

            if (bestZRough === null) throw new Error('粗对焦未能找到最佳位置');

            this.updateFocusStatus('精细对焦中');
            const fineRangeMin = Math.max(this.Z_RANGE.min, bestZRough - this.Z_STEP_ROUGH);
            const fineRangeMax = Math.min(this.Z_RANGE.max, bestZRough + this.Z_STEP_ROUGH);
            let bestClarityFine = -1;
            let bestZFine = null;
            console.log('精细对焦: 扫描范围', { min: fineRangeMin, max: fineRangeMax }, '步长', this.Z_STEP_FINE);
            for (let z = fineRangeMin; z <= fineRangeMax; z += this.Z_STEP_FINE) {
                const currentZFine = parseFloat(z.toFixed(2)); 
                if (!this.isFocusing) throw new Error('对焦已手动停止');
                await this.simulateZMovement(currentZFine);
                const clarity = this.calculateClarity(currentZFine);
                console.log(`    Z=${currentZFine.toFixed(2)}, 清晰度=${clarity.toFixed(3)}`);
                if (clarity > bestClarityFine) {
                    bestClarityFine = clarity;
                    bestZFine = currentZFine;
                }
                await this.wait(this.SCAN_DELAY_FINE);
            }
            this.bestZFound = bestZFine;
            console.log(`精细对焦完成: 最佳 Z = ${this.bestZFound?.toFixed(2)}, 清晰度 = ${bestClarityFine.toFixed(3)}`);

            if (this.bestZFound === null) throw new Error('精细对焦未能找到最佳位置');

            this.updateFocusStatus('移动到最佳位置');
            await this.simulateZMovement(this.bestZFound);
            await this.wait(this.CONTROL_REQUEST_DELAY);

            this.updateFocusStatus('保存参数中');
            this.saveState();
            await this.wait(this.SAVE_DELAY); 

           this.updateFocusStatus('已对焦');
           console.log("--------- 自动对焦流程成功完成 ---------");

        } catch (error) {
            console.error("自动对焦过程中出错:", error);
            if (this.isFocusing) {
                this.updateFocusStatus('错误');
                alert(`自动对焦失败: ${error.message}`);
            } else {
                this.updateFocusStatus('已停止');
            }
        } finally {
            this.isFocusing = false;
            this.focusProcessId = null;
            this.updateControlStates(this.isConnected);
        }
    }

    stopAutofocus() {
        if (!this.isFocusing) return;
        console.log("请求停止自动对焦...");
        this.isFocusing = false;
        if (this.focusProcessId) {
             clearTimeout(this.focusProcessId);
             this.focusProcessId = null;
        }
        this.updateControlStates(this.isConnected);
        console.log("停止信号已发送。");
    }
    // ---------------------

    // --- 获取并显示轴配置下拉列表 ---
    async fetchAndShowAxisDropdown() {
        if (!this.isConnected) return;

        if (this.isAxisDropdownVisible) {
            this.hideAxisDropdown();
            return;
        }

        console.log("模拟: 开始获取轴列表...");
        this.axisListUl.innerHTML = '<li class="axis-list-loading">加载中...</li>';
        this.dropdownCameraSN.textContent = `相机: ${this.serialNumberSelect.value}`;
        this.axisDropdown.classList.add('show');
        this.isAxisDropdownVisible = true;

        try {
            await this.wait(400, 'axisFetchProcessId');
            const availableAxes = [
                { id: 'PLC_Axis_Z1', name: '龙门 Z 轴' },
                { id: 'PLC_Axis_Z2', name: '旋转台 Z 轴' },
                { id: 'PLC_Axis_A1', name: '辅助轴 A' },
                { id: 'SimulatedZ', name: '模拟 Z 轴' },
            ];
            console.log("模拟: 获取到轴列表:", availableAxes);

            this.axisListUl.innerHTML = '';

            if (availableAxes.length > 0) {
                availableAxes.forEach(axis => {
                    const li = document.createElement('li');
                    li.textContent = `${axis.name} (${axis.id})`;
                    li.dataset.axisId = axis.id;
                    li.addEventListener('click', () => this.selectAxis(axis.id));
                    this.axisListUl.appendChild(li);
                });
            } else {
                this.axisListUl.innerHTML = '<li class="axis-list-empty">未找到可用轴</li>';
            }

        } catch (error) {
            if (error.message.includes('Stopped during wait')) {
                 console.log("模拟: 轴列表获取被取消。");
            } else {
                 console.error("模拟: 获取轴列表时出错:", error);
                 this.axisListUl.innerHTML = '<li class="axis-list-error">加载轴列表失败</li>';
            }
        }
    }

    hideAxisDropdown() {
        if (this.axisFetchProcessId) {
             clearTimeout(this.axisFetchProcessId);
             this.axisFetchProcessId = null;
        }
        this.axisDropdown.classList.remove('show');
        this.isAxisDropdownVisible = false;
    }

    selectAxis(axisId) {
        console.log(`选择了轴: ${axisId}`);
        this.selectedAxisId = axisId;
        this.updateConfigAxisButtonDisplay(axisId);
        this.hideAxisDropdown();
        this.updateControlStates(this.isConnected);
        this.saveState();
        console.log("模拟: 已将选定的轴保存到状态。");
    }

    async clearAxisConfig() {
        console.log("清空轴配置...");
        const oldAxisId = this.selectedAxisId;
        this.selectedAxisId = null;
        this.updateConfigAxisButtonDisplay(null);
        this.updateControlStates(this.isConnected);

        try {
            console.log(`模拟: 通知后端清空轴配置 (相机: ${this.serialNumberSelect.value}, 原轴ID: ${oldAxisId})`);
            alert("模拟: 轴配置已清空");
        } catch (error) {
            console.error("模拟: 清空轴配置时后端通信出错:", error);
            alert("模拟: 清空轴配置时发生错误");
        }
        this.saveState();
    }

    saveState() {
        if (!this.isConnected || !this.serialNumberSelect.value) return;
        const cameraSN = this.serialNumberSelect.value;
        const stateToSave = {
            selectedAxisId: this.selectedAxisId,
            bestZFound: this.bestZFound,
            calibrationRatio: this.calibrationRatio
        };
        try {
            localStorage.setItem(`cameraState_${cameraSN}`, JSON.stringify(stateToSave));
            console.log(`状态已保存到 localStorage (相机: ${cameraSN}):`, stateToSave);
        } catch (e) {
            console.error("保存状态到 localStorage 时出错:", e);
        }
    }

    loadState() {
        if (!this.isConnected || !this.serialNumberSelect.value) return;
        const cameraSN = this.serialNumberSelect.value;
        try {
            const savedStateJSON = localStorage.getItem(`cameraState_${cameraSN}`);
            if (savedStateJSON) {
                const savedState = JSON.parse(savedStateJSON);
                console.log(`从 localStorage 加载状态 (相机: ${cameraSN}):`, savedState);

                if (savedState.hasOwnProperty('selectedAxisId')) {
                    this.selectedAxisId = savedState.selectedAxisId;
                    this.updateConfigAxisButtonDisplay(this.selectedAxisId);
                }
                if (savedState.hasOwnProperty('bestZFound')) {
                    this.bestZFound = savedState.bestZFound;
                }
                if (savedState.hasOwnProperty('calibrationRatio')) {
                    this.calibrationRatio = savedState.calibrationRatio;
                    if (this.calibrationRatio !== null && this.calibrationResultValue) {
                        this.calibrationResultValue.textContent = `${this.calibrationRatio.toFixed(2)} pixels/mm`;
                    }
                }
                this.updateControlStates(this.isConnected);
            } else {
                console.log(`未找到相机 ${cameraSN} 的已保存状态。`);
            }
        } catch (e) {
            console.error("从 localStorage 加载状态时出错:", e);
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

    // --- Fetch Available Cameras ---
    async fetchAvailableCameras() {
        console.log("正在获取可用相机列表...");
        this.serialNumberSelect.innerHTML = '<option value="">加载中...</option>';
        this.serialNumberSelect.disabled = true;
        this.connectBtn.disabled = true;

        try {
            await this.wait(300);
            const cameraList = ['SN_Sim_1', 'SN_Sim_2', 'SN_Backend_123', 'SN_Backend_456'];
            console.log("模拟: 获取到相机列表:", cameraList);

            this.serialNumberSelect.innerHTML = '';

            if (cameraList && cameraList.length > 0) {
                this.serialNumberSelect.appendChild(new Option('请选择相机...', ''));
                cameraList.forEach(sn => {
                    this.serialNumberSelect.appendChild(new Option(sn, sn));
                });
                this.serialNumberSelect.disabled = false;
            } else {
                this.serialNumberSelect.appendChild(new Option('未找到相机', ''));
                this.serialNumberSelect.disabled = true;
            }

        } catch (error) {
            console.error("获取可用相机列表失败:", error);
            this.serialNumberSelect.innerHTML = '<option value="">加载失败</option>';
            this.serialNumberSelect.disabled = true;
        }
    }
    // -------------------------------

    // --- Helper functions for Quadrant Logic ---
    getCoordinateQuadrant(imageX, imageY) {
        const midX = this.simulatedImage.naturalWidth / 2;
        const midY = this.simulatedImage.naturalHeight / 2;
        if (imageX < midX && imageY < midY) return 'TL';
        if (imageX >= midX && imageY < midY) return 'TR';
        if (imageX < midX && imageY >= midY) return 'BL';
        if (imageX >= midX && imageY >= midY) return 'BR';
        return 'TL';
    }

    // --- Calibration ROI Logic ---
    enableCalibRoi() {
        if (this.drawCalibRoiBtn.disabled || !this.isConnected || !this.isShowingCalibrationPattern) return;

        console.log('启用校准 ROI 绘制模式');
        this.isInCalibRoiDrawMode = true;
        this.pendingCalibRoiRect = null;
        this.isDrawingCalibRoi = false;

        if (this.calibrationPatternDisplay) {
             this.calibrationPatternDisplay.style.cursor = 'crosshair';
            if (!this.boundHandleCalibRoiMouseDown) {
                 this.boundHandleCalibRoiMouseDown = this.handleCalibRoiMouseDown.bind(this);
                 this.calibrationPatternDisplay.addEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
            }
        }
        this.updateCalibRoiControlsUI();
    }

    handleCalibRoiMouseDown(event) {
        if (!this.isInCalibRoiDrawMode || this.isDrawingCalibRoi || !this.isShowingCalibrationPattern) return;

        event.preventDefault();
        console.log("Calibration ROI Mouse Down - Start Drawing");
        this.isDrawingCalibRoi = true;
        const coords = this.getImageCoordinates(event, this.calibrationPatternDisplay);
         if (!coords) {
             this.isDrawingCalibRoi = false;
             console.error("Calibration ROI Mouse Down - Failed to get coordinates.");
             return;
         }
        this.calibRoiStartX = coords.x;
        this.calibRoiStartY = coords.y;
        this.pendingCalibRoiRect = { x: this.calibRoiStartX, y: this.calibRoiStartY, width: 0, height: 0 };
        this.updateCalibRoiOverlay();

        this.boundHandleCalibRoiMouseMove = this.handleCalibRoiMouseMove.bind(this);
        this.boundHandleCalibRoiMouseUp = this.handleCalibRoiMouseUp.bind(this);
        window.addEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
        window.addEventListener('mouseup', this.boundHandleCalibRoiMouseUp);
    }

    handleCalibRoiMouseMove(event) {
        if (!this.isDrawingCalibRoi || !this.isInCalibRoiDrawMode || !this.isShowingCalibrationPattern) return;

        const coords = this.getImageCoordinates(event, this.calibrationPatternDisplay);
        if (!coords) return;
        this.currentCalibRoiX = coords.x;
        this.currentCalibRoiY = coords.y;

        const x = Math.min(this.calibRoiStartX, this.currentCalibRoiX);
        const y = Math.min(this.calibRoiStartY, this.currentCalibRoiY);
        const width = Math.abs(this.currentCalibRoiX - this.calibRoiStartX);
        const height = Math.abs(this.currentCalibRoiY - this.calibRoiStartY);

        this.pendingCalibRoiRect = { x, y, width, height };
        this.updateCalibRoiOverlay();
    }

    handleCalibRoiMouseUp(event) {
        if (!this.isDrawingCalibRoi || !this.isInCalibRoiDrawMode || !this.isShowingCalibrationPattern) return;

        console.log("Calibration ROI Mouse Up");
        this.isDrawingCalibRoi = false;
        this.isInCalibRoiDrawMode = false;

        if (this.calibrationPatternDisplay && this.boundHandleCalibRoiMouseDown) {
            this.calibrationPatternDisplay.style.cursor = 'default';
        }
        if (this.boundHandleCalibRoiMouseMove) window.removeEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
        if (this.boundHandleCalibRoiMouseUp) window.removeEventListener('mouseup', this.boundHandleCalibRoiMouseUp);

        if (this.pendingCalibRoiRect && (this.pendingCalibRoiRect.width < 5 || this.pendingCalibRoiRect.height < 5)) {
            console.log('Calibration ROI 绘制尺寸过小，未设置');
            this.pendingCalibRoiRect = null;
        } else if (this.pendingCalibRoiRect) {
            console.log('Calibration ROI 绘制完成，等待确认:', this.pendingCalibRoiRect);
        } else {
            console.log('Calibration ROI mouse up without valid rect.');
        }

        this.updateCalibRoiOverlay();
        this.updateCalibRoiControlsUI();
    }

    confirmCalibRoi() {
        if (this.confirmCalibRoiBtn.disabled || !this.pendingCalibRoiRect || !this.isShowingCalibrationPattern) return;

        this.finalCalibRoiRect = { ...this.pendingCalibRoiRect };
        this.pendingCalibRoiRect = null;
        console.log('校准 ROI 已确认:', this.finalCalibRoiRect);
        if (this.calibrationPatternDisplay) this.calibrationPatternDisplay.style.cursor = 'default';
        this.isInCalibRoiDrawMode = false;
        this.isCalibRoiVisible = true;
        this.updateCalibRoiOverlay();
        this.updateCalibRoiControlsUI();
    }

    redrawCalibRoi() {
        if (this.redrawCalibRoiBtn.disabled || !this.isShowingCalibrationPattern) return;

        this.pendingCalibRoiRect = null;
        this.finalCalibRoiRect = null;
        this.isInCalibRoiDrawMode = false;
        this.isDrawingCalibRoi = false;

        if (this.calibrationPatternDisplay) {
            this.calibrationPatternDisplay.style.cursor = 'default';
        }
        if (this.boundHandleCalibRoiMouseMove) window.removeEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
        if (this.boundHandleCalibRoiMouseUp) window.removeEventListener('mouseup', this.boundHandleCalibRoiMouseUp);

        console.log('请求重新绘制校准 ROI');
        this.updateCalibRoiOverlay();
        this.updateCalibRoiControlsUI();
        this.enableCalibRoi();
    }

    cancelFocusRoiDraw() {
        if (!this.isDrawingRoi || this.focusRoiState !== 'drawing') return;
        console.log("取消对焦 ROI 绘制");
        this.isDrawingRoi = false;
        this.focusRoiState = 'idle';
        if (this.simulatedImage) {
            this.simulatedImage.style.cursor = 'default';
        }
        this.pendingRoiRect = null;
        this.updateRoiOverlay();
        this.updateRoiControlsUI();
    }

    cancelCalibRoiDraw() {
        if (!this.isDrawingCalibRoi || !this.isInCalibRoiDrawMode) return;
        console.log("取消校准 ROI 绘制");
        this.isDrawingCalibRoi = false;
        this.isInCalibRoiDrawMode = false;
        if (this.calibrationPatternDisplay) {
            this.calibrationPatternDisplay.style.cursor = 'default';
            if (this.boundHandleCalibRoiMouseMove) window.removeEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
            if (this.boundHandleCalibRoiMouseUp) window.removeEventListener('mouseup', this.boundHandleCalibRoiMouseUp);
        }
        this.pendingCalibRoiRect = null;
        this.updateCalibRoiOverlay();
        this.updateCalibRoiControlsUI();
    }

    startFocusRoiDraw(isRedraw = false) {
        if (!this.isConnected || this.isFocusing || this.isCalibrating) return;
        if (isRedraw) {
            console.log("开始重绘对焦 ROI");
            this.finalRoiRect = null;
        } else {
            console.log("开始绘制对焦 ROI");
        }
        this.focusRoiState = 'drawing';
        this.pendingRoiRect = null;
        this.isDrawingRoi = false;
        if (this.simulatedImage) {
            this.simulatedImage.style.cursor = 'crosshair';
        }
        this.updateRoiOverlay();
        this.updateRoiControlsUI();
    }

    clearFocusRoi() {
        if (this.focusRoiState === 'idle') return;

        console.log("清除对焦 ROI");
        this.focusRoiState = 'idle';
        this.finalRoiRect = null;
        this.pendingRoiRect = null;
        this.isDrawingRoi = false;
        this.isFocusRoiVisible = true;
        if (this.simulatedImage) {
            this.simulatedImage.style.cursor = 'default';
        }
        this.updateRoiOverlay();
        this.updateRoiControlsUI();
    }

    confirmFocusRoi() {
        if (this.focusRoiState !== 'drawn' || !this.pendingRoiRect) return;

        this.finalRoiRect = { ...this.pendingRoiRect };
        this.focusRoiState = 'confirmed';
        this.pendingRoiRect = null;
        this.isFocusRoiVisible = true;

        console.log("对焦 ROI 已确认:", this.finalRoiRect);

        this.updateRoiOverlay();
        this.updateRoiControlsUI();
    }

    toggleFocusRoiVisibility() {
        if (this.isShowingCalibrationPattern || !this.finalRoiRect || this.focusRoiState !== 'confirmed') return;

        this.isFocusRoiVisible = !this.isFocusRoiVisible;
        console.log(`对焦 ROI 可见性: ${this.isFocusRoiVisible}`);
        this.updateRoiOverlay();
        this.updateRoiControlsUI();
    }

    updateRoiControlsUI() {
        console.log(`[updateRoiControlsUI] State: ${this.focusRoiState}`);
        const canDraw = this.isConnected && !this.isFocusing && !this.isCalibrating;

        if (this.drawRoiFocusBtn) {
            const shouldShowDraw = this.focusRoiState === 'idle';
            console.log(`[updateRoiControlsUI] Draw Button - Found: true, Should Show: ${shouldShowDraw}`);
            this.drawRoiFocusBtn.style.display = shouldShowDraw ? 'inline-block' : 'none';
            this.drawRoiFocusBtn.disabled = !canDraw;
        } else {
             console.warn("[updateRoiControlsUI] Draw Button not found!");
        }

        if (this.focusRoiButtonGroup) {
            const shouldShowGroup = this.focusRoiState === 'drawn' || this.focusRoiState === 'confirmed';
             console.log(`[updateRoiControlsUI] Button Group - Found: true, Should Show: ${shouldShowGroup}`);
            this.focusRoiButtonGroup.style.display = shouldShowGroup ? 'flex' : 'none';
        } else {
             console.warn("[updateRoiControlsUI] Button Group (focus-roi-button-group) not found! Did you add the ID in HTML?");
        }

        if (this.confirmFocusRoiBtn) {
            const shouldShowConfirm = this.focusRoiState === 'drawn';
             console.log(`[updateRoiControlsUI] Confirm Button - Found: true, Should Show: ${shouldShowConfirm}`);
            this.confirmFocusRoiBtn.style.display = shouldShowConfirm ? 'inline-block' : 'none';
            this.confirmFocusRoiBtn.disabled = !canDraw;
        } else {
            console.warn("[updateRoiControlsUI] Confirm Button not found!");
        }
    }

    // --- Re-add missing Calibration ROI UI update functions ---
    updateCalibRoiControlsUI() {
        const showCalibControls = this.isShowingCalibrationPattern;
        const canInteract = this.isConnected && !this.isFocusing && !this.isCalibrating;

        console.log(`[updateCalibRoiControlsUI] showCalibControls: ${showCalibControls}, pending: ${!!this.pendingCalibRoiRect}, final: ${!!this.finalCalibRoiRect}`);

        if (this.drawCalibRoiBtn) this.drawCalibRoiBtn.style.display = 'none';
        if (this.calibRoiButtonGroup) this.calibRoiButtonGroup.style.display = 'none';
        if (this.confirmCalibRoiBtn) this.confirmCalibRoiBtn.style.display = 'none';
        if (this.redrawCalibRoiBtn) this.redrawCalibRoiBtn.style.display = 'none';
        if (this.toggleCalibRoiVisibilityBtn) this.toggleCalibRoiVisibilityBtn.style.display = 'none';

        if (showCalibControls) {
            if (this.pendingCalibRoiRect) {
                if (this.calibRoiButtonGroup) {
                     this.calibRoiButtonGroup.style.display = 'flex';
                     console.log("[updateCalibRoiControlsUI] Setting calib group display to 'flex' (pending)");
                }
                if (this.confirmCalibRoiBtn) {
                     this.confirmCalibRoiBtn.style.display = 'inline-block';
                     this.confirmCalibRoiBtn.disabled = !canInteract;
                }
                if (this.redrawCalibRoiBtn) {
                     this.redrawCalibRoiBtn.style.display = 'inline-block';
                     this.redrawCalibRoiBtn.disabled = !canInteract;
                }
                if (this.toggleCalibRoiVisibilityBtn) this.toggleCalibRoiVisibilityBtn.style.display = 'none';
             } else if (this.finalCalibRoiRect) {
                 if (this.calibRoiButtonGroup) {
                     this.calibRoiButtonGroup.style.display = 'flex';
                     console.log("[updateCalibRoiControlsUI] Setting calib group display to 'flex' (confirmed)");
                 }
                 if (this.confirmCalibRoiBtn) this.confirmCalibRoiBtn.style.display = 'none';
                 if (this.redrawCalibRoiBtn) {
                     this.redrawCalibRoiBtn.style.display = 'inline-block';
                     this.redrawCalibRoiBtn.disabled = !canInteract;
                 }
                 if (this.toggleCalibRoiVisibilityBtn) {
                     this.toggleCalibRoiVisibilityBtn.style.display = 'inline-block';
                      this.toggleCalibRoiVisibilityBtn.disabled = !this.finalCalibRoiRect;
                 }
             } else {
                 if (this.drawCalibRoiBtn) {
                     this.drawCalibRoiBtn.style.display = 'inline-block';
                     this.drawCalibRoiBtn.disabled = !canInteract || this.isInCalibRoiDrawMode;
                 }
                 if (this.calibRoiButtonGroup) {
                    this.calibRoiButtonGroup.style.display = 'none';
                    console.log("[updateCalibRoiControlsUI] Setting calib group display to 'none' (idle)");
                 }
             }
        } else {
             console.log("[updateCalibRoiControlsUI] Not in calibration view, hiding group.");
             if (this.calibRoiButtonGroup) this.calibRoiButtonGroup.style.display = 'none';
        }
        this.updateCalibRoiToggleButtonState();
    }

    updateCalibRoiToggleButtonState() {
        if (!this.toggleCalibRoiVisibilityBtn) return;

        const icon = this.toggleCalibRoiVisibilityBtn.querySelector('i');
        if (!icon) return;

        if (this.isCalibRoiVisible) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
            this.toggleCalibRoiVisibilityBtn.title = "隐藏校准ROI";
        } else {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
            this.toggleCalibRoiVisibilityBtn.title = "显示校准ROI";
        }
    }
    // --- End re-added Calibration ROI UI update functions ---

    // --- Re-add the missing updateUIFromState function and its helper ---
    updateUIFromState(state) {
        if (!state) return;
        console.log('Backend state received in updateUIFromState:', JSON.stringify(state));

        this.isConnected = state.isConnected;

        if (this.isConnected) {
            if (this.serialNumberSelect && state.serialNumber) {
                 let found = false;
                 for(let i=0; i<this.serialNumberSelect.options.length; i++){
                     if(this.serialNumberSelect.options[i].value === state.serialNumber){
                         this.serialNumberSelect.selectedIndex = i;
                         found = true;
                         break;
                     }
                 }
                 if (!found) {
                    const newOption = new Option(state.serialNumber, state.serialNumber, false, true);
                    this.serialNumberSelect.appendChild(newOption);
                 }
            } else if (this.serialNumberSelect) {
                this.serialNumberSelect.value = '';
            }

            if (this.configFileInput) { this.configFileInput.value = state.configFile || ''; }
            if (this.savePathInput) { this.savePathInput.value = state.savePath || ''; }
            if (this.cameraNameInput) { this.cameraNameInput.value = state.cameraName || ''; }
            if (this.cameraModelInput) { this.cameraModelInput.value = state.cameraModel || ''; }

            this.currentZ = state.currentZ !== undefined ? state.currentZ : '--';
            this.currentClarity = state.clarity;
            this.bestZFound = state.bestZ;

            const currentZStr = typeof this.currentZ === 'number' ? this.currentZ.toFixed(2) : '--';
            if (this.footerZPos) { this.footerZPos.textContent = currentZStr; }
            if (this.currentZInput) { this.currentZInput.value = currentZStr; }
            if (this.clarityValueInput) { this.clarityValueInput.value = typeof this.currentClarity === 'number' ? this.currentClarity.toFixed(3) : '--'; }
            if (!this.isShowingCalibrationPattern) {
                 this.applyBlur(this.currentClarity);
             }

            const properties = state.properties || {};
            const propsContainer = document.querySelector('.property-grid');
            if(propsContainer){
                Object.entries(properties).forEach(([key, propData]) => {
                     if (key === '曝光时间(us)' && document.getElementById('exposure-time')) {
                          document.getElementById('exposure-time').value = propData.value;
                     } else if (key === '增益' && document.getElementById('gain')) {
                          document.getElementById('gain').value = propData.value;
                     } else if (key === '触发模式' && document.getElementById('trigger-mode-select')) {
                         document.getElementById('trigger-mode-select').value = propData.value;
                     }
                });
            }

            if (state.roiCoords && state.roiEnabled !== false) {
                 this.finalRoiRect = state.roiCoords;
                 this.focusRoiState = this.finalRoiRect ? 'confirmed' : 'idle';
                 this.isFocusRoiVisible = true;
             } else {
                 this.finalRoiRect = null;
                 this.focusRoiState = 'idle';
             }
            this.pendingRoiRect = null;

            this.updateFocusStatus(state.focusStatus || '空闲');

            this.selectedAxisId = state.selectedAxisId;
            this.updateConfigAxisButtonDisplay(this.selectedAxisId);

            this.updateRoiOverlay();
            this.updateCalibRoiOverlay();
            this.updateRoiControlsUI();
            this.updateCalibRoiControlsUI();

        } else {
            this.resetUIData();
            if (!this.isShowingCalibrationPattern) {
                 this.applyBlur(1);
             }
            this.updateFocusStatus('未连接');
        }
        this.updateControlStates(this.isConnected);
    }

    resetUIData() {
        if (this.configFileInput) this.configFileInput.value = '';
        if (this.savePathInput) this.savePathInput.value = '';
        if (this.cameraNameInput) this.cameraNameInput.value = '';
        if (this.cameraModelInput) this.cameraModelInput.value = '';
        if (this.currentZInput) this.currentZInput.value = '--';
        if (this.clarityValueInput) this.clarityValueInput.value = '--';
        if (this.footerZPos) this.footerZPos.textContent = '--';
        
        this.finalRoiRect = null;
        this.pendingRoiRect = null;
        this.focusRoiState = 'idle';
        this.updateRoiOverlay();
        this.updateRoiControlsUI();
        
        this.finalCalibRoiRect = null;
        this.pendingCalibRoiRect = null;
        this.updateCalibRoiControlsUI();
        
        this.selectedAxisId = null;
        this.updateConfigAxisButtonDisplay(null);
        
        if (this.calibrationResultValue) this.calibrationResultValue.textContent = '-- px/mm';
    }
    // --- End re-added updateUIFromState function and its helper ---
} // End Class

document.addEventListener('DOMContentLoaded', () => {
    new CameraController();
});