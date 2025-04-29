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

        // --- Focus ROI Button States --- (Remove style.display from here) ---
        const isFocusRoiPending = connected && this.focusRoiState === 'drawn'; // Check state instead of pendingRoiRect
        const hasFocusRoiConfirmed = connected && this.focusRoiState === 'confirmed'; // Check state instead of finalRoiRect
        const canDrawRoi = isIdle && this.focusRoiState === 'idle'; // Only allow drawing from idle state

        // Initial Draw Button (Below Heading)
        if (this.drawRoiFocusBtn) {
            this.drawRoiFocusBtn.disabled = !canDrawRoi || this.isCalibrating; // Disable if not idle/connected or calibrating
            // this.drawRoiFocusBtn.style.display = (this.focusRoiState === 'idle') ? 'inline-block' : 'none'; // Let updateRoiControlsUI handle display
        }

        // Button Group (Confirm/Redraw/Toggle/Clear in Header Line)
        // Let updateRoiControlsUI handle the group's display based on state.
        // Focus on disabling individual buttons based on logic here.
        const canInteractWithRoi = isIdle && !this.isCalibrating; // General condition for ROI actions

        if (this.confirmFocusRoiBtn) {
            this.confirmFocusRoiBtn.disabled = !isFocusRoiPending || !canInteractWithRoi;
            // this.confirmFocusRoiBtn.style.display = isFocusRoiPending ? 'inline-block' : 'none'; // Remove display logic
        }
        if (this.redrawFocusRoiBtn) {
            const canRedraw = (isFocusRoiPending || hasFocusRoiConfirmed) && canInteractWithRoi;
            this.redrawFocusRoiBtn.disabled = !canRedraw;
            // this.redrawFocusRoiBtn.style.display = (isFocusRoiPending || hasFocusRoiConfirmed) ? 'inline-block' : 'none'; // Remove display logic
        }
        if (this.clearFocusRoiBtn) { // Add logic for clear button
            const canClear = (isFocusRoiPending || hasFocusRoiConfirmed) && canInteractWithRoi;
            this.clearFocusRoiBtn.disabled = !canClear;
            // Display logic handled by updateRoiControlsUI
        }
        if (this.toggleFocusRoiVisibilityBtn) {
            this.toggleFocusRoiVisibilityBtn.disabled = !hasFocusRoiConfirmed; // Only disable based on confirmed state
             // Display logic handled by updateRoiControlsUI
            // Icon/Title update remains relevant here or could move to updateRoiControlsUI
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
        // --------------------------------------------------

        // --- Calibration ROI Button States --- (Keep this logic as is for now) ---
        const isCalibRoiPending = connected && this.pendingCalibRoiRect;
        const hasCalibRoiConfirmed = connected && this.finalCalibRoiRect;
        const canEnableCalibRoi = isIdle && this.isShowingCalibrationPattern && !this.isInCalibRoiDrawMode && !hasCalibRoiConfirmed && !isCalibRoiPending;

        // Initial Enable/Draw Button (Below Heading)
        if (this.drawCalibRoiBtn) {
            this.drawCalibRoiBtn.disabled = !canEnableCalibRoi;
            // Show only on calib view when no ROI exists
            this.drawCalibRoiBtn.style.display = (this.isShowingCalibrationPattern && !isCalibRoiPending && !hasCalibRoiConfirmed) ? 'inline-block' : 'none';
            if(this.isInCalibRoiDrawMode) this.drawCalibRoiBtn.disabled = true; // Disable while drawing
        }

        // Button Group (Confirm/Redraw/Toggle in Header Line)
        const calibRoiGroup = this.confirmCalibRoiBtn?.closest('.roi-button-group');
         if (calibRoiGroup) {
             calibRoiGroup.style.display = (isCalibRoiPending || hasCalibRoiConfirmed) ? 'flex' : 'none';
             // Individual buttons inside the group
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
        // ----------------------------------------------------------

        // Table controls
        document.querySelectorAll('#property-table input, #property-table select').forEach(ctrl => {
             ctrl.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;
         });

        // Config Axis Button
        if (this.configAxisBtn) this.configAxisBtn.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;

        // Axis Config Buttons
        if (this.clearAxisBtn) this.clearAxisBtn.disabled = !connected || !this.selectedAxisId || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating; // Enable only if axis is selected and idle

        // --- Focus ROI Visibility Toggle Button State (Remove redundant block) ---
        /* Remove this entire block as it's handled above
        if (this.toggleFocusRoiVisibilityBtn) {
            this.toggleFocusRoiVisibilityBtn.disabled = !hasFocusRoiConfirmed;
            this.toggleFocusRoiVisibilityBtn.style.display = hasFocusRoiConfirmed ? 'inline-block' : 'none'; // Show only when confirmed
            this.toggleFocusRoiVisibilityBtn.innerHTML = this.isFocusRoiVisible ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            this.toggleFocusRoiVisibilityBtn.title = this.isFocusRoiVisible ? '隐藏对焦ROI' : '显示对焦ROI';
        }
        */
        // --- Calibration ROI Visibility Toggle Button State ---
        if (this.toggleCalibRoiVisibilityBtn) {
            this.toggleCalibRoiVisibilityBtn.disabled = !hasCalibRoiConfirmed;
            this.toggleCalibRoiVisibilityBtn.style.display = hasCalibRoiConfirmed ? 'inline-block' : 'none'; // Show only when confirmed
            this.toggleCalibRoiVisibilityBtn.innerHTML = this.isCalibRoiVisible ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            this.toggleCalibRoiVisibilityBtn.title = this.isCalibRoiVisible ? '隐藏校准ROI' : '显示校准ROI';
        }
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

        // --- Focus ROI Listeners ---
        // Ensure elements exist before adding listeners
        this.simulatedImage?.addEventListener('mousedown', this.handleRoiMouseDown.bind(this));
        // Note: mousemove and mouseup are often better on document to catch mouse leaving the image
        document.addEventListener('mousemove', this.handleRoiMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleRoiMouseUp.bind(this));

        this.drawRoiFocusBtn?.addEventListener('click', () => {
            console.log("点击绘制对焦 ROI 按钮");
            this.startFocusRoiDraw(); // Call dedicated function
        });

        this.confirmFocusRoiBtn?.addEventListener('click', this.confirmFocusRoi.bind(this));
        this.redrawFocusRoiBtn?.addEventListener('click', () => {
             console.log("点击重绘对焦 ROI 按钮");
             this.startFocusRoiDraw(true); // Call with redraw flag
        });
        this.clearFocusRoiBtn?.addEventListener('click', this.clearFocusRoi.bind(this));
        this.toggleFocusRoiVisibilityBtn?.addEventListener('click', this.toggleFocusRoiVisibility.bind(this));

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
        this.drawCalibRoiBtn?.addEventListener('click', () => this.enableCalibRoi()); // Renamed button
        this.confirmCalibRoiBtn?.addEventListener('click', () => this.confirmCalibRoi());
        this.redrawCalibRoiBtn?.addEventListener('click', () => this.redrawCalibRoi());
        // Mouse listeners for drawing calib ROI will be added dynamically

        // --- ROI Visibility Toggle Listeners ---
        this.toggleCalibRoiVisibilityBtn?.addEventListener('click', () => {
            if(this.toggleCalibRoiVisibilityBtn.disabled) return;
            this.isCalibRoiVisible = !this.isCalibRoiVisible;
             console.log(`校准 ROI 可见性切换为: ${this.isCalibRoiVisible}`);
            // this.updateRoiOverlay(); // TODO: Need updateCalibRoiOverlay or similar
            this.updateCalibRoiControlsUI(); // Update button icon/title
        });
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
        // Only handle if focus ROI is active AND we are in camera view
        if (this.focusRoiState !== 'drawing' || this.isShowingCalibrationPattern) return;

        const imageRect = this.simulatedImage?.getBoundingClientRect();
        if (!imageRect || event.clientX < imageRect.left || event.clientX > imageRect.right || event.clientY < imageRect.top || event.clientY > imageRect.bottom) {
            return; // Click outside image
        }
        event.preventDefault(); // Prevent image drag

        this.isDrawingRoi = true; // This flag is now only for focus ROI
        const coords = this.getImageCoordinates(event, this.simulatedImage);
        if (!coords) {
            this.isDrawingRoi = false;
            return;
        }
        this.roiStartX = coords.x;
        this.roiStartY = coords.y;
        // Update the correct state object
        this.pendingRoiRect = { x: this.roiStartX, y: this.roiStartY, width: 0, height: 0 };
        // Call the correct update function
        this.updateRoiOverlay();
        console.log("Focus ROI Mouse Down - Start Drawing");
    }

    handleRoiMouseMove(event) {
        // Check if drawing FOCUS ROI
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
        this.updateRoiOverlay(); // Update Focus overlay
    }

    handleRoiMouseUp(event) {
         // Check if drawing FOCUS ROI
        if (!this.isDrawingRoi || this.focusRoiState !== 'drawing' || this.isShowingCalibrationPattern) return;

        this.isDrawingRoi = false; // End focus drawing session

        // Check the pending focus ROI
        if (this.pendingRoiRect && (this.pendingRoiRect.width < 5 || this.pendingRoiRect.height < 5)) {
            console.log("Focus ROI too small, canceling draw.");
            this.focusRoiState = 'idle'; // Go back to idle directly
            this.pendingRoiRect = null;
        } else if (this.pendingRoiRect) {
            this.focusRoiState = 'drawn'; // Focus ROI drawn, waiting confirmation
            console.log("Focus ROI 绘制完成，等待确认:", this.pendingRoiRect);
        } else {
            console.log("Focus ROI mouse up without drawing.");
            this.focusRoiState = 'idle'; // Nothing drawn, back to idle
            this.pendingRoiRect = null;
        }

        if (this.simulatedImage) {
            this.simulatedImage.style.cursor = 'default';
        }
        this.updateRoiControlsUI();
        this.updateRoiOverlay(); // Ensure focus overlay updates based on final pending state
        console.log("Focus ROI Mouse Up");
    }

    // --- Initial Setup ---
    initUI() {
        this.updateUI(); // Basic UI updates
        this.updateFocusStatus('未连接');
        this.updateControlStates(false); // Disable controls initially
        this.fetchAvailableCameras();

        // Initial image dimensions update
        if (this.simulatedImage) {
            this.simulatedImage.onload = () => {
                if(this.statusBarImageDims) this.statusBarImageDims.textContent = `${this.simulatedImage.naturalWidth}, ${this.simulatedImage.naturalHeight}`;
                // Update overlays in case image loaded after initial UI setup
                 this.updateRoiOverlay();
                 this.updateCalibRoiOverlay(); // Also update calib overlay
            };
             // If image already loaded (cached)
            if (this.simulatedImage.complete && this.simulatedImage.naturalWidth > 0) {
                 if(this.statusBarImageDims) this.statusBarImageDims.textContent = `${this.simulatedImage.naturalWidth}, ${this.simulatedImage.naturalHeight}`;
            }
        }


        this.updateRoiOverlay(); // Initialize focus overlay state
        this.updateCalibRoiOverlay(); // Initialize calib overlay state
        this.updateRoiControlsUI(); // Initialize ROI button visibility
        this.updateCalibRoiControlsUI(); // Initialize Calib ROI buttons
        // Load state *after* UI elements are referenced and initial UI is set
        this.loadState();
        // Apply loaded state to overlays
        this.updateRoiOverlay();
        this.updateCalibRoiOverlay();
    }

    // --- Helper for coordinate calculation relative to a target element ---
    getImageCoordinates(event, targetElement) {
        if (!targetElement) {
            console.error("getImageCoordinates: targetElement is missing!");
            return { x: 0, y: 0 };
        }

        const rect = targetElement.getBoundingClientRect();

        // Determine the 'natural' dimensions. Use rect dimensions for SVG.
        const isSvgElement = targetElement.tagName?.toLowerCase() === 'svg' || targetElement === this.calibrationPatternDisplay;
        const naturalWidth = isSvgElement ? rect.width : targetElement.naturalWidth;
        const naturalHeight = isSvgElement ? rect.height : targetElement.naturalHeight;

        if (rect.width === 0 || rect.height === 0 || naturalWidth === 0 || naturalHeight === 0) {
            console.warn("getImageCoordinates: Invalid dimensions for target element or rect.", { rect, naturalWidth, naturalHeight });
            // Return null or a specific indicator of failure? Returning 0,0 might be misleading.
            // Let's return null to indicate failure.
            return null;
            // return { x: 0, y: 0 }; // Previous behavior
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

        // Clamp coordinates to the calculated natural dimensions
        const clampedX = Math.max(0, Math.min(x, naturalWidth));
        const clampedY = Math.max(0, Math.min(y, naturalHeight));

        return { x: clampedX, y: clampedY };
    }

    updateRoiOverlay() { // Updates ONLY the FOCUS ROI overlay
        if (!this.focusRoiOverlay || !this.simulatedImage || !this.simulatedImage.parentElement || this.isShowingCalibrationPattern) {
             console.warn("[updateRoiOverlay] Hiding focus overlay (missing elements or in calibration view).");
             if(this.focusRoiOverlay) this.focusRoiOverlay.style.display = 'none';
             return;
        }

        let rectToDraw = null;
        let isVisible = false;

        // Determine rect and visibility based on focus ROI state
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
         console.log(`[updateRoiOverlay] Focus State: ${this.focusRoiState}, isVisibleByUser: ${this.isFocusRoiVisible}, isDrawingRoi: ${this.isDrawingRoi}, rectToDraw:`, rectToDraw);

        if (rectToDraw && isVisible) {
            const overlay = this.focusRoiOverlay;
            const image = this.simulatedImage; // Target is always the image for focus ROI
            const imageRect = image.getBoundingClientRect();
            const container = image.parentElement; // #camera-display-container
            const containerRect = container.getBoundingClientRect();
            const naturalWidth = image.naturalWidth;
            const naturalHeight = image.naturalHeight;

            if (imageRect.width > 0 && imageRect.height > 0 && naturalWidth > 0 && naturalHeight > 0) {
                // Scaling factors
                const scaleX = imageRect.width / naturalWidth;
                const scaleY = imageRect.height / naturalHeight;

                const displayX = (imageRect.left - containerRect.left) + (rectToDraw.x * scaleX);
                const displayY = (imageRect.top - containerRect.top) + (rectToDraw.y * scaleY);
                const displayW = rectToDraw.width * scaleX;
                const displayH = rectToDraw.height * scaleY;

                console.log(`[updateRoiOverlay] Focus Calculated Pos: L=${displayX.toFixed(1)}, T=${displayY.toFixed(1)}, W=${displayW.toFixed(1)}, H=${displayH.toFixed(1)}`);

                overlay.style.left = `${displayX}px`;
                overlay.style.top = `${displayY}px`;
                overlay.style.width = `${displayW}px`;
                overlay.style.height = `${displayH}px`;
                overlay.style.opacity = '1';
                overlay.style.display = 'block';
            } else {
                 console.warn("[updateRoiOverlay] Hiding focus overlay due to invalid image/natural dimensions.");
                overlay.style.display = 'none';
            }
        } else {
             console.log("[updateRoiOverlay] Hiding focus overlay.");
            this.focusRoiOverlay.style.display = 'none';
            this.focusRoiOverlay.style.opacity = '0';
        }
    }

     // --- New function to update Calibration ROI Overlay ---
     updateCalibRoiOverlay() {
         // First, check for essential missing elements
         if (!this.calibRoiOverlay || !this.calibrationPatternDisplay || !this.calibrationPatternDisplay.parentElement) {
             console.warn("[updateCalibRoiOverlay] Hiding calibration overlay due to missing required HTML elements (calibRoiOverlay or calibrationPatternDisplay or its parent).");
             if(this.calibRoiOverlay) this.calibRoiOverlay.style.display = 'none'; // Try to hide if it exists
             return;
         }

         // If elements exist, check if we are in the correct view
         if (!this.isShowingCalibrationPattern) {
              // console.log("[updateCalibRoiOverlay] Not in calibration view, hiding overlay."); // Optional: change to log instead of warn
              this.calibRoiOverlay.style.display = 'none';
              return;
         }

         // --- If we reach here, elements exist AND we are in calibration view ---

         let rectToDraw = null;
         let isVisible = false;

         // Determine rect and visibility based on calibration ROI state
         if (this.finalCalibRoiRect && this.isCalibRoiVisible) { // Only show confirmed for now unless drawing
             rectToDraw = this.finalCalibRoiRect;
             isVisible = true;
         } else if (this.pendingCalibRoiRect) { // Show pending if it exists (drawing or drawn)
             rectToDraw = this.pendingCalibRoiRect;
             isVisible = true;
         }
         console.log(`[updateCalibRoiOverlay] Calib State: final=${!!this.finalCalibRoiRect}, pending=${!!this.pendingCalibRoiRect}, isVisibleByUser: ${this.isCalibRoiVisible}, isDrawingCalib: ${this.isDrawingCalibRoi}, rectToDraw:`, rectToDraw);


         if (rectToDraw && isVisible) {
             const overlay = this.calibRoiOverlay;
             const patternDisplay = this.calibrationPatternDisplay; // Target is the pattern display
             const patternRect = patternDisplay.getBoundingClientRect();
             const container = patternDisplay.parentElement; // #camera-display-container
             const containerRect = container.getBoundingClientRect();

             // Use rect dimensions for SVG pattern display
             const naturalWidth = patternRect.width;
             const naturalHeight = patternRect.height;

             if (patternRect.width > 0 && patternRect.height > 0) {
                 // Scaling factors (relative to bounding rect, so should be 1 if not scaled within container)
                 const scaleX = 1; // naturalWidth / patternRect.width;
                 const scaleY = 1; // naturalHeight / patternRect.height;

                 // Calculate position relative to the container
                 // Coords in rectToDraw are relative to the patternDisplay's coordinate system (0,0 top-left)
                 const displayX = (patternRect.left - containerRect.left) + (rectToDraw.x * scaleX);
                 const displayY = (patternRect.top - containerRect.top) + (rectToDraw.y * scaleY);
                 const displayW = rectToDraw.width * scaleX;
                 const displayH = rectToDraw.height * scaleY;

                 console.log(`[updateCalibRoiOverlay] Calib Calculated Pos: L=${displayX.toFixed(1)}, T=${displayY.toFixed(1)}, W=${displayW.toFixed(1)}, H=${displayH.toFixed(1)}`);

                 overlay.style.left = `${displayX}px`;
                 overlay.style.top = `${displayY}px`;
                 overlay.style.width = `${displayW}px`;
                 overlay.style.height = `${displayH}px`;
                 overlay.style.opacity = '1'; // Make sure it's visible
                 overlay.style.display = 'block';

             } else {
                  console.warn("[updateCalibRoiOverlay] Hiding calib overlay due to invalid pattern display dimensions.");
                 overlay.style.display = 'none';
             }
         } else {
              // console.log("[updateCalibRoiOverlay] Hiding calib overlay (no rect to draw or not visible)."); // Optional: change to log
             this.calibRoiOverlay.style.display = 'none';
             this.calibRoiOverlay.style.opacity = '0'; // Ensure opacity reset
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
        this.updateControlStates(true); // Disable other controls
        this.calibrationResultValue.textContent = "计算中...";
        if (!this.isShowingCalibrationPattern) {
            this.switchToPatternView(); // Ensure pattern is visible
        }


        try {
            // 1. Show Checkerboard (already done by switchToPatternView if needed)
            console.log("模拟: (已显示标准棋盘格图像)");
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
            this.calibrationResultValue.textContent = `${this.calibrationRatio.toFixed(2)} px/mm`; // Corrected unit display
            await this.wait(this.CALIBRATION_DELAY / 3, 'calibrationProcessId');

            console.log("--------- 当量计算流程完成 --------- ");

        } catch (error) {
            console.error("当量计算过程中出错:", error);
            this.calibrationResultValue.textContent = `计算失败`; // (${error.message}) - Keep it short
        } finally {
            // 4. Restore State (Don't automatically switch view back)
            console.log("模拟: 当量计算状态结束");
            this.isCalibrating = false;
            this.footerStatus.textContent = this.isConnected ? "状态: 已连接" : "状态: 未连接"; // Reflect current connection
            this.updateControlStates(this.isConnected);
            // Keep the pattern view active after calculation
        }
        this.saveState(); // Save state after calculation (includes calibrationRatio)
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
        // Update both overlays after switching views
        this.updateRoiOverlay();
        this.updateCalibRoiOverlay();
    }

    switchToPatternView() {
        console.log("切换到标定板视图");
        this.simulatedImage.style.display = 'none';
        this.calibrationPatternDisplay.innerHTML = this.CHECKERBOARD_SVG;
        this.calibrationPatternDisplay.style.display = 'flex'; // Use flex to center potentially
        this.toggleViewBtn.innerHTML = '<i class="fas fa-camera"></i> 显示相机视图'; // Changed icon
        this.isShowingCalibrationPattern = true;
        // Stop focus ROI drawing if active
        if (this.focusRoiState === 'drawing') {
           this.cancelFocusRoiDraw(); // Make sure this function exists and works
        }
        this.updateRoiOverlay(); // Hide focus overlay
        this.updateCalibRoiOverlay(); // Show calib overlay if exists
        this.updateControlStates(this.isConnected);
        this.updateCalibRoiControlsUI(); // Explicitly update calib controls
    }

    switchToCameraView() {
        console.log("切换到相机视图");
        this.calibrationPatternDisplay.style.display = 'none';
        this.calibrationPatternDisplay.innerHTML = ''; // Clear SVG
        this.simulatedImage.style.display = 'block';
        this.toggleViewBtn.innerHTML = '<i class="fas sync-alt"></i> 显示标定板'; // Changed icon back
        this.isShowingCalibrationPattern = false;
        // Stop calib ROI drawing if active
        if (this.isInCalibRoiDrawMode) { // Check the correct flag
            this.cancelCalibRoiDraw(); // Make sure this function exists and works
        }
        this.updateCalibRoiOverlay(); // Hide calib overlay
        this.updateRoiOverlay(); // Show focus overlay if exists
        this.updateControlStates(this.isConnected);
        this.updateCalibRoiControlsUI(); // Explicitly update calib controls
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
        // Check if button is disabled OR not connected OR not in pattern view
        if (this.drawCalibRoiBtn.disabled || !this.isConnected || !this.isShowingCalibrationPattern) return;

        console.log('启用校准 ROI 绘制模式');
        this.isInCalibRoiDrawMode = true; // Flag specifically for calib draw mode
        this.pendingCalibRoiRect = null; // Clear any previous pending rect
        this.isDrawingCalibRoi = false; // Reset internal flag

        if (this.calibrationPatternDisplay) {
             this.calibrationPatternDisplay.style.cursor = 'crosshair';
            // Dynamically add the listener ONLY when draw mode starts
            // Ensure we don't add multiple listeners
            if (!this.boundHandleCalibRoiMouseDown) {
                 this.boundHandleCalibRoiMouseDown = this.handleCalibRoiMouseDown.bind(this);
                 this.calibrationPatternDisplay.addEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
            }
        }
        this.updateCalibRoiControlsUI(); // Update buttons state
    }

    handleCalibRoiMouseDown(event) {
        // Only handle if in calib draw mode AND on the pattern display
        if (!this.isInCalibRoiDrawMode || this.isDrawingCalibRoi || !this.isShowingCalibrationPattern) return;

        event.preventDefault();
        console.log("Calibration ROI Mouse Down - Start Drawing");
        this.isDrawingCalibRoi = true; // Start calib drawing session
        const coords = this.getImageCoordinates(event, this.calibrationPatternDisplay);
         if (!coords) { // Check if coordinate calculation failed
             this.isDrawingCalibRoi = false; // Abort drawing
             console.error("Calibration ROI Mouse Down - Failed to get coordinates.");
             return;
         }
        this.calibRoiStartX = coords.x;
        this.calibRoiStartY = coords.y;
        // Initialize pending rect for calib
        this.pendingCalibRoiRect = { x: this.calibRoiStartX, y: this.calibRoiStartY, width: 0, height: 0 };
        this.updateCalibRoiOverlay(); // Show initial dot

        // Attach move/up listeners to window/document for better capture
         this.boundHandleCalibRoiMouseMove = this.handleCalibRoiMouseMove.bind(this);
         this.boundHandleCalibRoiMouseUp = this.handleCalibRoiMouseUp.bind(this);
         window.addEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
         window.addEventListener('mouseup', this.boundHandleCalibRoiMouseUp);
    }

    handleCalibRoiMouseMove(event) {
        if (!this.isDrawingCalibRoi || !this.isInCalibRoiDrawMode || !this.isShowingCalibrationPattern) return; // Check drawing CALIB ROI

        const coords = this.getImageCoordinates(event, this.calibrationPatternDisplay);
        if (!coords) return; // Ignore if coords are invalid
        this.currentCalibRoiX = coords.x;
        this.currentCalibRoiY = coords.y;

        const x = Math.min(this.calibRoiStartX, this.currentCalibRoiX);
        const y = Math.min(this.calibRoiStartY, this.currentCalibRoiY);
        const width = Math.abs(this.currentCalibRoiX - this.calibRoiStartX);
        const height = Math.abs(this.currentCalibRoiY - this.calibRoiStartY);

        // Update pending calib rect
        this.pendingCalibRoiRect = { x, y, width, height };
        this.updateCalibRoiOverlay(); // Update calib overlay visual
    }

    handleCalibRoiMouseUp(event) {
        if (!this.isDrawingCalibRoi || !this.isInCalibRoiDrawMode || !this.isShowingCalibrationPattern) return; // Check drawing CALIB ROI

        console.log("Calibration ROI Mouse Up");
        this.isDrawingCalibRoi = false; // End calib drawing session
        this.isInCalibRoiDrawMode = false; // Exit calib drawing mode

        // Clean up listeners
        if (this.calibrationPatternDisplay && this.boundHandleCalibRoiMouseDown) {
            // Keep mousedown listener attached to element, maybe remove only if needed?
            // this.calibrationPatternDisplay.removeEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
            this.calibrationPatternDisplay.style.cursor = 'default';
        }
        if (this.boundHandleCalibRoiMouseMove) window.removeEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
        if (this.boundHandleCalibRoiMouseUp) window.removeEventListener('mouseup', this.boundHandleCalibRoiMouseUp);

        // Final calculation based on last known coordinates (already done in mouse move)
        // Check the size of the pending calibration ROI
        if (this.pendingCalibRoiRect && (this.pendingCalibRoiRect.width < 5 || this.pendingCalibRoiRect.height < 5)) {
            console.log('Calibration ROI 绘制尺寸过小，未设置');
            this.pendingCalibRoiRect = null; // Discard small rect
        } else if (this.pendingCalibRoiRect) {
            console.log('Calibration ROI 绘制完成，等待确认:', this.pendingCalibRoiRect);
             // State becomes 'drawn' implicitly by having a pending rect
        } else {
             console.log('Calibration ROI mouse up without valid rect.');
             // State remains 'idle' (or whatever it was before enabling draw mode)
        }

        this.updateCalibRoiOverlay(); // Update final box display
        this.updateCalibRoiControlsUI(); // Update button states (confirm/redraw should appear)
    }

     confirmCalibRoi() {
        if (this.confirmCalibRoiBtn.disabled || !this.pendingCalibRoiRect || !this.isShowingCalibrationPattern) return;

        this.finalCalibRoiRect = { ...this.pendingCalibRoiRect }; // Copy pending to final
        this.pendingCalibRoiRect = null; // Clear pending
        console.log('校准 ROI 已确认:', this.finalCalibRoiRect);
        if (this.calibrationPatternDisplay) this.calibrationPatternDisplay.style.cursor = 'default';
        this.isInCalibRoiDrawMode = false; // Ensure exit draw mode
        // this.isCalibRoiVisible = true; // Ensure visible after confirm? Or keep current visibility? Let's make it visible.
        this.isCalibRoiVisible = true;
        this.updateCalibRoiOverlay(); // Update overlay style
        this.updateCalibRoiControlsUI(); // Update button display (confirm hides, redraw/toggle appear)
        // TODO: Send confirmed calib ROI to backend if needed
        // this.saveState(); // Optionally save confirmed calib ROI
    }

    redrawCalibRoi() {
        if (this.redrawCalibRoiBtn.disabled || !this.isShowingCalibrationPattern) return;

        this.pendingCalibRoiRect = null;
        this.finalCalibRoiRect = null;
        this.isInCalibRoiDrawMode = false; // Ensure exit draw mode if somehow active
        this.isDrawingCalibRoi = false; // Reset drawing flag

        if (this.calibrationPatternDisplay) {
            this.calibrationPatternDisplay.style.cursor = 'default';
            // Remove mouse down listener if it's still attached (safer)
             if (this.boundHandleCalibRoiMouseDown) {
                // this.calibrationPatternDisplay.removeEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
                // Let's not remove it, just rely on isInCalibRoiDrawMode flag
            }
        }
         // Clean up potential global listeners from a previous interrupted draw
         if (this.boundHandleCalibRoiMouseMove) window.removeEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
         if (this.boundHandleCalibRoiMouseUp) window.removeEventListener('mouseup', this.boundHandleCalibRoiMouseUp);

        console.log('请求重新绘制校准 ROI');
        this.updateCalibRoiOverlay(); // Hide overlay
        this.updateCalibRoiControlsUI(); // Update buttons (draw button should appear)
        // Trigger enabling draw mode again
        this.enableCalibRoi();
    }

    // Helper to cancel drawing if view switches
    cancelFocusRoiDraw() {
        // Check if we are actually drawing the focus ROI
        if (!this.isDrawingRoi || this.focusRoiState !== 'drawing') return;
         console.log("取消对焦 ROI 绘制");
         this.isDrawingRoi = false;
         this.focusRoiState = 'idle'; // Revert state to idle
         if (this.simulatedImage) {
             this.simulatedImage.style.cursor = 'default';
             // No global listeners to remove for focus ROI in this setup
         }
         this.pendingRoiRect = null; // Discard pending rect if cancelled mid-draw
         this.updateRoiOverlay(); // Hide overlay
         this.updateRoiControlsUI(); // Reset buttons
    }

    cancelCalibRoiDraw() {
        // Check if we are drawing the calibration ROI
        if (!this.isDrawingCalibRoi || !this.isInCalibRoiDrawMode) return;
         console.log("取消校准 ROI 绘制");
         this.isDrawingCalibRoi = false;
         this.isInCalibRoiDrawMode = false;
         if (this.calibrationPatternDisplay) {
             this.calibrationPatternDisplay.style.cursor = 'default';
             // Remove global listeners if they were attached
             if (this.boundHandleCalibRoiMouseMove) window.removeEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
             if (this.boundHandleCalibRoiMouseUp) window.removeEventListener('mouseup', this.boundHandleCalibRoiMouseUp);
         }
         this.pendingCalibRoiRect = null; // Discard pending rect if cancelled mid-draw
         this.updateCalibRoiOverlay(); // Hide overlay
         this.updateCalibRoiControlsUI(); // Reset buttons
    }

   // --- End Calibration ROI Logic ---

    // --- Focus ROI Core Logic ---
    startFocusRoiDraw(isRedraw = false) {
        if (!this.isConnected || this.isFocusing || this.isCalibrating) return; // Prevent starting if busy
        if (isRedraw) {
            console.log("开始重绘对焦 ROI");
            this.finalRoiRect = null; // Clear confirmed ROI if redrawing
        } else {
            console.log("开始绘制对焦 ROI");
        }
        this.focusRoiState = 'drawing';
        this.pendingRoiRect = null; // Clear any pending rect
        this.isDrawingRoi = false; // Reset internal flag
        if (this.simulatedImage) {
            this.simulatedImage.style.cursor = 'crosshair';
        }
        this.updateRoiOverlay(); // Clear overlay visually
        this.updateRoiControlsUI(); // Update button states
    }

    clearFocusRoi() {
        if (this.focusRoiState === 'idle') return; // Nothing to clear

        console.log("清除对焦 ROI");
        this.focusRoiState = 'idle';
        this.finalRoiRect = null;
        this.pendingRoiRect = null;
        this.isDrawingRoi = false;
        this.isFocusRoiVisible = true; // Reset visibility
        if (this.simulatedImage) {
            this.simulatedImage.style.cursor = 'default';
        }
        this.updateRoiOverlay(); // Hide overlay
        this.updateRoiControlsUI(); // Update buttons
        // TODO: Notify backend if needed (e.g., send null ROI)
        // await this.sendRoiToBackend(null);
    }

    confirmFocusRoi() {
        if (this.focusRoiState !== 'drawn' || !this.pendingRoiRect) return;

        this.finalRoiRect = { ...this.pendingRoiRect };
        this.focusRoiState = 'confirmed';
        this.pendingRoiRect = null;
        this.isFocusRoiVisible = true; // Ensure visible after confirm

        console.log("对焦 ROI 已确认:", this.finalRoiRect);
        // TODO: Send finalRoiRect to backend
        // e.g., await this.sendRoiToBackend(this.finalRoiRect);

        this.updateRoiOverlay();
        this.updateRoiControlsUI();
    }

    toggleFocusRoiVisibility() {
        // Ensure we are in camera view and have a confirmed focus ROI
        if (this.isShowingCalibrationPattern || !this.finalRoiRect || this.focusRoiState !== 'confirmed') return;

        this.isFocusRoiVisible = !this.isFocusRoiVisible;
        console.log(`对焦 ROI 可见性: ${this.isFocusRoiVisible}`);
        this.updateRoiOverlay(); // Update visual based on visibility
        this.updateRoiControlsUI(); // Update button icon/title
    }

    // --- UI Update Functions for ROI ---
    updateRoiControlsUI() {
        console.log(`[updateRoiControlsUI] State: ${this.focusRoiState}`); // Log state entry
        const canDraw = this.isConnected && !this.isFocusing && !this.isCalibrating;

        // Manage Draw Button visibility/state
        if (this.drawRoiFocusBtn) {
            const shouldShowDraw = this.focusRoiState === 'idle';
            console.log(`[updateRoiControlsUI] Draw Button - Found: true, Should Show: ${shouldShowDraw}`);
            this.drawRoiFocusBtn.style.display = shouldShowDraw ? 'inline-block' : 'none';
            this.drawRoiFocusBtn.disabled = !canDraw;
        } else {
             console.warn("[updateRoiControlsUI] Draw Button not found!");
        }

        // Manage Button Group visibility
        if (this.focusRoiButtonGroup) {
            const shouldShowGroup = this.focusRoiState === 'drawn' || this.focusRoiState === 'confirmed';
             console.log(`[updateRoiControlsUI] Button Group - Found: true, Should Show: ${shouldShowGroup}`);
            this.focusRoiButtonGroup.style.display = shouldShowGroup ? 'flex' : 'none';
        } else {
             console.warn("[updateRoiControlsUI] Button Group (focus-roi-button-group) not found! Did you add the ID in HTML?");
        }

        // Manage individual buttons within the group
        if (this.confirmFocusRoiBtn) {
            const shouldShowConfirm = this.focusRoiState === 'drawn';
             console.log(`[updateRoiControlsUI] Confirm Button - Found: true, Should Show: ${shouldShowConfirm}`);
            this.confirmFocusRoiBtn.style.display = shouldShowConfirm ? 'inline-block' : 'none';
            this.confirmFocusRoiBtn.disabled = !canDraw; // Enable if drawn and system idle
        } else {
            console.warn("[updateRoiControlsUI] Confirm Button not found!");
        }
        // ... (Add similar checks/logs for redraw, clear, toggle buttons if needed) ...
         if (this.redrawFocusRoiBtn) {
            const shouldShowRedraw = this.focusRoiState === 'drawn' || this.focusRoiState === 'confirmed';
            this.redrawFocusRoiBtn.style.display = shouldShowRedraw ? 'inline-block' : 'none';
            this.redrawFocusRoiBtn.disabled = !canDraw;
        }
         if (this.clearFocusRoiBtn) {
             const shouldShowClear = this.focusRoiState === 'drawn' || this.focusRoiState === 'confirmed';
             this.clearFocusRoiBtn.style.display = shouldShowClear ? 'inline-block' : 'none';
             this.clearFocusRoiBtn.disabled = !canDraw;
        }
        if (this.toggleFocusRoiVisibilityBtn) {
             const shouldShowToggle = this.focusRoiState === 'confirmed';
            this.toggleFocusRoiVisibilityBtn.style.display = shouldShowToggle ? 'inline-block' : 'none'; // Show only when confirmed
            this.toggleFocusRoiVisibilityBtn.disabled = !this.finalRoiRect; // Disable if no final rect
            const icon = this.toggleFocusRoiVisibilityBtn.querySelector('i');
            if (icon) {
                if (this.isFocusRoiVisible) {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                    this.toggleFocusRoiVisibilityBtn.title = "隐藏 ROI";
                } else {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                    this.toggleFocusRoiVisibilityBtn.title = "显示 ROI";
                }
            }
        }
    }

    // --- Re-add missing Calibration ROI UI update functions ---
    updateCalibRoiControlsUI() {
        // Default visibility based on whether the calibration pattern is shown
        const showCalibControls = this.isShowingCalibrationPattern;
        const canInteract = this.isConnected && !this.isFocusing && !this.isCalibrating; // Basic check

        console.log(`[updateCalibRoiControlsUI] showCalibControls: ${showCalibControls}, pending: ${!!this.pendingCalibRoiRect}, final: ${!!this.finalCalibRoiRect}`);

        // Hide all calib buttons initially
        if (this.drawCalibRoiBtn) this.drawCalibRoiBtn.style.display = 'none';
        if (this.calibRoiButtonGroup) this.calibRoiButtonGroup.style.display = 'none'; // Use direct reference
        if (this.confirmCalibRoiBtn) this.confirmCalibRoiBtn.style.display = 'none';
        if (this.redrawCalibRoiBtn) this.redrawCalibRoiBtn.style.display = 'none';
        if (this.toggleCalibRoiVisibilityBtn) this.toggleCalibRoiVisibilityBtn.style.display = 'none';

        if (showCalibControls) {
            if (this.pendingCalibRoiRect) {
                 // State: Drawn, waiting for confirmation
                if (this.calibRoiButtonGroup) {
                     this.calibRoiButtonGroup.style.display = 'flex'; // Show the group
                     console.log("[updateCalibRoiControlsUI] Setting calib group display to 'flex' (pending)");
                }
                if (this.confirmCalibRoiBtn) {
                     this.confirmCalibRoiBtn.style.display = 'inline-block'; // Show Confirm
                     this.confirmCalibRoiBtn.disabled = !canInteract;
                }
                if (this.redrawCalibRoiBtn) {
                     this.redrawCalibRoiBtn.style.display = 'inline-block'; // Show Redraw
                     this.redrawCalibRoiBtn.disabled = !canInteract;
                }
                // Toggle visibility usually only shown for confirmed ROI, keep hidden here
                if (this.toggleCalibRoiVisibilityBtn) this.toggleCalibRoiVisibilityBtn.style.display = 'none';
             } else if (this.finalCalibRoiRect) {
                 // State: Confirmed
                 if (this.calibRoiButtonGroup) {
                     this.calibRoiButtonGroup.style.display = 'flex'; // Show the group
                     console.log("[updateCalibRoiControlsUI] Setting calib group display to 'flex' (confirmed)");
                 }
                 if (this.confirmCalibRoiBtn) this.confirmCalibRoiBtn.style.display = 'none'; // Hide Confirm
                 if (this.redrawCalibRoiBtn) {
                     this.redrawCalibRoiBtn.style.display = 'inline-block'; // Show Redraw
                     this.redrawCalibRoiBtn.disabled = !canInteract;
                 }
                 if (this.toggleCalibRoiVisibilityBtn) {
                     this.toggleCalibRoiVisibilityBtn.style.display = 'inline-block'; // Show Toggle
                      this.toggleCalibRoiVisibilityBtn.disabled = !this.finalCalibRoiRect;
                 }
             } else {
                 // State: Idle (or drawing)
                 if (this.drawCalibRoiBtn) {
                     this.drawCalibRoiBtn.style.display = 'inline-block'; // Show Draw
                     this.drawCalibRoiBtn.disabled = !canInteract || this.isInCalibRoiDrawMode; // Disable if drawing
                 }
                 if (this.calibRoiButtonGroup) {
                    this.calibRoiButtonGroup.style.display = 'none'; // Hide group when idle
                    console.log("[updateCalibRoiControlsUI] Setting calib group display to 'none' (idle)");
                 }
             }
        } else {
             console.log("[updateCalibRoiControlsUI] Not in calibration view, hiding group.");
             if (this.calibRoiButtonGroup) this.calibRoiButtonGroup.style.display = 'none';
        }
        this.updateCalibRoiToggleButtonState(); // Update toggle button icon/title
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
            // Ensure elements exist before updating
            if (this.serialNumberSelect && state.serialNumber) {
                 // Find if option exists, otherwise add it
                 let found = false;
                 for(let i=0; i<this.serialNumberSelect.options.length; i++){
                     if(this.serialNumberSelect.options[i].value === state.serialNumber){
                         this.serialNumberSelect.selectedIndex = i;
                         found = true;
                         break;
                     }
                 }
                 if (!found) {
                    const newOption = new Option(state.serialNumber, state.serialNumber, false, true); // text, value, defaultSelected, selected
                    this.serialNumberSelect.appendChild(newOption);
                    // this.serialNumberSelect.value = state.serialNumber; // Setting value might be more reliable
                 }
            } else if (this.serialNumberSelect) {
                this.serialNumberSelect.value = ''; // Clear selection if no SN from backend
            }

            if (this.configFileInput) { this.configFileInput.value = state.configFile || ''; }
            if (this.savePathInput) { this.savePathInput.value = state.savePath || ''; }
            if (this.cameraNameInput) { this.cameraNameInput.value = state.cameraName || ''; }
            if (this.cameraModelInput) { this.cameraModelInput.value = state.cameraModel || ''; }

            this.currentZ = state.currentZ !== undefined ? state.currentZ : '--';
            this.currentClarity = state.clarity;
            this.bestZFound = state.bestZ; // Store best Z from backend

            const currentZStr = typeof this.currentZ === 'number' ? this.currentZ.toFixed(2) : '--';
            if (this.footerZPos) { this.footerZPos.textContent = currentZStr; }
            if (this.currentZInput) { this.currentZInput.value = currentZStr; }
            if (this.clarityValueInput) { this.clarityValueInput.value = typeof this.currentClarity === 'number' ? this.currentClarity.toFixed(3) : '--'; }
            // Only apply blur if not showing pattern view
             if (!this.isShowingCalibrationPattern) {
                 this.applyBlur(this.currentClarity);
             }


            // --- Update Properties Table/Controls ---
            const properties = state.properties || {};
            const propsContainer = document.querySelector('.property-grid'); // Or the table body if applicable
            if(propsContainer){
                // Example: Assuming properties have unique IDs or can be found by label
                Object.entries(properties).forEach(([key, propData]) => {
                     // Find control based on label text or a data attribute if added
                     // This is complex without stable IDs, skipping detailed implementation here
                     // Simplified example:
                     if (key === '曝光时间(us)' && document.getElementById('exposure-time')) {
                          document.getElementById('exposure-time').value = propData.value;
                     } else if (key === '增益' && document.getElementById('gain')) {
                          document.getElementById('gain').value = propData.value;
                     } else if (key === '触发模式' && document.getElementById('trigger-mode-select')) {
                         document.getElementById('trigger-mode-select').value = propData.value;
                     }
                     // ... add more properties ...
                });
            }


            // --- Update Focus ROI ---
             // Backend should send ROI coordinates relative to image, e.g., {l, t, r, b}
             if (state.roiCoords && state.roiEnabled !== false) {
                // Convert backend {l,t,r,b} to frontend {x,y,width,height} if needed
                // Assuming backend sends {l,t,r,b} and getImageCoordinates uses {x,y,w,h}
                // this.finalRoiRect = this.backendCoordsToDisplayCoords(state.roiCoords); // Need this helper
                 // For now, assuming backend sends compatible {x,y,w,h} or we handle it elsewhere
                 this.finalRoiRect = state.roiCoords; // Direct assignment if compatible
                 this.focusRoiState = this.finalRoiRect ? 'confirmed' : 'idle'; // Set state based on valid coords
                 this.isFocusRoiVisible = true; // Assume visible if received from backend
             } else {
                 this.finalRoiRect = null;
                 this.focusRoiState = 'idle';
             }
            this.pendingRoiRect = null; // Clear pending on state update


             // --- Update Calibration ROI (if applicable) ---
             // Assuming backend *doesn't* send calib ROI state currently
             // this.finalCalibRoiRect = state.calibRoiCoords || null;
             // this.pendingCalibRoiRect = null; // Clear pending


            // Update Focus Status
            this.updateFocusStatus(state.focusStatus || '空闲');

            // Update Selected Axis
            this.selectedAxisId = state.selectedAxisId;
            this.updateConfigAxisButtonDisplay(this.selectedAxisId);

            // --- Trigger UI updates AFTER all state is loaded ---
            this.updateRoiOverlay(); // Update focus ROI visual
            this.updateCalibRoiOverlay(); // Update calib ROI visual (will hide if needed)
            this.updateRoiControlsUI(); // Update focus ROI buttons
            this.updateCalibRoiControlsUI(); // Update calib ROI buttons


        } else {
            // Handle disconnected state
            this.resetUIData(); // Call a helper to clear most UI fields
            if (!this.isShowingCalibrationPattern) { // Don't modify blur if showing pattern
                 this.applyBlur(1); // Max blur when disconnected
             }
            this.updateFocusStatus('未连接');
        }
        this.updateControlStates(this.isConnected); // Update button enable/disable states
    }

    resetUIData() {
        if (this.configFileInput) this.configFileInput.value = '';
        if (this.savePathInput) this.savePathInput.value = '';
        if (this.cameraNameInput) this.cameraNameInput.value = '';
        if (this.cameraModelInput) this.cameraModelInput.value = '';
        if (this.currentZInput) this.currentZInput.value = '--';
        if (this.clarityValueInput) this.clarityValueInput.value = '--';
        if (this.footerZPos) this.footerZPos.textContent = '--';
        // Reset properties table/controls if needed
        // ...
        // Reset ROI states
        this.finalRoiRect = null;
        this.pendingRoiRect = null;
        this.focusRoiState = 'idle';
        this.updateRoiOverlay();
        this.updateRoiControlsUI();
        // Reset Calib ROI too
        this.finalCalibRoiRect = null;
        this.pendingCalibRoiRect = null;
        this.updateCalibRoiControlsUI();
        // Reset axis selection
        this.selectedAxisId = null;
        this.updateConfigAxisButtonDisplay(null);
        // Reset calibration result
        if (this.calibrationResultValue) this.calibrationResultValue.textContent = '-- px/mm';
    }
    // --- End re-added updateUIFromState function and its helper ---
} // End Class

// Initialize the controller
document.addEventListener('DOMContentLoaded', () => {
    new CameraController();
});