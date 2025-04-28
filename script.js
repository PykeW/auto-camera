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

        // --- Calibration ROI Elements ---
        this.enableCalibRoiBtn = document.getElementById('enable-roi-calib-btn');
        this.calibRoiOverlay = document.getElementById('calibration-roi-overlay');
        this.confirmCalibRoiBtn = document.getElementById('confirm-roi-calib-btn');
        this.redrawCalibRoiBtn = document.getElementById('redraw-roi-calib-btn');

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
        this.isDrawingRoi = false; // Focus ROI drawing state
        this.roiStartX = 0;
        this.roiStartY = 0;
        this.currentRoiX = 0;
        this.currentRoiY = 0;
        this.finalRoiRect = null; // Focus ROI final rect
        this.pendingRoiRect = null; // Focus ROI pending rect
        this.isInRoiDrawMode = false; // Added state for draw mode

        // --- Calibration ROI State ---
        this.isDrawingCalibRoi = false;      // Is mouse currently down for drawing Calib ROI
        this.isInCalibRoiDrawMode = false;   // Has user clicked "Enable Calib ROI" button
        this.calibRoiStartX = 0;
        this.calibRoiStartY = 0;
        this.currentCalibRoiX = 0;
        this.currentCalibRoiY = 0;
        this.finalCalibRoiRect = null;     // The confirmed calibration ROI
        this.pendingCalibRoiRect = null;    // The drawn calibration ROI waiting for confirmation

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
        this.connectionProcessId = true; // Use simple flag for locking during request

        try {
            // --- Call Backend Connect Endpoint --- 
            const connectResponse = await fetch(`${this.backendUrl}/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                 // We don't have a selected SN before connect in this UI,
                 // so send empty body or a default? Backend uses its own default.
                body: JSON.stringify({})
            });

            if (!connectResponse.ok) {
                // Try to get error message from backend response
                let errorMsg = `连接请求失败，状态码: ${connectResponse.status}`;
                try {
                    const errorData = await connectResponse.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (parseError) { /* Ignore if response is not JSON */ }
                throw new Error(errorMsg);
            }
            
            // Backend /connect now returns the initial state
            const backendState = await connectResponse.json(); 
            console.log("后端连接成功，状态:", backendState);

            // Update frontend state based on backend response
            this.isConnected = backendState.isConnected;
            this.selectedAxisId = backendState.selectedAxisId; // Get initial axis if set

            // Populate UI using the state received from /connect
            // (We might not need populateSimulatedData separately anymore)
            this.updateUIFromState(backendState);
            this.updateControlStates(true); 
            this.updateFocusStatus(backendState.focusStatus || '空闲'); 

            this.footerStatus.textContent = "状态: 已连接";
            this.connectBtn.textContent = "断开连接";

        } catch(error) {
             console.error("连接相机时出错:", error);
             this.footerStatus.textContent = `状态: 连接失败 (${error.message})`;
             this.isConnected = false; // Ensure state is false on error
             this.updateControlStates(false);
             // Re-enable dropdown if connection fails?
             this.serialNumberSelect.disabled = false;
        } finally {
             this.connectBtn.disabled = this.isFocusing || this.isCapturing || this.isRecording; // Re-evaluate button disable state
             this.connectionProcessId = null;
        }
        // After successful connection, try loading saved state
        if (this.isConnected) {
            this.loadState();
        }
    }

    async disconnectCamera() {
        // Prevent multiple disconnects or disconnect while busy
        if (!this.isConnected || this.connectionProcessId) return;
        console.log("断开相机连接 (请求后端)...");
        // Indicate disconnecting process (optional)
        this.connectBtn.textContent = "断开中..."; 
        this.connectBtn.disabled = true;
        this.connectionProcessId = true; // Lock during request

        try {
            // --- Call Backend Disconnect Endpoint --- 
            const response = await fetch(`${this.backendUrl}/disconnect`, {
                method: 'POST' // No body needed usually for disconnect
            });

            if (!response.ok) {
                // Handle backend error during disconnect
                let errorMsg = `断开连接请求失败，状态码: ${response.status}`;
                try {
                     const errorData = await response.json();
                     errorMsg = errorData.message || errorMsg;
                } catch (parseError) { /* Ignore if response is not JSON */ }
                throw new Error(errorMsg);
            }

            // Backend confirmed disconnect, now update frontend state
            const backendState = await response.json(); // Backend returns the new state
            console.log("后端确认断开连接，状态:", backendState);

            // Stop frontend processes first
            this.stopAutofocus(); 
            this.stopCapture();   

             // Update UI based on the state returned by the backend
            this.updateUIFromState(backendState); // Should handle isConnected = false
            this.updateControlStates(false); // Ensure controls are disabled
            this.updateFocusStatus('未连接');
            if (this.focusRoiOverlay) this.focusRoiOverlay.style.display = 'none'; 
            if (this.enableCalibRoiBtn) this.enableCalibRoiBtn.textContent = "启用对焦ROI";
            this.hideAxisDropdown(); 
            console.log("前端状态已更新为断开");
            // Fetch available cameras again after disconnecting
            this.fetchAvailableCameras();

            // Reset Calibration ROI State as well
            this.pendingCalibRoiRect = null;
            this.finalCalibRoiRect = null;
            this.isInCalibRoiDrawMode = false;
            this.isDrawingCalibRoi = false;
            if (this.calibRoiOverlay) this.calibRoiOverlay.style.display = 'none';
            if (this.calibrationPatternDisplay) this.calibrationPatternDisplay.style.cursor = 'default';

        } catch (error) {
            console.error("断开相机时出错:", error);
            alert(`断开连接时出错: ${error.message}`);
            // Should we force frontend state to disconnected even if backend failed?
            // Or leave it as connected but show error?
            // For simplicity, let's attempt to revert button state if possible
            if (this.isConnected) { // If frontend *thought* it was connected
                 this.connectBtn.textContent = "断开连接"; // Revert button text
            } else {
                 this.connectBtn.textContent = "连接";
            }
        } finally {
             this.connectBtn.disabled = this.isFocusing || this.isCapturing || this.isRecording; // Re-evaluate button disable state
             this.connectionProcessId = null; // Unlock
        }
        this.saveState(); // Save state after disconnecting
    }

    // Enables/disables controls based on connection status AND other states
    updateControlStates(connected) {
        const isIdle = connected && !this.isFocusing && !this.isCapturing && !this.isRecording;
        const canStartActivity = isIdle; // Adjusted to use isIdle

        // Connect Button
        const hasSelectedCamera = this.serialNumberSelect && this.serialNumberSelect.value !== '';
        const canConnect = !this.isConnected && hasSelectedCamera && !this.connectionProcessId;
        if(this.connectBtn) this.connectBtn.disabled = !(canConnect || this.isConnected) || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;
        if(this.connectBtn) this.connectBtn.textContent = this.isConnected ? "断开" : "连接";

        // Serial Number Dropdown
        if(this.serialNumberSelect) this.serialNumberSelect.disabled = this.isConnected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating; // Disable when connected or busy

        // Header Buttons
        const isIdleAndConnected = this.isConnected && !this.isFocusing && !this.isCapturing && !this.isRecording && !this.isCalibrating;
        if(this.btnPlay) this.btnPlay.disabled = !canStartActivity || this.isCapturing || this.isRecording || this.isCalibrating;
        if(this.btnStop) this.btnStop.disabled = !(this.isCapturing || this.isRecording);
        if(this.btnCapture) this.btnCapture.disabled = !canStartActivity || this.isCapturing || this.isRecording || this.isCalibrating;
        if(this.btnRecord) this.btnRecord.disabled = !canStartActivity || this.isCapturing || this.isRecording || this.isCalibrating;
        if(this.btnTrigger) this.btnTrigger.disabled = !canStartActivity || this.isCapturing || this.isRecording || this.isCalibrating;
        // Settings button might always be enabled or have its own logic

        // Panel controls requiring connection (General)
        this.panelControls.forEach(ctrl => {
             // Exclude buttons with their own specific logic handled below
             // Note: Removed enable-roi-focus-btn from exclusions
             const excludedIds = ['connect-btn', 'start-focus-btn', 'stop-focus-btn', 'calibrate-btn', 'toggle-view-btn', 'confirm-roi-focus-btn', 'redraw-roi-focus-btn', 'calib-square-size'];
             if (!excludedIds.includes(ctrl.id) && !ctrl.classList.contains('header-button')) {
                  ctrl.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;
             }
        });

        // File/Folder Select Buttons
        if(this.selectConfigBtn) this.selectConfigBtn.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;
        if(this.selectFolderBtn) this.selectFolderBtn.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;

        // Focus buttons
        this.startFocusBtn.disabled = !isIdle || !this.selectedAxisId || this.isCalibrating;
        this.stopFocusBtn.disabled = !this.isFocusing;

        // Calibration button
        const focusComplete = connected && this.focusStatusText.textContent === '已对焦';
        this.calibrateBtn.disabled = !focusComplete || !this.selectedAxisId || this.isCapturing || this.isRecording || this.isCalibrating || this.isFocusing;

        // Toggle View Button
        if(this.toggleViewBtn) this.toggleViewBtn.disabled = !connected || this.isCalibrating || this.isFocusing; // Disable if not connected or calibrating/focusing

        // Calibration Input
        if(this.calibSquareSizeInput) this.calibSquareSizeInput.disabled = !connected || this.isCalibrating || this.isFocusing; // Disable if not connected or calibrating/focusing

        // --- Focus ROI Button States (Simplified Logic) ---
        const isFocusRoiPending = connected && this.pendingRoiRect;
        const hasFocusRoiConfirmed = connected && this.finalRoiRect;

        // Draw Button State
        const canDrawRoi = isIdle && !this.isInRoiDrawMode && !hasFocusRoiConfirmed && !isFocusRoiPending;
        if (this.drawRoiFocusBtn) {
            this.drawRoiFocusBtn.disabled = !canDrawRoi;
            // Visibility: Show if idle and no ROI exists, or after Redraw. Hide during draw/pending/confirmed.
            this.drawRoiFocusBtn.style.display = (isIdle && !hasFocusRoiConfirmed && !isFocusRoiPending && !this.isInRoiDrawMode) ? 'inline-block' : 'none';
        }

        // Show Confirm button only when ROI is pending
        if (this.confirmFocusRoiBtn) {
            this.confirmFocusRoiBtn.disabled = !isFocusRoiPending;
            this.confirmFocusRoiBtn.style.display = isFocusRoiPending ? 'inline-block' : 'none';
        }
        // Show Redraw button if ROI is pending OR confirmed
        if (this.redrawFocusRoiBtn) {
            const canRedraw = isIdle && (isFocusRoiPending || hasFocusRoiConfirmed);
            this.redrawFocusRoiBtn.disabled = !canRedraw;
            this.redrawFocusRoiBtn.style.display = (isFocusRoiPending || hasFocusRoiConfirmed) ? 'inline-block' : 'none';
        }
        // --------------------------------------------------

        // --- Calibration ROI Button States ---
        const isCalibRoiPending = connected && this.pendingCalibRoiRect;
        const hasCalibRoiConfirmed = connected && this.finalCalibRoiRect;
        const canEnableCalibRoi = isIdle && this.isShowingCalibrationPattern && !this.isInCalibRoiDrawMode && !hasCalibRoiConfirmed && !isCalibRoiPending;

        if (this.enableCalibRoiBtn) {
            this.enableCalibRoiBtn.disabled = !canEnableCalibRoi;
            // Visibility: Show if idle on calib view and no ROI exists. Hide during draw/pending/confirmed.
            this.enableCalibRoiBtn.style.display = (canEnableCalibRoi) ? 'inline-block' : 'none';
            // Set text based on state
            this.enableCalibRoiBtn.innerHTML = this.isInCalibRoiDrawMode ? '<i class="fas fa-pencil-alt"></i> 绘制中...' : '<i class="fas fa-pencil-alt"></i> 启用校准ROI';
            if(this.isInCalibRoiDrawMode) this.enableCalibRoiBtn.disabled = true; // Disable while drawing
        }
        if (this.confirmCalibRoiBtn) {
            this.confirmCalibRoiBtn.disabled = !isCalibRoiPending;
            this.confirmCalibRoiBtn.style.display = isCalibRoiPending ? 'inline-block' : 'none';
        }
        if (this.redrawCalibRoiBtn) {
             const canRedrawCalib = isIdle && this.isShowingCalibrationPattern && (isCalibRoiPending || hasCalibRoiConfirmed);
             this.redrawCalibRoiBtn.disabled = !canRedrawCalib;
            this.redrawCalibRoiBtn.style.display = (isCalibRoiPending || hasCalibRoiConfirmed) ? 'inline-block' : 'none';
        }
        // ----------------------------------------------------------

        // Table controls
        document.querySelectorAll('#property-table input, #property-table select').forEach(ctrl => {
             ctrl.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;
         });

        // Config Axis Button
        if (this.configAxisBtn) this.configAxisBtn.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;

        // Axis Config Buttons
        if (this.clearAxisBtn) this.clearAxisBtn.disabled = !connected || !this.selectedAxisId || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating; // Enable only if axis is selected and idle
    }

    // --- Event Listeners ---
    initializeEventListeners() {
        // Connect Button Listener
        if (this.connectBtn) {
             this.connectBtn.addEventListener('click', () => {
                if (this.isConnected) {
                    this.disconnectCamera();
                } else {
                    this.connectCamera();
                }
            });
        }
        // Serial Number Selection Listener
        if (this.serialNumberSelect) {
             this.serialNumberSelect.addEventListener('change', () => {
                this.updateControlStates(this.isConnected); // Update connect button state based on selection
            });
        }
        // Axis Config Button
        this.configAxisBtn?.addEventListener('click', (e) => {
             e.stopPropagation(); // Prevent body click from closing immediately
             this.fetchAndShowAxisDropdown()
         });
        // Focus Buttons
        this.startFocusBtn?.addEventListener('click', () => this.startAutofocus());
        this.stopFocusBtn?.addEventListener('click', () => this.stopAutofocus());

        // Header Buttons
        this.btnPlay?.addEventListener('click', () => this.startCapture());
        this.btnStop?.addEventListener('click', () => this.stopCapture());
        this.btnCapture?.addEventListener('click', () => this.singleShot());
        this.btnRecord?.addEventListener('click', () => this.startRecording());
        this.btnTrigger?.addEventListener('click', () => this.softwareTrigger());
        document.getElementById('btn-settings')?.addEventListener('click', () => alert("模拟：打开设置面板（未实现）"));

        // Panel Buttons
        this.selectConfigBtn?.addEventListener('click', () => alert("模拟：打开文件选择器选择配置文件"));
        this.selectFolderBtn?.addEventListener('click', () => alert("模拟：打开文件夹选择器选择保存路径"));

        // --- Focus ROI Event Listeners ---
        // REMOVED direct mousedown listener on simulatedImage
        /*
        if (this.simulatedImage) {
             this.simulatedImage.addEventListener('mousedown', this.handleRoiMouseDown.bind(this));
        } else {
            console.error("错误：无法找到 simulatedImage 元素来附加 ROI 监听器！");
        }
        */

        // ADDED listener for the new Draw button
        this.drawRoiFocusBtn?.addEventListener('click', () => {
            if (this.drawRoiFocusBtn.disabled || !this.isConnected || this.isFocusing || this.isCapturing || this.isRecording) return;
            console.log('点击绘制对焦 ROI 按钮');
            this.isInRoiDrawMode = true;
            if (this.simulatedImage) {
                this.simulatedImage.style.cursor = 'crosshair';
                // Dynamically add the listener ONLY when draw mode starts
                this.boundHandleRoiMouseDown = this.handleRoiMouseDown.bind(this);
                this.simulatedImage.addEventListener('mousedown', this.boundHandleRoiMouseDown);
            }
            this.drawRoiFocusBtn.disabled = true; // Disable draw button while drawing
            // Update other states if needed
            this.updateControlStates(this.isConnected);
        });

        // Listeners for Focus ROI buttons (Confirm and Redraw only)
        this.confirmFocusRoiBtn?.addEventListener('click', () => {
            if (this.pendingRoiRect) { // Use Focus pending rect
                this.finalRoiRect = this.pendingRoiRect; // Set Focus final rect
                this.pendingRoiRect = null;
                console.log('对焦 ROI 已确认:', this.finalRoiRect);
                if (this.simulatedImage) this.simulatedImage.style.cursor = 'default';
                // Hide Draw button after confirmation, show Redraw
                if (this.drawRoiFocusBtn) this.drawRoiFocusBtn.style.display = 'none';
                this.updateControlStates(this.isConnected);
                this.updateRoiOverlay(); // Use unified update function
            }
        });
        this.redrawFocusRoiBtn?.addEventListener('click', () => {
             this.pendingRoiRect = null; // Clear Focus pending
             this.finalRoiRect = null;   // Clear Focus final
             this.isInRoiDrawMode = false; // Exit draw mode if any
             if (this.focusRoiOverlay) this.focusRoiOverlay.style.display = 'none'; // Hide Focus overlay
             if (this.simulatedImage) {
                 this.simulatedImage.style.cursor = 'default'; // Reset cursor, drawing starts on Draw click
                 // Ensure listener is removed if redrawing before finishing previous draw
                 if (this.boundHandleRoiMouseDown) {
                     this.simulatedImage.removeEventListener('mousedown', this.boundHandleRoiMouseDown);
                 }
             }
             console.log('请求重新绘制对焦 ROI');
             // Show Draw button, hide Confirm/Redraw
            if (this.drawRoiFocusBtn) this.drawRoiFocusBtn.style.display = 'inline-block';
             this.updateControlStates(this.isConnected);
         });
        // --------------------------------

        // --- Calibration Listeners ---
        this.calibrateBtn?.addEventListener('click', () => {
            if (this.calibrateBtn.disabled) return;
            this.startCalibration();
        });
        this.toggleViewBtn?.addEventListener('click', () => {
            if (this.toggleViewBtn.disabled) return;
            this.toggleCalibrationView();
        });
        // ------------------------

        // --- Clear Axis Listener ---
        this.clearAxisBtn?.addEventListener('click', () => {
            if (this.clearAxisBtn.disabled) return;
            this.clearAxisConfig();
        });
        // -------------------------

        // Close dropdown if clicking outside
        document.body.addEventListener('click', (e) => {
            if (this.isAxisDropdownVisible &&
                !this.axisDropdown.contains(e.target) &&
                e.target !== this.configAxisBtn) {
                this.hideAxisDropdown();
            }
        });

        // Status Bar Mouse Coords
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

        // --- Calibration ROI Listeners ---
        this.enableCalibRoiBtn?.addEventListener('click', () => this.enableCalibRoi());
        this.confirmCalibRoiBtn?.addEventListener('click', () => this.confirmCalibRoi());
        this.redrawCalibRoiBtn?.addEventListener('click', () => this.redrawCalibRoi());
        // Mouse listeners for drawing calib ROI will be added dynamically
    }

    getEffectiveBestZ() { // Uses Focus ROI state
        let refX, refY;
        // Check directly for finalRoiRect instead of roiEnabled
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
        // Should only be called when isInRoiDrawMode is true and listener is active
        if (!this.isInRoiDrawMode || this.isDrawingRoi) return;
        event.preventDefault();
        console.log("Focus ROI Mouse Down - Start Drawing");
        this.isDrawingRoi = true; // Set Focus drawing state
        const coords = this.getImageCoordinates(event, this.simulatedImage); // Uses simulatedImage
        this.roiStartX = coords.x;
        this.roiStartY = coords.y;
        this.currentRoiX = coords.x; // Initialize current coords
        this.currentRoiY = coords.y;
        this.updateRoiOverlay(); // Draw initial box on focus overlay

        // Add temporary listeners
        this.boundHandleRoiMouseMove = this.handleRoiMouseMove.bind(this);
        this.boundHandleRoiMouseUp = this.handleRoiMouseUp.bind(this);
        window.addEventListener('mousemove', this.boundHandleRoiMouseMove);
        window.addEventListener('mouseup', this.boundHandleRoiMouseUp);
    }

    handleRoiMouseMove(event) {
        if (!this.isDrawingRoi) return; // Check Focus drawing state
        const coords = this.getImageCoordinates(event, this.simulatedImage); // Uses simulatedImage
        this.currentRoiX = coords.x;
        this.currentRoiY = coords.y;
        this.updateRoiOverlay(); // Update focus overlay position/size
    }

    handleRoiMouseUp(event) {
        if (!this.isDrawingRoi) return; // Check Focus drawing state
        console.log("Focus ROI Mouse Up");

        // Always remove listeners and exit drawing states immediately
        this.isDrawingRoi = false;
        this.isInRoiDrawMode = false;
        if (this.simulatedImage && this.boundHandleRoiMouseDown) {
            this.simulatedImage.removeEventListener('mousedown', this.boundHandleRoiMouseDown);
            this.simulatedImage.style.cursor = 'default';
        }

        window.removeEventListener('mousemove', this.boundHandleRoiMouseMove);
        window.removeEventListener('mouseup', this.boundHandleRoiMouseUp);

        const finalCoords = this.getImageCoordinates(event, this.simulatedImage); // Uses simulatedImage
        this.currentRoiX = finalCoords.x;
        this.currentRoiY = finalCoords.y;

        this.updateRoiOverlay(); // Update overlay to final position before calculating rect

        const x = Math.min(this.roiStartX, this.currentRoiX);
        const y = Math.min(this.roiStartY, this.currentRoiY);
        const width = Math.abs(this.roiStartX - this.currentRoiX);
        const height = Math.abs(this.roiStartY - this.currentRoiY);

        if (width > 5 && height > 5) {
             this.pendingRoiRect = { x, y, width, height }; // Set Focus pending rect
             console.log('Focus ROI 绘制完成，等待确认:', this.pendingRoiRect);
        } else {
            if(this.focusRoiOverlay) this.focusRoiOverlay.style.display = 'none';
            console.log('Focus ROI 绘制尺寸过小，未设置');
        }
        // Update buttons regardless of whether rect was valid
        this.updateControlStates(this.isConnected);
    }

    // --- Initial Setup ---
    initUI() {
        this.updateUI();
        this.updateFocusStatus('未连接');
        this.updateControlStates(false); // Ensure controls start disabled
        this.fetchAvailableCameras(); // Fetch cameras on init

        const updateImageDims = () => {
            if (this.simulatedImage.naturalWidth > 0) {
                this.statusBarImageDims.textContent = `${this.simulatedImage.naturalWidth}, ${this.simulatedImage.naturalHeight}`;
            } else {
                 this.statusBarImageDims.textContent = `---, ---`; // Handle case where image didn't load
            }
        };

        if (this.simulatedImage.complete) {
            updateImageDims();
        } else {
            this.simulatedImage.onload = updateImageDims;
            this.simulatedImage.onerror = () => {
                 console.error("无法加载模拟图像 favicon.png");
                 this.statusBarImageDims.textContent = `加载失败`;
            };
        }
    }

    // New helper function to update UI from state object
    updateUIFromState(state) {
        if (!state) return;
        console.log('Backend state received in updateUIFromState:', JSON.stringify(state)); // Log received state
 
        this.isConnected = state.isConnected;
 
        if (this.isConnected) {
            // Ensure elements exist before updating
            if (this.serialNumberSelect) { this.serialNumberSelect.innerHTML = `<option value="${state.serialNumber}">${state.serialNumber}</option>`; }
            if (this.configFileInput) { this.configFileInput.value = state.configFile || ''; }
            if (this.savePathInput) { this.savePathInput.value = state.savePath || ''; }
            if (this.cameraNameInput) { this.cameraNameInput.value = state.cameraName || ''; }
            if (this.cameraModelInput) { this.cameraModelInput.value = state.cameraModel || ''; }
 
            this.currentZ = state.currentZ !== undefined ? state.currentZ : '--'; // Handle potential undefined Z
            this.currentClarity = state.clarity;
 
            const currentZStr = typeof this.currentZ === 'number' ? this.currentZ.toFixed(2) : '--';
            if (this.footerZPos) { this.footerZPos.textContent = currentZStr; }
            if (this.currentZInput) { this.currentZInput.value = currentZStr; }
            if (this.clarityValueInput) { this.clarityValueInput.value = typeof this.currentClarity === 'number' ? this.currentClarity.toFixed(3) : '--'; }
            this.applyBlur(this.currentClarity);
 
            // Update individual property controls based on backend state
            const properties = state.properties || {};
            console.log('Processing properties:', JSON.stringify(properties)); // Log properties object
 
            // Example: Update Exposure and Gain if they exist in state.properties
            // Add similar logic for other properties (Y/X Invert, Trigger Mode etc.) if they come from backend
            const exposureInput = document.getElementById('exposure-time');
            // Use the actual key from the backend state for properties, adjust if needed
            const exposureKey = '曝光时间(us)'; // Assuming this is the key, verify from logs
            if (exposureInput) { // Check if element exists first
                 if (properties[exposureKey] && properties[exposureKey].value !== undefined) {
                    exposureInput.value = properties[exposureKey].value;
                } else {
                    exposureInput.value = ''; // Clear if not present in state or key is wrong
                }
            }
 
            const gainInput = document.getElementById('gain');
            const gainKey = '增益'; // Assuming this is the key, verify from logs
            if (gainInput) { // Check if element exists first
                if (properties[gainKey] && properties[gainKey].value !== undefined) {
                    gainInput.value = properties[gainKey].value;
                } else {
                    gainInput.value = ''; // Clear if not present in state or key is wrong
                }
            }
 
            // Update Enable and Auto WB switches based on specific state fields
            const enableSwitch = document.getElementById('enable-camera-cb');
            if (enableSwitch) { // Check element exists first
                 enableSwitch.checked = state.cameraEnabled || false;
            }
 
            // (White balance update logic below remains mostly the same)
 
            // ROI Area
            // Check element existence before accessing properties
            const roi = state.roiCoords; // Assuming backend sends {x, y, width, height}
            if (roi && typeof roi === 'object' && roi.width > 0 && roi.height > 0) {
                  this.finalRoiRect = roi; // Store it
                  // If ROI is also enabled in state, draw the initial overlay
                  if (state.roiEnabled) {
                      this.roiEnabled = true; // Make sure frontend knows
                      // Cursor is handled by Draw button now
                      // Need to calculate display coords and show overlay
                      this.updateRoiOverlay(); // Call unified update function
                  } else {
                      this.roiEnabled = false;
                      if (this.simulatedImage) { this.simulatedImage.style.cursor = 'default'; } // Check exists
                      if (this.roiOverlay) { this.roiOverlay.style.display = 'none'; } // Check exists
                      this.updateRoiOverlay(); // Ensure overlay hidden if no rect
                  }
            } else {
                // No ROI from backend or invalid
                 this.finalRoiRect = null;
                 this.pendingRoiRect = null; // Ensure pending is also null
                 this.roiEnabled = state.roiEnabled || false; // Use backend state or default false
                 if (this.roiEnabled) {
                     if (this.simulatedImage) { this.simulatedImage.style.cursor = 'crosshair'; } // Check exists
                     if (this.roiOverlay) { this.roiOverlay.style.display = 'none'; } // Hide until drawn
                     this.updateRoiOverlay(); // Ensure overlay hidden if no rect
                 } else {
                     if (this.simulatedImage) { this.simulatedImage.style.cursor = 'default'; } // Check exists
                     if (this.roiOverlay) { this.roiOverlay.style.display = 'none'; } // Check exists
                     this.updateRoiOverlay(); // Ensure overlay hidden if no rect
                 }
            }
            // Update selected Axis display
            this.updateConfigAxisButtonDisplay(state.selectedAxisId);
 
            // Update White Balance controls based on state
            if (this.whiteBalanceCheckbox) { // Check exists first
                 this.whiteBalanceCheckbox.checked = state.autoWhiteBalanceEnabled || false;
                 this.toggleManualWBControls(!this.whiteBalanceCheckbox.checked);
            }
            if (state.whiteBalanceValues) {
                if (this.wbRedSlider) { this.wbRedSlider.value = state.whiteBalanceValues.red !== undefined ? state.whiteBalanceValues.red : 128; } // Check exists & value defined
                if (this.wbGreenSlider) { this.wbGreenSlider.value = state.whiteBalanceValues.green !== undefined ? state.whiteBalanceValues.green : 128; }
                if (this.wbBlueSlider) { this.wbBlueSlider.value = state.whiteBalanceValues.blue !== undefined ? state.whiteBalanceValues.blue : 128; }
                this.updateWBValueDisplays(); // Update span text
            }
 
        } else {
            // Handle disconnected state (similar to resetUIData)
            this.resetUIData();
            this.applyBlur(1);
        }
    }

    // --- Helper for coordinate calculation relative to a target element ---
    getImageCoordinates(event, targetElement) {
        if (!targetElement) {
            console.error("getImageCoordinates: targetElement is missing!");
            return { x: 0, y: 0 };
        }

        const rect = targetElement.getBoundingClientRect();

        // Determine the 'natural' dimensions. For SVG, use width/height attributes or viewBox?
        // For simplicity, let's assume the calibration pattern SVG display area acts like an image.
        // In a real scenario, SVG coordinates might need different handling.
        const naturalWidth = targetElement.naturalWidth || rect.width; // Fallback to rect width for SVG
        const naturalHeight = targetElement.naturalHeight || rect.height; // Fallback to rect height for SVG

        if (rect.width === 0 || rect.height === 0 || naturalWidth === 0 || naturalHeight === 0) {
            console.warn("getImageCoordinates: Invalid dimensions for target element or rect.", { rect, naturalWidth, naturalHeight });
            return { x: 0, y: 0 };
        }

        const scaleX = naturalWidth / rect.width;
        const scaleY = naturalHeight / rect.height;
        // ... (rest of calculation remains the same for now)
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
        const isCalibView = this.isShowingCalibrationPattern;
        const overlayElement = isCalibView ? this.calibRoiOverlay : this.focusRoiOverlay;
        const targetDisplayElement = isCalibView ? this.calibrationPatternDisplay : this.simulatedImage;
        const otherOverlayElement = isCalibView ? this.focusRoiOverlay : this.calibRoiOverlay;

        // Always hide the overlay for the *other* view
        if (otherOverlayElement) {
            otherOverlayElement.style.display = 'none';
        }

        if (!overlayElement || !targetDisplayElement) {
            console.warn("updateRoiOverlay: Missing overlay or target display element for current view.");
            return;
        }

        // Get the correct state variables based on the view
        const isDrawing = isCalibView ? this.isDrawingCalibRoi : this.isDrawingRoi;
        const pendingRect = isCalibView ? this.pendingCalibRoiRect : this.pendingRoiRect;
        const finalRect = isCalibView ? this.finalCalibRoiRect : this.finalRoiRect;
        const startX = isCalibView ? this.calibRoiStartX : this.roiStartX;
        const startY = isCalibView ? this.calibRoiStartY : this.roiStartY;
        const currentX = isCalibView ? this.currentCalibRoiX : this.currentRoiX;
        const currentY = isCalibView ? this.currentCalibRoiY : this.currentRoiY;

        // Simpler logic: If drawing OR pending OR final, display it. Otherwise hide.
        const shouldDisplay = isDrawing || pendingRect || finalRect;
        if (!shouldDisplay) {
            overlayElement.style.display = 'none';
            return;
        }
        overlayElement.style.display = 'block';


        // Check which rect to use for drawing: Current drag or pending/final
        let rectToDraw;
        if (isDrawing) {
            // Calculate rect based on start and current mouse coords
            rectToDraw = {
                x: Math.min(startX, currentX),
                y: Math.min(startY, currentY),
                width: Math.abs(startX - currentX),
                height: Math.abs(startY - currentY)
            };
             overlayElement.style.opacity = 1; // Solid border while drawing
             overlayElement.style.backgroundColor = 'transparent';
        } else {
            // Use pending or final if not actively drawing
            rectToDraw = pendingRect || finalRect;
            if (!rectToDraw) { // Should not happen if shouldDisplay is true, but safety check
                 overlayElement.style.display = 'none';
                 return;
            }
             // Style based on pending vs final
             if (pendingRect) { // Pending confirmation
                 overlayElement.style.opacity = 1;
                 overlayElement.style.backgroundColor = 'transparent'; // Still like drawing
             } else if (finalRect) { // Confirmed
                 overlayElement.style.opacity = 0.7;
                 overlayElement.style.backgroundColor = 'rgba(255, 255, 0, 0.08)';
                 if (isCalibView) {
                      overlayElement.style.borderColor = 'cyan'; // Example: Cyan border for calib ROI
                      overlayElement.style.backgroundColor = 'rgba(0, 255, 255, 0.08)';
                 } else {
                      overlayElement.style.borderColor = 'yellow'; // Reset focus ROI style
                      overlayElement.style.backgroundColor = 'rgba(255, 255, 0, 0.08)';
                 }
             }
        }

        // --- Calculation based on simulatedImage (Focus ROI) --- 
        const targetRect = targetDisplayElement.getBoundingClientRect();
        const viewElement = targetDisplayElement.closest('.camera-view');
        if (!viewElement) return;
        const viewRect = viewElement.getBoundingClientRect();

        const naturalWidth = targetDisplayElement.naturalWidth || targetRect.width;
        const naturalHeight = targetDisplayElement.naturalHeight || targetRect.height;

         if (targetRect.width === 0 || targetRect.height === 0 || naturalWidth === 0 || naturalHeight === 0) {
            console.warn("updateRoiOverlay: Invalid dimensions for target element or rect.", { targetRect, naturalWidth, naturalHeight });
            overlayElement.style.display = 'none';
            return;
        }

        const scaleX = targetRect.width / naturalWidth;
        const scaleY = targetRect.height / naturalHeight;

        const offsetX = targetRect.left - viewRect.left;
        const offsetY = targetRect.top - viewRect.top;

        const dispL = rectToDraw.x * scaleX;
        const dispT = rectToDraw.y * scaleY;
        const dispW = rectToDraw.width * scaleX;
        const dispH = rectToDraw.height * scaleY;

        // --- Apply to focusRoiOverlay --- 
        overlayElement.style.left = `${offsetX + dispL}px`;
        overlayElement.style.top = `${offsetY + dispT}px`;
        overlayElement.style.width = `${dispW}px`;
        overlayElement.style.height = `${dispH}px`;
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
        this.updateControlStates(true); // Disable other controls
        this.calibrationResultValue.textContent = "计算中...";

        try {
            // 1. Show Checkerboard
            console.log("模拟: 显示标准棋盘格图像");
            this.simulatedImage.style.display = 'none';
            this.calibrationPatternDisplay.innerHTML = this.CHECKERBOARD_SVG;
            this.calibrationPatternDisplay.style.display = 'flex'; // Use flex to center potentially
            await this.wait(this.CALIBRATION_DELAY / 3, 'calibrationProcessId'); // Use a unique process ID ref if needed

            // 2. Simulate Analysis
            console.log("模拟: 捕获图像并分析棋盘格特征...");
            await this.wait(this.CALIBRATION_DELAY / 3, 'calibrationProcessId');
            // In a real scenario, image processing would happen here to find pixel distance
            console.log(`模拟: 检测到特征间距为 ${this.SIMULATED_SQUARE_SIZE_PX} 像素`);

            // 3. Calculate Ratio
            const knownSquareSizeMm = parseFloat(this.calibSquareSizeInput.value);
            if (isNaN(knownSquareSizeMm) || knownSquareSizeMm <= 0) {
                console.error("输入的方格尺寸无效:", this.calibSquareSizeInput.value);
                throw new Error("输入的方格尺寸无效");
            }

            this.calibrationRatio = this.SIMULATED_SQUARE_SIZE_PX / knownSquareSizeMm;
            console.log(`计算当量: ${this.SIMULATED_SQUARE_SIZE_PX} px / ${knownSquareSizeMm} mm = ${this.calibrationRatio.toFixed(2)} pixels/mm`);
            this.calibrationResultValue.textContent = `${this.calibrationRatio.toFixed(2)} pixels/mm`;
            await this.wait(this.CALIBRATION_DELAY / 3, 'calibrationProcessId');

            console.log("--------- 当量计算流程完成 --------- ");

        } catch (error) {
            console.error("当量计算过程中出错:", error);
            this.calibrationResultValue.textContent = `计算失败 (${error.message})`; // Show error message
        } finally {
            // 4. Restore State (Don't automatically switch view back)
            console.log("模拟: 当量计算状态结束");
            this.isCalibrating = false;
            this.footerStatus.textContent = "状态: 已连接"; // Or Idle?
            this.updateControlStates(this.isConnected);
        }
        this.saveState(); // Save state after selecting axis
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
    }

    switchToPatternView() {
        console.log("切换到标定板视图");
        this.simulatedImage.style.display = 'none';
        this.calibrationPatternDisplay.innerHTML = this.CHECKERBOARD_SVG;
        this.calibrationPatternDisplay.style.display = 'flex'; // Use flex to center potentially
        this.toggleViewBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 显示相机视图';
        this.isShowingCalibrationPattern = true;
        // Stop focus ROI drawing if active
        if (this.isInRoiDrawMode) {
           this.cancelFocusRoiDraw();
        }
        this.updateRoiOverlay(); // Hide focus overlay, show calib overlay if exists
        this.updateControlStates(this.isConnected);
    }

    switchToCameraView() {
        console.log("切换到相机视图");
        this.calibrationPatternDisplay.style.display = 'none';
        this.calibrationPatternDisplay.innerHTML = ''; // Clear SVG
        this.simulatedImage.style.display = 'block';
        this.toggleViewBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 显示标定板';
        this.isShowingCalibrationPattern = false;
        // Stop calib ROI drawing if active
        if (this.isInCalibRoiDrawMode) {
            this.cancelCalibRoiDraw();
        }
        this.updateRoiOverlay(); // Hide calib overlay, show focus overlay if exists
        this.updateControlStates(this.isConnected);
    }
    // -------------------------

    // --- Autofocus Logic ---
    async startAutofocus() {
        if (this.isFocusing || !this.isConnected || !this.selectedAxisId) return;

        console.log("--------- 开始自动对焦流程 ---------");
        this.isFocusing = true;
        this.bestZFound = null; // Reset previous best Z
        let bestClarityRough = -1;
        let bestZRough = null;
        this.updateFocusStatus('初始化检查');
        await this.wait(this.INIT_DELAY);

        try {
            this.updateFocusStatus('请求Z轴控制权');
            // Simulate requesting control (no actual action needed here)
            await this.wait(this.CONTROL_REQUEST_DELAY);

            // --- Rough Scan --- //
            this.updateFocusStatus('粗对焦中');
            console.log('粗对焦: 扫描范围', this.Z_RANGE, '步长', this.Z_STEP_ROUGH);
            for (let z = this.Z_RANGE.min; z <= this.Z_RANGE.max; z += this.Z_STEP_ROUGH) {
                if (!this.isFocusing) throw new Error('对焦已手动停止'); // Check for stop signal
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

            // --- Fine Scan --- //
            this.updateFocusStatus('精细对焦中');
            const fineRangeMin = Math.max(this.Z_RANGE.min, bestZRough - this.Z_STEP_ROUGH); // Scan around the rough best
            const fineRangeMax = Math.min(this.Z_RANGE.max, bestZRough + this.Z_STEP_ROUGH);
            let bestClarityFine = -1;
            let bestZFine = null;
            console.log('精细对焦: 扫描范围', { min: fineRangeMin, max: fineRangeMax }, '步长', this.Z_STEP_FINE);
            for (let z = fineRangeMin; z <= fineRangeMax; z += this.Z_STEP_FINE) {
                 // Round z to avoid floating point issues comparing with fineRangeMax
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
            this.bestZFound = bestZFine; // Store final best Z
            console.log(`精细对焦完成: 最佳 Z = ${this.bestZFound?.toFixed(2)}, 清晰度 = ${bestClarityFine.toFixed(3)}`);

            if (this.bestZFound === null) throw new Error('精细对焦未能找到最佳位置');

            // --- Move to Best Z --- //
            this.updateFocusStatus('移动到最佳位置');
            await this.simulateZMovement(this.bestZFound);
            await this.wait(this.CONTROL_REQUEST_DELAY); // Simulate settling time

             // --- Save Parameters (Simulated) --- //
            this.updateFocusStatus('保存参数中');
            this.saveState(); // Save the found bestZ etc.
            await this.wait(this.SAVE_DELAY); 

           this.updateFocusStatus('已对焦');
           console.log("--------- 自动对焦流程成功完成 ---------");

        } catch (error) {
            console.error("自动对焦过程中出错:", error);
            if (this.isFocusing) { // Only show error if not stopped manually
                this.updateFocusStatus('错误');
                alert(`自动对焦失败: ${error.message}`);
            } else {
                this.updateFocusStatus('已停止'); // Ensure status reflects manual stop
            }
        } finally {
            this.isFocusing = false;
            this.focusProcessId = null; // Clear any lingering wait timeouts
            this.updateControlStates(this.isConnected);
        }
    }

    stopAutofocus() {
        if (!this.isFocusing) return;
        console.log("请求停止自动对焦...");
        this.isFocusing = false; // Signal the loop to stop
        if (this.focusProcessId) {
             clearTimeout(this.focusProcessId);
             this.focusProcessId = null;
        }
        // Don't immediately change status here, let the loop catch the flag
        // this.updateFocusStatus('已停止'); // Let the catch block handle final status
        this.updateControlStates(this.isConnected);
        console.log("停止信号已发送。");
    }
    // ---------------------

    // --- 获取并显示轴配置下拉列表 ---
    async fetchAndShowAxisDropdown() {
        if (!this.isConnected) return; // 仅在连接时操作

        if (this.isAxisDropdownVisible) {
            this.hideAxisDropdown();
            return;
        }

        console.log("模拟: 开始获取轴列表...");
        this.axisListUl.innerHTML = '<li class="axis-list-loading">加载中...</li>';
        this.dropdownCameraSN.textContent = `相机: ${this.serialNumberSelect.value}`;
        this.axisDropdown.classList.add('show'); // 显示下拉框（开始动画）
        this.isAxisDropdownVisible = true;

        try {
            // --- 模拟后端/PLC请求 ---
            await this.wait(400, 'axisFetchProcessId'); // 使用不同的 processIdRef
            const availableAxes = [
                { id: 'PLC_Axis_Z1', name: '龙门 Z 轴' },
                { id: 'PLC_Axis_Z2', name: '旋转台 Z 轴' },
                { id: 'PLC_Axis_A1', name: '辅助轴 A' },
                { id: 'SimulatedZ', name: '模拟 Z 轴' },
            ];
            // const availableAxes = []; // 测试空列表
            console.log("模拟: 获取到轴列表:", availableAxes);
            // ------------------------

            this.axisListUl.innerHTML = ''; // 清空加载提示

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
            // 如果 wait 被中断 (例如隐藏下拉框)
            if (error.message.includes('Stopped during wait')) {
                 console.log("模拟: 轴列表获取被取消。");
                 // 不需要显示错误，因为是用户主动隐藏
            } else {
                 console.error("模拟: 获取轴列表时出错:", error);
                 this.axisListUl.innerHTML = '<li class="axis-list-error">加载轴列表失败</li>';
            }
        }
    }

    // --- 隐藏轴配置下拉列表 ---
    hideAxisDropdown() {
        if (this.axisFetchProcessId) { // 如果正在获取，取消它
             clearTimeout(this.axisFetchProcessId);
             this.axisFetchProcessId = null;
        }
        this.axisDropdown.classList.remove('show');
        this.isAxisDropdownVisible = false;
         // 可以加一个短暂延迟后清空内容，以配合动画效果
         // setTimeout(() => { this.axisListUl.innerHTML = ''; }, 200);
    }

    // --- 选择一个轴 ---
    selectAxis(axisId) {
        console.log(`选择了轴: ${axisId}`);
        this.selectedAxisId = axisId;
        this.updateConfigAxisButtonDisplay(axisId); // 更新按钮显示
        this.hideAxisDropdown();
        this.updateControlStates(this.isConnected); // 更新依赖轴选择的控件状态（例如对焦按钮）
        // --- 模拟保存到后端/本地 ---
        this.saveState(); // 保存状态
        console.log("模拟: 已将选定的轴保存到状态。");
        // ---------------------------
    }

    // --- Clear Axis Configuration ---
    async clearAxisConfig() {
        console.log("清空轴配置...");
        const oldAxisId = this.selectedAxisId;
        this.selectedAxisId = null;
        this.updateConfigAxisButtonDisplay(null); // Update button text/title
        this.updateControlStates(this.isConnected); // Update button disables

        // --- SIMULATE SAVING TO BACKEND --- 
        // (Optional: Add a backend call to clear the saved config)
        try {
            console.log(`模拟: 通知后端清空轴配置 (相机: ${this.serialNumberSelect.value}, 原轴ID: ${oldAxisId})`);
            // Example: fetch(`${this.backendUrl}/clear_axis_config`, { method: 'POST', ... });
            // We'll just log for now
            // const response = await fetch(...); etc.
             alert("模拟: 轴配置已清空");
        } catch (error) {
            console.error("模拟: 清空轴配置时后端通信出错:", error);
            // Should we revert frontend state if backend fails?
            // this.selectedAxisId = oldAxisId; // Revert
            // this.updateConfigAxisButtonDisplay(oldAxisId);
            // this.updateControlStates(this.isConnected);
            alert("模拟: 清空轴配置时发生错误");
        }
        // ---------------------------------
        this.saveState(); // Save state after clearing axis
    }

    // --- Save and Load State using localStorage ---
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

                // Restore values, checking if they exist in the saved object
                if (savedState.hasOwnProperty('selectedAxisId')) {
                    this.selectedAxisId = savedState.selectedAxisId;
                    this.updateConfigAxisButtonDisplay(this.selectedAxisId); // Update UI
                }
                if (savedState.hasOwnProperty('bestZFound')) {
                    this.bestZFound = savedState.bestZFound;
                    // Update relevant UI if needed, e.g., display last best focus Z
                    // if (this.bestZFound !== null) { ... }
                }
                if (savedState.hasOwnProperty('calibrationRatio')) {
                    this.calibrationRatio = savedState.calibrationRatio;
                    if (this.calibrationRatio !== null && this.calibrationResultValue) {
                        this.calibrationResultValue.textContent = `${this.calibrationRatio.toFixed(2)} pixels/mm`;
                    }
                }
                this.updateControlStates(this.isConnected); // Update button states based on loaded axis
            } else {
                console.log(`未找到相机 ${cameraSN} 的已保存状态。`);
            }
        } catch (e) {
            console.error("从 localStorage 加载状态时出错:", e);
        }
    }
    // ---------------------------------------------

    // --- 更新配置轴按钮的显示 ---
    updateConfigAxisButtonDisplay(axisId) {
        if (this.configAxisBtn) {
            if (axisId) {
                // 如果有选中的轴ID，显示ID并更新标题
                this.configAxisBtn.textContent = `轴: ${axisId}`;
                this.configAxisBtn.title = `当前选择的Z轴: ${axisId} - 点击修改`;
            } else {
                // 如果没有选中的轴ID，显示默认文本
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
            // --- Replace with actual backend call --- 
            // const response = await fetch(`${this.backendUrl}/api/cameras`);
            // if (!response.ok) throw new Error(`HTTP ${response.status}`);
            // const cameraList = await response.json();

            // --- Simulation --- 
            await this.wait(300); // Simulate network delay
            const cameraList = ['SN_Sim_1', 'SN_Sim_2', 'SN_Backend_123', 'SN_Backend_456']; // Example list
            // const cameraList = []; // Test empty list
            console.log("模拟: 获取到相机列表:", cameraList);
            // -------------------

            this.serialNumberSelect.innerHTML = ''; // Clear loading message

            if (cameraList && cameraList.length > 0) {
                this.serialNumberSelect.appendChild(new Option('请选择相机...', ''));
                cameraList.forEach(sn => {
                    this.serialNumberSelect.appendChild(new Option(sn, sn));
                });
                this.serialNumberSelect.disabled = false; // Enable dropdown
            } else {
                this.serialNumberSelect.appendChild(new Option('未找到相机', ''));
                this.serialNumberSelect.disabled = true; // Keep disabled
            }

        } catch (error) {
            console.error("获取可用相机列表失败:", error);
            this.serialNumberSelect.innerHTML = '<option value="">加载失败</option>';
            this.serialNumberSelect.disabled = true;
        } finally {
            // Connect button state depends on selection, handled by change listener and updateControlStates
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
        return 'TL'; // Default fallback
    }

    // --- Calibration ROI Logic ---
    enableCalibRoi() {
        if (this.enableCalibRoiBtn.disabled || !this.isConnected || !this.isShowingCalibrationPattern) return;
        console.log('启用校准 ROI 绘制模式');
        this.isInCalibRoiDrawMode = true;
        if (this.calibrationPatternDisplay) {
             this.calibrationPatternDisplay.style.cursor = 'crosshair';
            // Dynamically add the listener ONLY when draw mode starts
            this.boundHandleCalibRoiMouseDown = this.handleCalibRoiMouseDown.bind(this);
            this.calibrationPatternDisplay.addEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
        }
        this.updateControlStates(this.isConnected);
    }

    handleCalibRoiMouseDown(event) {
        if (!this.isInCalibRoiDrawMode || this.isDrawingCalibRoi) return;
        event.preventDefault();
        console.log("Calibration ROI Mouse Down - Start Drawing");
        this.isDrawingCalibRoi = true;
        const coords = this.getImageCoordinates(event, this.calibrationPatternDisplay);
        this.calibRoiStartX = coords.x;
        this.calibRoiStartY = coords.y;
        this.currentCalibRoiX = coords.x;
        this.currentCalibRoiY = coords.y;
        this.updateRoiOverlay();

        this.boundHandleCalibRoiMouseMove = this.handleCalibRoiMouseMove.bind(this);
        this.boundHandleCalibRoiMouseUp = this.handleCalibRoiMouseUp.bind(this);
        window.addEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
        window.addEventListener('mouseup', this.boundHandleCalibRoiMouseUp);
    }

    handleCalibRoiMouseMove(event) {
        if (!this.isDrawingCalibRoi) return;
        const coords = this.getImageCoordinates(event, this.calibrationPatternDisplay);
        this.currentCalibRoiX = coords.x;
        this.currentCalibRoiY = coords.y;
        this.updateRoiOverlay();
    }

    handleCalibRoiMouseUp(event) {
        if (!this.isDrawingCalibRoi) return;
        console.log("Calibration ROI Mouse Up");

        this.isDrawingCalibRoi = false;
        this.isInCalibRoiDrawMode = false;
        if (this.calibrationPatternDisplay && this.boundHandleCalibRoiMouseDown) {
            this.calibrationPatternDisplay.removeEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
            this.calibrationPatternDisplay.style.cursor = 'default';
        }

        window.removeEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
        window.removeEventListener('mouseup', this.boundHandleCalibRoiMouseUp);

        const finalCoords = this.getImageCoordinates(event, this.calibrationPatternDisplay);
        this.currentCalibRoiX = finalCoords.x;
        this.currentCalibRoiY = finalCoords.y;

        this.updateRoiOverlay(); // Update final box before calc

        const x = Math.min(this.calibRoiStartX, this.currentCalibRoiX);
        const y = Math.min(this.calibRoiStartY, this.currentCalibRoiY);
        const width = Math.abs(this.calibRoiStartX - this.currentCalibRoiX);
        const height = Math.abs(this.calibRoiStartY - this.currentCalibRoiY);

        if (width > 5 && height > 5) {
            this.pendingCalibRoiRect = { x, y, width, height };
            console.log('Calibration ROI 绘制完成，等待确认:', this.pendingCalibRoiRect);
        } else {
            if(this.calibRoiOverlay) this.calibRoiOverlay.style.display = 'none';
            console.log('Calibration ROI 绘制尺寸过小，未设置');
        }
        this.updateControlStates(this.isConnected);
    }

     confirmCalibRoi() {
        if (this.pendingCalibRoiRect) {
            this.finalCalibRoiRect = this.pendingCalibRoiRect;
            this.pendingCalibRoiRect = null;
            console.log('校准 ROI 已确认:', this.finalCalibRoiRect);
            if (this.calibrationPatternDisplay) this.calibrationPatternDisplay.style.cursor = 'default';
            if (this.enableCalibRoiBtn) this.enableCalibRoiBtn.style.display = 'none'; // Hide enable button
            this.updateControlStates(this.isConnected);
            this.updateRoiOverlay(); // Update overlay style
        }
    }

    redrawCalibRoi() {
        this.pendingCalibRoiRect = null;
        this.finalCalibRoiRect = null;
        this.isInCalibRoiDrawMode = false;
        if (this.calibRoiOverlay) this.calibRoiOverlay.style.display = 'none';
        if (this.calibrationPatternDisplay) {
            this.calibrationPatternDisplay.style.cursor = 'default';
             if (this.boundHandleCalibRoiMouseDown) {
                this.calibrationPatternDisplay.removeEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
            }
        }
        console.log('请求重新绘制校准 ROI');
        if (this.enableCalibRoiBtn) this.enableCalibRoiBtn.style.display = 'inline-block';
        this.updateControlStates(this.isConnected);
    }

    // Helper to cancel drawing if view switches
    cancelFocusRoiDraw() {
        if (!this.isInRoiDrawMode && !this.isDrawingRoi) return;
         console.log("取消对焦 ROI 绘制");
         this.isDrawingRoi = false;
         this.isInRoiDrawMode = false;
         if (this.simulatedImage && this.boundHandleRoiMouseDown) {
             this.simulatedImage.removeEventListener('mousedown', this.boundHandleRoiMouseDown);
             this.simulatedImage.style.cursor = 'default';
         }
         window.removeEventListener('mousemove', this.boundHandleRoiMouseMove);
         window.removeEventListener('mouseup', this.boundHandleRoiMouseUp);
         this.pendingRoiRect = null; // Discard pending rect if cancelled mid-draw
         this.updateRoiOverlay();
         this.updateControlStates(this.isConnected);
    }

    cancelCalibRoiDraw() {
        if (!this.isInCalibRoiDrawMode && !this.isDrawingCalibRoi) return;
         console.log("取消校准 ROI 绘制");
         this.isDrawingCalibRoi = false;
         this.isInCalibRoiDrawMode = false;
         if (this.calibrationPatternDisplay && this.boundHandleCalibRoiMouseDown) {
             this.calibrationPatternDisplay.removeEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
             this.calibrationPatternDisplay.style.cursor = 'default';
         }
         window.removeEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
         window.removeEventListener('mouseup', this.boundHandleCalibRoiMouseUp);
         this.pendingCalibRoiRect = null; // Discard pending rect if cancelled mid-draw
         this.updateRoiOverlay();
         this.updateControlStates(this.isConnected);
    }

   // --- End Calibration ROI Logic ---
} // End Class

// Initialize the controller
document.addEventListener('DOMContentLoaded', () => {
    new CameraController();
});