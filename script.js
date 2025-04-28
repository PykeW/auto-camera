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
        this.propertyTableBody = document.querySelector('#property-table tbody');

        // --- Find ROI elements using standard JS ---
        const allPanelSections = document.querySelectorAll('.panel-section');
        let roiSectionElement = null;
        for (const section of allPanelSections) {
            const h3 = section.querySelector('h3');
            // Check if h3 exists and its text content includes "ROI区域"
            if (h3 && h3.textContent.includes("ROI区域")) {
                roiSectionElement = section;
                break; // Found the section, stop searching
            }
        }
        this.roiSection = roiSectionElement; // Store the found section element

        // Initialize ROI inputs to null
        this.roiLeftX = null;
        this.roiTopY = null;
        this.roiRightX = null;
        this.roiBottomY = null;

        if (this.roiSection) {
            // Find number inputs within the found ROI section
            const roiInputs = this.roiSection.querySelectorAll('input[type="number"]');
            if (roiInputs.length >= 4) {
                // Assign inputs based on their order
                this.roiLeftX = roiInputs[0];
                this.roiTopY = roiInputs[1];
                this.roiRightX = roiInputs[2];
                this.roiBottomY = roiInputs[3];
            } else {
                console.warn("警告: 在ROI区域部分未找到预期的4个数字输入框。");
            }
        } else {
            console.warn("警告: 未能找到包含 'ROI区域' 的 .panel-section。");
        }
        // --- End of ROI element finding ---

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
        this.enableRoiBtn = document.getElementById('enable-roi-btn');
        this.roiOverlay = document.getElementById('focus-roi-overlay'); // Get ROI overlay element
        this.confirmRoiBtn = document.getElementById('confirm-roi-btn');
        this.redrawRoiBtn = document.getElementById('redraw-roi-btn');

        // Calibration elements
        this.calibrationPatternDisplay = document.getElementById('calibration-pattern-display');
        this.calibrationResultValue = document.getElementById('calibration-result-value');
        this.cameraDisplayContainer = document.getElementById('camera-display-container'); // Container
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
        // Quadrant Best Z Simulation
        this.QUADRANT_BEST_Z = {
            TL: 15.0, // Top Left
            TR: 16.5, // Top Right
            BL: 14.0, // Bottom Left
            BR: 15.8  // Bottom Right
        };
        // ---------------------------

        this.selectedAxisId = null; // Store the selected axis ID
        this.currentZ = 10.0;
        this.isFocusing = false;
        this.focusProcessId = null; // Stores timeout/interval ID for stopping
        this.currentClarity = 0;
        this.bestZFound = null;
        this.isConnected = false;       // Added connection state
        this.connectionProcessId = null; // For connect/disconnect process
        this.isCapturing = false;
        this.isRecording = false;
        this.roiEnabled = false;
        this.isAxisDropdownVisible = false; // Track dropdown visibility
        this.isCalibrating = false; // Track calibration state
        this.calibrationRatio = null; // Store calibration result
        this.isShowingCalibrationPattern = false; // Track view state

        // ROI Drawing State
        this.isDrawingRoi = false;
        this.roiStartX = 0;
        this.roiStartY = 0;
        this.currentRoiX = 0;
        this.currentRoiY = 0;
        this.finalRoiRect = null; // Stores { x, y, width, height } in image coordinates
        this.pendingRoiRect = null; // Stores drawn ROI before confirmation

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

        // Adjust ROI overlay opacity based on clarity and whether ROI is confirmed
        if (this.roiOverlay) {
            if (this.roiEnabled && this.finalRoiRect) {
                // ROI is confirmed, make overlay more visible when clarity is high
                // Map clarity [0, 1] to opacity [0.1, 0.9] (example mapping)
                 const minOpacity = 0.1;
                 const maxOpacity = 0.7; // Keep it somewhat transparent even when sharp
                 this.roiOverlay.style.opacity = minOpacity + clarity * (maxOpacity - minOpacity);
                 this.roiOverlay.style.display = 'block'; // Ensure it's visible
                 this.roiOverlay.style.backgroundColor = 'rgba(255, 255, 0, 0.08)'; // Ensure background is set
             } else if (this.roiEnabled && this.pendingRoiRect) {
                 // ROI is pending confirmation, keep it fully visible but without background effect yet
                 this.roiOverlay.style.opacity = 1; // Full dashed border visibility
                 this.roiOverlay.style.backgroundColor = 'transparent'; // No background while drawing/pending
                 this.roiOverlay.style.display = 'block';
             } else {
                 // No ROI active or drawing
                 this.roiOverlay.style.opacity = 0;
                 this.roiOverlay.style.display = 'none';
             }
        }
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
            if (this.roiOverlay) this.roiOverlay.style.display = 'none'; 
            if (this.enableRoiBtn) this.enableRoiBtn.textContent = "启用ROI";
            this.hideAxisDropdown(); 
            console.log("前端状态已更新为断开");
            // Fetch available cameras again after disconnecting
            this.fetchAvailableCameras();

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
        const canStartActivity = connected && !this.isFocusing; // Can start capture/record if connected and not focusing

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
             const excludedIds = ['connect-btn', 'start-focus-btn', 'stop-focus-btn', 'calibrate-btn', 'toggle-view-btn', 'enable-roi-btn', 'confirm-roi-btn', 'redraw-roi-btn', 'calib-square-size'];
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

        // ROI Button States
        const isRoiConfirmed = connected && this.roiEnabled && this.finalRoiRect && !this.pendingRoiRect;
        const isRoiPending = connected && this.roiEnabled && this.pendingRoiRect && !this.isDrawingRoi;
        const canEnableRoi = connected && !this.roiEnabled && !this.isFocusing && !this.isCapturing && !this.isRecording && !this.isCalibrating;

        if(this.enableRoiBtn) {
            this.enableRoiBtn.disabled = !(canEnableRoi || isRoiConfirmed); // Enable if can be enabled OR if ROI is confirmed (to allow disabling)
            this.enableRoiBtn.textContent = this.roiEnabled ? "禁用ROI" : "启用ROI";
            this.enableRoiBtn.style.display = isRoiPending ? 'none' : 'inline-block'; // Hide when pending confirmation
        }
        if (this.confirmRoiBtn) {
            this.confirmRoiBtn.disabled = !isRoiPending;
            this.confirmRoiBtn.style.display = isRoiPending ? 'inline-block' : 'none';
        }
        if (this.redrawRoiBtn) {
            this.redrawRoiBtn.disabled = !(isRoiPending || isRoiConfirmed); // Enable if pending OR confirmed
            this.redrawRoiBtn.style.display = (isRoiPending || isRoiConfirmed) ? 'inline-block' : 'none'; // Show if pending OR confirmed
        }

        // Table controls
        document.querySelectorAll('#property-table input, #property-table select').forEach(ctrl => {
             ctrl.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;
         });

        // Config Axis Button
        if (this.configAxisBtn) this.configAxisBtn.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;

        // Axis Config Buttons
        if (this.clearAxisBtn) this.clearAxisBtn.disabled = !connected || !this.selectedAxisId || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating; // Enable only if axis is selected and idle
    }

    // Clears data when disconnected
    resetUIData() {
        this.serialNumberSelect.innerHTML = '<option>请连接...</option>';
        this.serialNumberSelect.disabled = true;
        this.configFileInput.value = '';
        this.savePathInput.value = '';
        this.cameraNameInput.value = '';
        this.cameraModelInput.value = '';
        this.propertyTableBody.innerHTML = ''; // Clear table
        this.clarityValueInput.value = '--';
        this.currentZInput.value = '--';
        this.footerZPos.textContent = '--';
        if (this.calibSquareSizeInput) this.calibSquareSizeInput.value = '1.0'; // Reset calibration input
        if (this.calibrationResultValue) this.calibrationResultValue.textContent = '-- pixels/mm'; // Reset calibration result
        this.applyBlur(1); // Apply max blur
        this.switchToCameraView(); // Ensure camera view is shown
    }

    // Populates controls with simulated data (called after connection)
    async populateSimulatedData() {
        console.log("正在填充模拟数据 (来自后端)...");
        if (!this.isConnected) return; // Check backend state if available

        // --- Fetch full state from backend after connect ---
        // It's often better to get the full state from backend after connecting
        // instead of relying on the connect response alone.
        try {
            const statusResponse = await fetch(`${this.backendUrl}/status`);
            if (!statusResponse.ok) throw new Error(`HTTP ${statusResponse.status}`);
            const backendState = await statusResponse.json();
            
            // Update local state (or directly use backendState if structure matches)
            this.serialNumberSelect.innerHTML = `<option value="${backendState.serialNumber}">${backendState.serialNumber}</option>`;
            this.configFileInput.value = backendState.configFile || '';
            this.savePathInput.value = backendState.savePath || '';
            this.cameraNameInput.value = backendState.cameraName || '';
            this.cameraModelInput.value = backendState.cameraModel || '';

            // Populate Properties Table from Backend
            this.propertyTableBody.innerHTML = '';
            const properties = backendState.properties || {};
            for (const propName in properties) {
                const prop = properties[propName];
                const row = this.propertyTableBody.insertRow();
                const nameCell = row.insertCell();
                const valueCell = row.insertCell();
                nameCell.textContent = propName;
                let control;

                if (prop.type === 'select') {
                    control = document.createElement('select');
                    prop.options.forEach(opt => {
                         const option = document.createElement('option');
                         option.value = opt; option.textContent = opt; control.appendChild(option);
                    });
                    control.value = prop.value;
                } else if (prop.type === 'number' || prop.type === 'range') {
                    control = document.createElement('input');
                    control.type = prop.type; control.value = prop.value;
                    if (prop.min !== undefined) control.min = prop.min;
                    if (prop.max !== undefined) control.max = prop.max;
                    if (prop.step !== undefined) control.step = prop.step;
                }
                 if (control) {
                    valueCell.appendChild(control);
                    control.disabled = !this.isConnected; // Should be enabled now
                }
            }

            // ROI Area - Use backend state if available, otherwise keep frontend sim
            const roi = backendState.roiCoords || {l: 150, t: 100, r: 450, b: 400}; // Default
             if (this.roiLeftX && this.roiTopY && this.roiRightX && this.roiBottomY) {
                 this.roiLeftX.value = roi.l; this.roiTopY.value = roi.t;
                 this.roiRightX.value = roi.r; this.roiBottomY.value = roi.b;
            } else {
                 // Warning already handled in constructor check if needed
            }
             // Update selected Axis display if already configured
             if (backendState.selectedAxisId) {
                 this.selectedAxisId = backendState.selectedAxisId;
                 // We need the name, fetch axes again or store names locally?
                 // Simple solution: just show ID for now, or update button after selection
                 const axisInfo = simulated_plc_axes.find(a => a.id === this.selectedAxisId); // Use backend data directly
                 if (axisInfo) {
                    this.configAxisBtn.textContent = `轴:${axisInfo.name}`;
                    this.configAxisBtn.title = `当前配置轴: ${axisInfo.name} (ID: ${this.selectedAxisId})`;
                 } else {
                     this.configAxisBtn.textContent = `配置轴`; // Reset if ID invalid?
                     this.configAxisBtn.title = `配置相机Z轴`;
                 }

             } else {
                  this.configAxisBtn.textContent = `配置轴`; // Reset button text
                  this.configAxisBtn.title = `配置相机Z轴`;
             }


            console.log("模拟数据(后端)填充完成。");

        } catch (error) {
             console.error("从后端获取状态或填充数据时出错:", error);
             // Handle error - maybe show message to user or use defaults
             this.populateSimulatedDataFallback(); // Use old hardcoded data as fallback
        }
    }

    // Fallback if backend fetch fails
    populateSimulatedDataFallback() {
        console.warn("警告: 使用前端硬编码数据作为后备。");
        // (此处可以粘贴你之前 populateSimulatedData 中填充属性表格等的代码)
        // Basic Settings
       this.serialNumberSelect.innerHTML = '<option value="SN12345678_FB">SN12345678_FB</option><option value="SN98765432_FB">SN98765432_FB</option>';
       this.serialNumberSelect.value = "SN12345678_FB";
       this.configFileInput.value = "C:/CameraConfigs/fallback.cfg";
       this.savePathInput.value = "D:/Captures/Fallback/";
       this.cameraNameInput.value = "前置定焦相机 (后备)";
       this.cameraModelInput.value = "模拟相机 (Fallback)";
       // ... (填充属性表格等) ...
        this.propertyTableBody.innerHTML = `<tr><td>曝光时间(us)</td><td><input type='number' value='15000'></td></tr><tr><td>增益</td><td><input type='number' value='1.2'></td></tr>`; // 简化版后备
    }

    // --- Autofocus Simulation Logic --- (Refined)
    async startAutofocus() {
        if (this.isFocusing || !this.isConnected) {
            console.warn("无法开始对焦: 未连接或已在对焦中");
            return;
        }
        console.log("--------- 开始自动对焦流程 ---------");
        this.bestZFound = null;
        let maxClarityFound = -1;
        let currentStage = "初始化";

        try {
            // 1. Initialization
            currentStage = "初始化";
            this.updateFocusStatus('初始化/检查');
            console.log("模拟: [控制器] 确认PLC处于手动模式");
            await this.wait(this.INIT_DELAY);
            console.log("模拟: [控制器] 获取工位-相机-轴映射");
            await this.wait(this.INIT_DELAY);
            currentStage = "请求控制权";
            this.updateFocusStatus('请求Z轴控制权');
            console.log("模拟: [控制器->通信层] 请求目标 Z 轴控制权");
            await this.wait(this.CONTROL_REQUEST_DELAY);
            console.log("模拟: [通信层->控制器] Z 轴控制权已获取");

            // 2. Rough Focusing
            currentStage = "粗对焦";
            this.updateFocusStatus('粗对焦中');
            let z_rough = this.Z_RANGE.min;
            while (z_rough <= this.Z_RANGE.max) {
                 console.log(`模拟: [控制器->通信层] 移动 Z 轴到 ${z_rough.toFixed(2)}`);
                 await this.simulateZMovement(z_rough);
                 const roiQuadrantInfo = (this.roiEnabled && this.finalRoiRect) ? ` (ROI中心象限: ${this.getCoordinateQuadrant(this.finalRoiRect.x + this.finalRoiRect.width / 2, this.finalRoiRect.y + this.finalRoiRect.height / 2)})` : ' (全局中心)';
                 console.log(`模拟: [控制器->图像处理] 获取当前位置清晰度${roiQuadrantInfo}`);
                 console.log(` > 粗扫: Z=${z_rough.toFixed(2)}, 清晰度=${this.currentClarity.toFixed(3)}${roiQuadrantInfo}`);
                 if (this.currentClarity > maxClarityFound) {
                     maxClarityFound = this.currentClarity;
                     this.bestZFound = z_rough;
                 }
                 await this.wait(this.SCAN_DELAY_ROUGH);
                 z_rough += this.Z_STEP_ROUGH;
             }
             if (this.bestZFound === null) throw new Error("粗对焦未能确定峰值区域");
             console.log(`粗对焦峰值 Z ≈ ${this.bestZFound.toFixed(2)}`);

            // 3. Fine Focusing
            currentStage = "精细对焦";
            this.updateFocusStatus('精细对焦中');
             maxClarityFound = -1;
             let fineStart = Math.max(this.Z_RANGE.min, this.bestZFound - this.Z_STEP_ROUGH);
             let fineEnd = Math.min(this.Z_RANGE.max, this.bestZFound + this.Z_STEP_ROUGH);
             let z_fine = fineStart;
             let finalBestZ = this.bestZFound;
             while (z_fine <= fineEnd) {
                 console.log(`模拟: [控制器->通信层] 移动 Z 轴到 ${z_fine.toFixed(2)}`);
                 await this.simulateZMovement(z_fine);
                 const roiQuadrantInfo = (this.roiEnabled && this.finalRoiRect) ? ` (ROI中心象限: ${this.getCoordinateQuadrant(this.finalRoiRect.x + this.finalRoiRect.width / 2, this.finalRoiRect.y + this.finalRoiRect.height / 2)})` : ' (全局中心)';
                 console.log(`模拟: [控制器->图像处理] 获取当前位置清晰度${roiQuadrantInfo}`);
                 console.log(` > 精扫: Z=${z_fine.toFixed(2)}, 清晰度=${this.currentClarity.toFixed(3)}${roiQuadrantInfo}`);
                 if (this.currentClarity > maxClarityFound) {
                     maxClarityFound = this.currentClarity;
                     finalBestZ = z_fine;
                 }
                 await this.wait(this.SCAN_DELAY_FINE);
                 z_fine = parseFloat((z_fine + this.Z_STEP_FINE).toFixed(2));
             }
             console.log(`精细对焦完成, 判定最佳 Z = ${finalBestZ.toFixed(2)}`);
             this.bestZFound = finalBestZ;

            // 4. Calibration (Simulated Placeholder)
            currentStage = "当量计算(可选)";
            this.updateFocusStatus('当量计算(模拟)');
            console.log("模拟: [控制器] 检查是否需要执行当量计算...");
            await this.wait(this.INIT_DELAY);
            const needsCalibration = false; // Set to true to simulate running it
            if (needsCalibration) {
                console.log("模拟: [控制器->图像处理] 在最佳位置采集标准块图像");
                await this.wait(this.CALIBRATION_DELAY / 2);
                console.log("模拟: [图像处理] 分析特征点/线间距");
                await this.wait(this.CALIBRATION_DELAY / 2);
                console.log("模拟: [图像处理->控制器] 返回像素/距离比");
            } else {
                 console.log("模拟: 跳过当量计算步骤");
            }

            // 5. Completion and Switch
             currentStage = "移动到最佳位置";
             this.updateFocusStatus('移动到最佳位置');
             console.log(`模拟: [控制器->通信层] 移动 Z 轴到最终位置 ${this.bestZFound.toFixed(2)}`);
             await this.simulateZMovement(this.bestZFound);
             console.log("模拟: 已移动到最佳对焦位置");

             currentStage = "保存参数";
             this.updateFocusStatus('保存参数中');
             console.log(`模拟: [控制器] 保存对焦参数 (最佳 Z = ${this.bestZFound.toFixed(2)}) 到配置文件`);
             await this.wait(this.SAVE_DELAY);

             currentStage = "完成";
             this.updateFocusStatus('已对焦'); // Final success state
             console.log("--------- 自动对焦流程完成 --------- ");
             console.log("模拟: [控制器] 可选择继续下一工位");
             this.saveState(); // Save state after successful focus

        } catch (error) {
            if (error.message.startsWith("Stopped")) {
                console.log(`对焦流程被停止 (阶段: ${currentStage})`); // Simplified stop message
                this.updateFocusStatus('已停止');
            } else {
                console.error(`对焦流程在 [${currentStage}] 阶段出错: ${error.message}`);
                this.updateFocusStatus('错误');
            }
        } finally {
             // Release control simulation
             console.log("模拟: [控制器->通信层] 释放 Z 轴控制权");
             this.isFocusing = false;
             this.focusProcessId = null;
              // Update controls based on final state (connected but idle/error/stopped)
             this.updateControlStates(this.isConnected);
        }
        this.saveState(); // Save state after selecting axis
    }

    stopAutofocus() {
        if (this.focusProcessId) {
            clearTimeout(this.focusProcessId);
            this.focusProcessId = null;
            console.log("停止信号已发送");
        }
        this.isFocusing = false;
        // Update status immediately if it was in a focusing state
        if (![ '空闲', '已对焦', '已停止', '错误', '未连接' ].includes(this.focusStatusText.textContent)){
             this.updateFocusStatus('已停止'); 
        }
        this.updateControlStates(this.isConnected); // Update button states
    }

    // --- Simulation Functions for Actions ---
    startCapture() {
        if (!this.isConnected || this.isFocusing || this.isCapturing || this.isRecording) return;
        console.log("模拟: 开始连续采集...");
        this.isCapturing = true;
        this.footerStatus.textContent = "状态: 采集中";
        this.updateControlStates(true);
        // Simulate FPS update (example)
        // this.fpsInterval = setInterval(() => { /* update FPS display */ }, 1000);
    }

    stopCapture() {
        if (!this.isCapturing && !this.isRecording) return;
        console.log("模拟: 停止采集/录制...");
        this.isCapturing = false;
        this.isRecording = false;
        this.footerStatus.textContent = "状态: 已连接"; // Or Idle?
        // clearInterval(this.fpsInterval);
        this.updateControlStates(true);
    }

    singleShot() {
         if (!this.isConnected || this.isFocusing || this.isCapturing || this.isRecording) return;
         console.log("模拟: 执行单张拍照...");
         this.footerStatus.textContent = "状态: 拍照中...";
         // Simulate a brief action
         setTimeout(() => {
              if (this.isConnected) { // Check if still connected
                  this.footerStatus.textContent = "状态: 已连接";
              }
         }, 300);
         // No state change for isCapturing/isRecording needed for single shot
         // Buttons might briefly disable/re-enable if needed via updateControlStates
    }

    startRecording() {
         if (!this.isConnected || this.isFocusing || this.isCapturing || this.isRecording) return;
         console.log("模拟: 开始录制...");
         this.isRecording = true;
         this.footerStatus.textContent = "状态: 录制中";
         this.updateControlStates(true);
    }

    softwareTrigger() {
        if (!this.isConnected || this.isFocusing || this.isCapturing || this.isRecording) return;
         console.log("模拟: 发送软件触发信号...");
          this.footerStatus.textContent = "状态: 触发拍照...";
         // Simulate a brief action
         setTimeout(() => {
              if (this.isConnected) {
                  this.footerStatus.textContent = "状态: 已连接";
              }
         }, 300);
    }

    toggleROI() {
        if (!this.isConnected || this.isFocusing || this.isCapturing || this.isRecording) return;
        this.roiEnabled = !this.roiEnabled;
        console.log(`ROI 功能: ${this.roiEnabled ? '启用，请在图像上绘制' : '禁用'}`);

        if (this.roiEnabled) {
            this.enableRoiBtn.textContent = "禁用ROI";
            this.simulatedImage.style.cursor = 'crosshair'; // Indicate drawing mode
            // Don't show overlay until drawing starts
        } else {
            this.enableRoiBtn.textContent = "启用ROI";
            this.simulatedImage.style.cursor = 'default';
            this.roiOverlay.style.display = 'none'; // Hide overlay
            this.isDrawingRoi = false; // Ensure drawing stops if disabled mid-draw
            this.finalRoiRect = null; // Clear stored ROI when disabled
            this.pendingRoiRect = null; // Clear pending ROI
            console.log('ROI 已禁用并清除');
        }

        this.updateControlStates(true);
    }

    // --- Axis Configuration Dropdown Logic ---

    async fetchAndShowAxisDropdown() {
        if (!this.isConnected || !this.axisDropdown) return;

        // Toggle visibility
        if (this.isAxisDropdownVisible) {
            this.hideAxisDropdown();
            return;
        }

        console.log("获取轴配置...");
        this.axisListUl.innerHTML = '<li class="axis-list-loading">加载中...</li>'; // Show loading
        this.dropdownCameraSN.textContent = `相机: ${this.serialNumberSelect.value || 'N/A'}`;
        this.axisDropdown.classList.add('show'); // Show container early
        this.isAxisDropdownVisible = true;

        try {
            // --- FETCH FROM BACKEND ---
            console.log('准备发送请求到 /api/axes');
            const response = await fetch(`${this.backendUrl}/api/axes`); // Use backendUrl
            console.log(`收到 /api/axes 响应: Status=${response.status}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const axesData = await response.json();
            console.log('成功解析轴数据:', axesData);
            // --------------------------

            // 检查 this.axisListUl 是否有效
            console.log('检查 this.axisListUl:', this.axisListUl);
            if (!this.axisListUl) {
                console.error('错误：无法找到 axis-list UL 元素!');
                return; // 无法继续
            }

            this.axisListUl.innerHTML = ''; // Clear loading/previous items
            console.log('清空 axisListUl 内容');

            if (axesData && axesData.length > 0) {
                console.log(`开始填充 ${axesData.length} 个轴项目...`);
                axesData.forEach((axis, index) => {
                    console.log(`  处理第 ${index + 1} 个轴:`, axis);
                    try {
                        const li = document.createElement('li');
                        // 基本检查确保属性存在
                        const axisName = axis.name || '未知名称';
                        const axisId = axis.id || '未知ID';
                        const rangeMin = axis.range_min !== undefined ? axis.range_min : '--';
                        const rangeMax = axis.range_max !== undefined ? axis.range_max : '--';

                        li.textContent = `${axisName} (ID: ${axisId}, Range: ${rangeMin}-${rangeMax}mm)`;
                        li.dataset.axisId = axisId;
                        li.addEventListener('click', () => this.selectAxis(axisId, axisName));
                        this.axisListUl.appendChild(li);
                        console.log(`    > 成功添加 li: ${axisName}`);
                    } catch (loopError) {
                        console.error(`    > 添加轴 ${axis ? axis.id : '未知'} 时出错:`, loopError);
                        // 可以在这里决定是否中断循环或继续
                    }
                });
                console.log('轴项目填充完成。');
            } else {
                console.log('收到的轴数据为空或无效，显示空消息。');
                this.axisListUl.innerHTML = '<li class="axis-list-empty">无可用轴数据</li>';
            }

        } catch (error) {
            console.error("获取轴列表失败:", error);
            this.axisListUl.innerHTML = '<li class="axis-list-error">加载失败</li>';
        }
    }

    hideAxisDropdown() {
        if (!this.axisDropdown) return;
        this.axisDropdown.classList.remove('show');
        this.isAxisDropdownVisible = false;
        console.log("关闭轴配置下拉菜单");
    }

    async selectAxis(axisId, axisName) {
        if (!this.isConnected) return;
        console.log(`选择轴: ${axisName} (ID: ${axisId})`);
        this.selectedAxisId = axisId;
        this.hideAxisDropdown(); // Hide dropdown after selection

        // --- SIMULATE SAVING TO BACKEND ---
        try {
            console.log(`模拟: 将配置保存到后端... (相机: ${this.serialNumberSelect.value}, 轴ID: ${axisId})`);
            const response = await fetch(`${this.backendUrl}/set_axis_config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cameraSN: this.serialNumberSelect.value,
                    axisId: axisId
                })
            });
            if (!response.ok) {
                 throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.status === 'ok') {
                console.log("后端确认配置已保存:", result);
                alert(`模拟: 相机 ${this.serialNumberSelect.value} 已配置使用轴 ${axisName}`);
                 // Update button text or add indicator? (Optional)
                this.configAxisBtn.textContent = `轴:${axisName}`; // Example: update button text
                this.configAxisBtn.title = `当前配置轴: ${axisName} (ID: ${axisId})`;
            } else {
                 console.error("后端保存配置失败:", result.message);
                 alert("模拟: 保存轴配置到后端失败!");
                 this.selectedAxisId = null; // Revert selection on failure?
            }
        } catch (error) {
             console.error("保存轴配置时出错:", error);
             alert("模拟: 保存轴配置时发生网络或处理错误!");
             this.selectedAxisId = null; // Revert selection on failure?
        }
        // ---------------------------------
        this.updateControlStates(this.isConnected);
        this.saveState(); // Save state after selecting axis
    }

    // --- Event Listeners ---
    initializeEventListeners() {
        this.connectBtn.addEventListener('click', () => {
            // Restore the logic: call disconnect if connected, otherwise connect
            if (this.isConnected) {
                this.disconnectCamera(); 
            } else {
                this.connectCamera(); 
            }
            // Removed the old logic that checked this.isConnected here
            // because connectCamera now handles both connect and potential errors.
        });
        this.configAxisBtn.addEventListener('click', (e) => {
             e.stopPropagation(); // Prevent body click from closing immediately
             this.fetchAndShowAxisDropdown()
         });
        this.startFocusBtn.addEventListener('click', () => this.startAutofocus());
        this.stopFocusBtn.addEventListener('click', () => this.stopAutofocus());

        // Add listeners for Header Buttons (Simulation)
        this.btnPlay?.addEventListener('click', () => this.startCapture());
        this.btnStop?.addEventListener('click', () => this.stopCapture());
        this.btnCapture?.addEventListener('click', () => this.singleShot());
        this.btnRecord?.addEventListener('click', () => this.startRecording());
        this.btnTrigger?.addEventListener('click', () => this.softwareTrigger());
        document.getElementById('btn-settings')?.addEventListener('click', () => alert("模拟：打开设置面板（未实现）"));

        // Panel Buttons
        this.selectConfigBtn?.addEventListener('click', () => alert("模拟：打开文件选择器选择配置文件"));
        this.selectFolderBtn?.addEventListener('click', () => alert("模拟：打开文件夹选择器选择保存路径"));
        this.enableRoiBtn?.addEventListener('click', () => this.toggleROI());
        this.confirmRoiBtn?.addEventListener('click', () => {
            if (this.pendingRoiRect) {
                this.finalRoiRect = this.pendingRoiRect;
                this.pendingRoiRect = null;
                console.log('ROI 已确认:', this.finalRoiRect);
                this.simulatedImage.style.cursor = 'default'; // Change cursor back after confirm
                this.updateControlStates(this.isConnected);
                 // Keep overlay showing the confirmed ROI
                 this.drawFinalRoiOverlay();
                 this.applyBlur(this.calculateClarity(this.currentZ)); // Apply blur effect based on confirmed ROI
            }
        });
        this.redrawRoiBtn?.addEventListener('click', () => {
             this.pendingRoiRect = null;
             this.finalRoiRect = null; // Also clear confirmed ROI if redraw is chosen
             this.roiOverlay.style.display = 'none';
             this.simulatedImage.style.cursor = 'crosshair'; // Set cursor for drawing
             console.log('请求重新绘制 ROI');
             this.updateControlStates(this.isConnected);
             // User can now click and drag again
             this.applyBlur(this.calculateClarity(this.currentZ)); // Re-apply blur based on global center
         });

        // --- Calibration Listener ---
        this.calibrateBtn?.addEventListener('click', () => {
            if (this.calibrateBtn.disabled) return;
            this.startCalibration();
        });
        // ------------------------

        // --- Clear Axis Listener ---
        this.clearAxisBtn?.addEventListener('click', () => {
            if (this.clearAxisBtn.disabled) return;
            this.clearAxisConfig();
        });
        // -------------------------

        // --- View Toggle Listener ---
        this.toggleViewBtn?.addEventListener('click', () => {
            if (this.toggleViewBtn.disabled) return;
            this.toggleCalibrationView();
        });
        // --------------------------

        // Close dropdown if clicking outside
        document.body.addEventListener('click', (e) => {
            if (this.isAxisDropdownVisible &&
                !this.axisDropdown.contains(e.target) &&
                e.target !== this.configAxisBtn) {
                this.hideAxisDropdown();
            }
        });

        this.simulatedImage.addEventListener('mousemove', (e) => {
            const rect = this.simulatedImage.getBoundingClientRect();
            // Adjust coordinates based on image's natural size vs displayed size if needed
            const scaleX = this.simulatedImage.naturalWidth / rect.width;
            const scaleY = this.simulatedImage.naturalHeight / rect.height;
            const x = Math.round((e.clientX - rect.left) * scaleX);
            const y = Math.round((e.clientY - rect.top) * scaleY);
            // Clamp coordinates to image bounds
            const clampedX = Math.max(0, Math.min(x, this.simulatedImage.naturalWidth));
            const clampedY = Math.max(0, Math.min(y, this.simulatedImage.naturalHeight));
            this.statusBarMouse.textContent = `${clampedX}, ${clampedY}`;
        });
        this.simulatedImage.addEventListener('mouseleave', () => {
             this.statusBarMouse.textContent = `---, ---`;
        });

        // Property Table Change Listener (Example - Needs connecting to backend)
        this.propertyTableBody.addEventListener('change', async (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
                const row = e.target.closest('tr');
                if (!row) return;
                const propName = row.cells[0].textContent;
                const propValue = e.target.value;
                console.log(`前端: 属性更改: ${propName} = ${propValue}`);

                // --- Call Backend to Set Property ---
                try {
                    const response = await fetch(`${this.backendUrl}/set_property`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ name: propName, value: propValue })
                    });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    if (result.status === 'ok') {
                         console.log(`后端确认: ${propName} 设置为 ${result.value}`);
                         // Optionally update UI element again if backend modified the value
                         // e.target.value = result.value;
                    } else {
                         console.error(`后端设置属性失败: ${result.message}`);
                         // Revert UI? Show error?
                    }
                } catch (error) {
                     console.error(`设置属性时网络错误: ${error}`);
                     // Revert UI? Show error?
                }
                // ------------------------------------
            }
        });

        // --- ROI Drawing Listeners ---
        this.simulatedImage.addEventListener('mousedown', (e) => {
            if (!this.roiEnabled || !this.isConnected || this.isFocusing || this.isCapturing || this.isRecording) return;
            e.preventDefault(); // Prevent default image drag behavior

            this.isDrawingRoi = true;
            const coords = this.getImageCoordinates(e);
            this.roiStartX = coords.x;
            this.roiStartY = coords.y;
            this.currentRoiX = coords.x; // Initialize current pos
            this.currentRoiY = coords.y;
            this.finalRoiRect = null; // Clear previous final ROI
            this.updateRoiOverlay(); // Show initial small dot or update overlay
            console.log(`开始绘制 ROI @ (${this.roiStartX.toFixed(0)}, ${this.roiStartY.toFixed(0)})`);
        });

        document.addEventListener('mousemove', (e) => { // Listen on document to capture mouse leaving image
            if (!this.isDrawingRoi || !this.roiEnabled) return;
            
            const coords = this.getImageCoordinates(e);
            this.currentRoiX = coords.x;
            this.currentRoiY = coords.y;
            this.updateRoiOverlay(); // Update overlay during drag
        });

        document.addEventListener('mouseup', (e) => { // Listen on document
            if (!this.isDrawingRoi || !this.roiEnabled) return;

            this.isDrawingRoi = false;
            const finalCoords = this.getImageCoordinates(e);
            const x = Math.min(this.roiStartX, finalCoords.x);
            const y = Math.min(this.roiStartY, finalCoords.y);
            const width = Math.abs(this.roiStartX - finalCoords.x);
            const height = Math.abs(this.roiStartY - finalCoords.y);

            if (width > 5 && height > 5) { // Require a minimum size
                this.pendingRoiRect = { x, y, width, height };
                console.log(`ROI 绘制完成，等待确认:`, this.pendingRoiRect);
                // Keep overlay visible, update buttons
                this.updateControlStates(this.isConnected);
            } else {
                console.log('ROI 绘制无效 (太小)，已取消。');
                this.roiOverlay.style.display = 'none';
                this.pendingRoiRect = null;
                this.updateControlStates(this.isConnected); // Reset buttons
            }
        });
        // -----------------------------

        // --- Serial Number Selection Listener ---
        this.serialNumberSelect?.addEventListener('change', () => {
            this.updateControlStates(this.isConnected); // Update connect button state based on selection
        });
        // ----------------------------------
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

        this.isConnected = state.isConnected;

        if (this.isConnected) {
            this.serialNumberSelect.innerHTML = `<option value="${state.serialNumber}">${state.serialNumber}</option>`;
            this.configFileInput.value = state.configFile || '';
            this.savePathInput.value = state.savePath || '';
            this.cameraNameInput.value = state.cameraName || '';
            this.cameraModelInput.value = state.cameraModel || '';
            this.currentZ = state.currentZ;
            this.currentClarity = state.clarity;
            this.footerZPos.textContent = this.currentZ.toFixed(2);
            this.currentZInput.value = this.currentZ.toFixed(2);
            this.clarityValueInput.value = this.currentClarity.toFixed(3);
            this.applyBlur(this.currentClarity);

            // Populate Properties Table 
            this.propertyTableBody.innerHTML = '';
            const properties = state.properties || {};
            for (const propName in properties) {
                const prop = properties[propName];
                const row = this.propertyTableBody.insertRow();
                const nameCell = row.insertCell();
                const valueCell = row.insertCell();
                nameCell.textContent = propName;
                let control; 
                if (prop.type === 'select') {
                    control = document.createElement('select');
                    (prop.options || []).forEach(opt => { 
                        const option = document.createElement('option'); 
                        option.value = opt; option.textContent = opt; control.appendChild(option); 
                    });
                    control.value = prop.value;
                } else if (prop.type === 'number' || prop.type === 'range') {
                    control = document.createElement('input');
                    control.type = prop.type; control.value = prop.value;
                    if (prop.min !== undefined) control.min = prop.min;
                    if (prop.max !== undefined) control.max = prop.max;
                    if (prop.step !== undefined) control.step = prop.step;
                } 
                if (control) { 
                    valueCell.appendChild(control);
                    control.disabled = !this.isConnected; 
                } 
            }
            this.populatePropertiesTable(properties); // Extracted logic

            // ROI Area
            // No longer setting input values. If backend sends ROI, store it.
            const roi = state.roiCoords; // Assuming backend sends {x, y, width, height}
            if (roi && typeof roi === 'object' && roi.width > 0 && roi.height > 0) {
                 this.finalRoiRect = roi; // Store it
                 // If ROI is also enabled in state, draw the initial overlay
                 if (state.roiEnabled) {
                     this.roiEnabled = true; // Make sure frontend knows
                     this.enableRoiBtn.textContent = "禁用ROI";
                     this.simulatedImage.style.cursor = 'crosshair';
                     // Need to calculate display coords and show overlay
                     // We need a function to draw based on finalRoiRect
                     this.drawFinalRoiOverlay();
                 } else {
                     this.roiEnabled = false;
                     this.enableRoiBtn.textContent = "启用ROI";
                     this.simulatedImage.style.cursor = 'default';
                     this.roiOverlay.style.display = 'none';
                 }
            } else {
                // No ROI from backend or invalid
                 this.finalRoiRect = null;
                 this.pendingRoiRect = null; // Ensure pending is also null
                 this.roiEnabled = state.roiEnabled || false; // Use backend state or default false
                 if (this.roiEnabled) {
                     this.enableRoiBtn.textContent = "禁用ROI";
                     this.simulatedImage.style.cursor = 'crosshair';
                     this.roiOverlay.style.display = 'none'; // Hide until drawn
                 } else {
                     this.enableRoiBtn.textContent = "启用ROI";
                     this.simulatedImage.style.cursor = 'default';
                     this.roiOverlay.style.display = 'none';
                 }
            }
            // Update selected Axis display
            this.updateConfigAxisButtonDisplay(state.selectedAxisId);

        } else {
            // Handle disconnected state (similar to resetUIData)
            this.resetUIData();
            this.applyBlur(1);
        }
    }

    // Extracted function to populate the properties table
    populatePropertiesTable(properties) {
        this.propertyTableBody.innerHTML = '';
        properties = properties || {};
        for (const propName in properties) {
            const prop = properties[propName];
            const row = this.propertyTableBody.insertRow();
            const nameCell = row.insertCell();
            const valueCell = row.insertCell();
            nameCell.textContent = propName;
            let control; 
            if (prop.type === 'select') {
                control = document.createElement('select');
                (prop.options || []).forEach(opt => { 
                    const option = document.createElement('option'); 
                    option.value = opt; option.textContent = opt; control.appendChild(option); 
                });
                control.value = prop.value;
            } else if (prop.type === 'number' || prop.type === 'range') {
                control = document.createElement('input');
                control.type = prop.type; control.value = prop.value;
                if (prop.min !== undefined) control.min = prop.min;
                if (prop.max !== undefined) control.max = prop.max;
                if (prop.step !== undefined) control.step = prop.step;
            } 
            if (control) { 
                valueCell.appendChild(control);
                control.disabled = !this.isConnected; 
            } 
        }
    }

    // Helper to update config axis button text/title
    async updateConfigAxisButtonDisplay(axisId) {
        this.selectedAxisId = axisId;
        if (this.selectedAxisId) {
            try {
                const axesResp = await fetch(`${this.backendUrl}/api/axes`);
                if (axesResp.ok) {
                    const axesList = await axesResp.json();
                    const axisInfo = axesList.find(a => a.id === this.selectedAxisId);
                    if (axisInfo) {
                        this.configAxisBtn.textContent = `轴:${axisInfo.name}`;
                        this.configAxisBtn.title = `当前配置轴: ${axisInfo.name} (ID: ${this.selectedAxisId})`;
                    } else { throw new Error('Axis ID not found in list'); }
                } else { throw new Error('Failed to fetch axes for name'); }
            } catch (axesError) {
                console.warn('Could not fetch axis name for display:', axesError);
                this.configAxisBtn.textContent = `轴:${this.selectedAxisId}`;
                this.configAxisBtn.title = `当前配置轴 ID: ${this.selectedAxisId}`;
            }
        } else {
            this.configAxisBtn.textContent = `配置轴`; 
            this.configAxisBtn.title = `配置相机Z轴`;
        }
    }

    // --- Helper for coordinate calculation relative to image --- 
    getImageCoordinates(event) {
        const rect = this.simulatedImage.getBoundingClientRect();
        const scaleX = this.simulatedImage.naturalWidth / rect.width;
        const scaleY = this.simulatedImage.naturalHeight / rect.height;

        // Calculate mouse position relative to the image element's top-left corner
        let clientX = event.clientX;
        let clientY = event.clientY;

        // Adjust for touch events if necessary (basic example)
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        }

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        // Clamp coordinates to image bounds
        const clampedX = Math.max(0, Math.min(x, this.simulatedImage.naturalWidth));
        const clampedY = Math.max(0, Math.min(y, this.simulatedImage.naturalHeight));

        return { x: clampedX, y: clampedY };
    }

    updateRoiOverlay() {
        if (!this.roiOverlay) return; // Check if overlay exists first

        // Ensure overlay is visible and styled correctly during drawing or when pending
        if (this.isDrawingRoi || this.pendingRoiRect) {
             this.roiOverlay.style.opacity = 1;
             this.roiOverlay.style.backgroundColor = 'transparent';
             this.roiOverlay.style.display = 'block';
        } else if (!this.finalRoiRect) {
            // Hide if not drawing, not pending, and not confirmed
             this.roiOverlay.style.opacity = 0;
             this.roiOverlay.style.display = 'none';
             return; // No need to calculate position if hidden
        }
        // If confirmed, opacity/bg is handled by applyBlur, just ensure display is block here if needed
        else if (this.finalRoiRect && this.roiOverlay.style.display === 'none') {
             this.roiOverlay.style.display = 'block';
        }

        // Only proceed with position calculation if drawing
        if (!this.isDrawingRoi && !this.pendingRoiRect && !this.finalRoiRect) return; // Exit if not needed

        const imgRect = this.simulatedImage.getBoundingClientRect();
        const viewElement = this.simulatedImage.closest('.camera-view'); // Get the positioning parent
        if (!viewElement) return; // Add check for viewElement
        const viewRect = viewElement.getBoundingClientRect(); // Re-add viewRect acquisition

        const scaleX = imgRect.width / this.simulatedImage.naturalWidth;
        const scaleY = imgRect.height / this.simulatedImage.naturalHeight;

        // Calculate image offset relative to the .camera-view parent
        const imgOffsetX = imgRect.left - viewRect.left;
        const imgOffsetY = imgRect.top - viewRect.top;

        // Calculate display coordinates based on start and current *image* coordinates
        const startDispX = this.roiStartX * scaleX;
        const startDispY = this.roiStartY * scaleY;
        const currentDispX = this.currentRoiX * scaleX;
        const currentDispY = this.currentRoiY * scaleY;

        // Handle drawing in any direction
        const dispL = Math.min(startDispX, currentDispX);
        const dispT = Math.min(startDispY, currentDispY);
        const dispW = Math.abs(startDispX - currentDispX);
        const dispH = Math.abs(startDispY - currentDispY);

        // Position relative to the .camera-view container
        this.roiOverlay.style.left = `${imgOffsetX + dispL}px`;
        this.roiOverlay.style.top = `${imgOffsetY + dispT}px`;
        this.roiOverlay.style.width = `${dispW}px`;
        this.roiOverlay.style.height = `${dispH}px`;
        this.roiOverlay.style.display = 'block';
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
            this.calibrationPatternDisplay.style.display = 'block';
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
        this.calibrationPatternDisplay.style.display = 'block';
        this.toggleViewBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 显示相机视图';
        this.isShowingCalibrationPattern = true;
    }

    switchToCameraView() {
        console.log("切换到相机视图");
        this.calibrationPatternDisplay.style.display = 'none';
        this.calibrationPatternDisplay.innerHTML = ''; // Clear SVG
        this.simulatedImage.style.display = 'block';
        this.toggleViewBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 显示标定板';
        this.isShowingCalibrationPattern = false;
    }
    // -------------------------

    // New helper function to draw the overlay based on finalRoiRect OR pendingRoiRect
    drawFinalRoiOverlay() {
        // Determine which ROI to draw (confirmed takes precedence)
        const rectToDraw = this.finalRoiRect || this.pendingRoiRect;

        if (!rectToDraw || !this.roiOverlay || !this.roiEnabled) {
            if(this.roiOverlay) this.roiOverlay.style.display = 'none';
            return;
        }

        const imgRect = this.simulatedImage.getBoundingClientRect();
        const viewElement = this.simulatedImage.closest('.camera-view'); // Get the positioning parent
        if (!viewElement) return;
        const viewRect = viewElement.getBoundingClientRect();

        const scaleX = imgRect.width / this.simulatedImage.naturalWidth;
        const scaleY = imgRect.height / this.simulatedImage.naturalHeight;

        // Calculate image offset relative to the .camera-view parent
        const imgOffsetX = imgRect.left - viewRect.left;
        const imgOffsetY = imgRect.top - viewRect.top;

        // Calculate display coordinates from stored rectToDraw
        const dispL = rectToDraw.x * scaleX;
        const dispT = rectToDraw.y * scaleY;
        const dispW = rectToDraw.width * scaleX;
        const dispH = rectToDraw.height * scaleY;

        // Position relative to the .camera-view container
        this.roiOverlay.style.left = `${imgOffsetX + dispL}px`;
        this.roiOverlay.style.top = `${imgOffsetY + dispT}px`;
        this.roiOverlay.style.width = `${dispW}px`;
        this.roiOverlay.style.height = `${dispH}px`;
        this.roiOverlay.style.display = 'block';
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

    getEffectiveBestZ() {
        let refX, refY;
        if (this.roiEnabled && this.finalRoiRect) {
            // Use ROI center
            refX = this.finalRoiRect.x + this.finalRoiRect.width / 2;
            refY = this.finalRoiRect.y + this.finalRoiRect.height / 2;
        } else {
            // Use image center (default global focus point)
            refX = this.simulatedImage.naturalWidth / 2;
            refY = this.simulatedImage.naturalHeight / 2;
        }
        const quadrant = this.getCoordinateQuadrant(refX, refY);
        return this.QUADRANT_BEST_Z[quadrant] || 15.0; // Fallback Z
    }
    // -----------------------------------------
}

// Initialize the controller when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Modify this if your CameraController relies on backend data for init
    // Maybe fetch initial status here or inside the constructor
    new CameraController();
}); 