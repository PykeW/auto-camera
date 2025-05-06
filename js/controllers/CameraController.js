import { UIManager } from '../views/UIManager.js';

export class CameraController {
    constructor() {
        // --- Create UI Manager Instance ---
        this.uiManager = new UIManager();

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
        this.currentClarity = this.calculateClarity(target);

        // Directly update only Z, Clarity, and Blur, without calling updateUIFromState
        const currentZStr = typeof this.currentZ === 'number' ? this.currentZ.toFixed(2) : '--';
        if (this.uiManager.footerZPos) { this.uiManager.footerZPos.textContent = currentZStr; }
        if (this.uiManager.currentZInput) { this.uiManager.currentZInput.value = currentZStr; }
        if (!this.isShowingCalibrationPattern) { // Only apply blur if not showing pattern
            // Call UIManager's method, passing maxBlur
            this.uiManager.applyBlur(this.currentClarity, this.MAX_BLUR);
        }
        
        // In a real scenario, this would involve communication and waiting
        return true; // Assume movement finishes instantly
    }

    // --- Connection and Initialization ---
    async connectCamera() {
        if (this.isConnected || this.connectionProcessId) return;
        console.log("开始连接相机 (请求后端)..." );
        this.uiManager.connectBtn.textContent = "连接中...";
        this.uiManager.connectBtn.disabled = true;
        this.uiManager.footerStatus.textContent = "状态: 连接中...";
        this.connectionProcessId = true;

        try {
            const connectResponse = await fetch(`${this.backendUrl}/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({}) // Send serial number if needed: { serialNumber: this.uiManager.serialNumberSelect.value })
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
            // Ensure the select element reflects the connected camera SN (might be redundant if backend sends full state)
            if (this.uiManager.serialNumberSelect && backendState.serialNumber) {
                 let found = false;
                 for(let i=0; i<this.uiManager.serialNumberSelect.options.length; i++){
                     if(this.uiManager.serialNumberSelect.options[i].value === backendState.serialNumber){
                         this.uiManager.serialNumberSelect.selectedIndex = i;
                         found = true;
                         break;
                     }
                 }
                 if (!found) { // Add if not in list (might happen on first connect)
                    const newOption = new Option(backendState.serialNumber, backendState.serialNumber, false, true);
                    this.uiManager.serialNumberSelect.appendChild(newOption);
                 }
            }
            this.selectedAxisId = backendState.selectedAxisId;

            this.updateUIFromState(backendState);
            this.updateControlStates(true);
            // this.updateFocusStatus(backendState.focusStatus || '空闲'); // updateUIFromState handles this now

            this.uiManager.footerStatus.textContent = "状态: 已连接";
            this.uiManager.connectBtn.textContent = "断开连接";

        } catch(error) {
             console.error("连接相机时出错:", error);
             this.uiManager.footerStatus.textContent = `状态: 连接失败 (${error.message})`;
             this.isConnected = false;
             this.updateControlStates(false);
             this.uiManager.serialNumberSelect.disabled = false;
        } finally {
             this.uiManager.connectBtn.disabled = this.isFocusing || this.isCapturing || this.isRecording;
             this.connectionProcessId = null;
        }

        if (this.isConnected) {
            this.loadState();
        }
    }

    async disconnectCamera() {
        if (!this.isConnected || this.connectionProcessId) return;
        console.log("断开相机连接 (请求后端)...");
        this.uiManager.connectBtn.textContent = "断开中...";
        this.uiManager.connectBtn.disabled = true;
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

            const backendState = await response.json(); // Expect backend to return the new disconnected state
            console.log("后端确认断开连接，状态:", backendState);

            this.stopAutofocus(); // Stop any ongoing focus
            this.stopCapture();   // Stop any ongoing capture/recording (if implemented)

            this.updateUIFromState(backendState); // Update UI based on the state returned by backend
            this.updateControlStates(false);
            // this.updateFocusStatus('未连接'); // updateUIFromState handles this
            if (this.uiManager.focusRoiOverlay) this.uiManager.focusRoiOverlay.style.display = 'none'; // Hide ROI on disconnect
            if (this.uiManager.enableCalibRoiBtn) this.uiManager.enableCalibRoiBtn.textContent = "启用对焦ROI"; // Reset button text (if exists)
            this.hideAxisDropdown(); // Ensure dropdown is hidden
            console.log("前端状态已更新为断开");
            this.fetchAvailableCameras(); // Refresh camera list

            // --- Reset UI State related to Calibration ROI --- 
            this.pendingCalibRoiRect = null;
            this.finalCalibRoiRect = null;
            this.isInCalibRoiDrawMode = false;
            this.isDrawingCalibRoi = false;
            if (this.uiManager.calibRoiOverlay) this.uiManager.calibRoiOverlay.style.display = 'none';
            if (this.uiManager.calibrationPatternDisplay) this.uiManager.calibrationPatternDisplay.style.cursor = 'default';

        } catch (error) {
            console.error("断开相机时出错:", error);
            alert(`断开连接时出错: ${error.message}`);
            // Try to reset button state even on error
            if (this.isConnected) {
                 this.uiManager.connectBtn.textContent = "断开连接";
            } else {
                 this.uiManager.connectBtn.textContent = "连接";
            }
        } finally {
             this.uiManager.connectBtn.disabled = this.isFocusing || this.isCapturing || this.isRecording;
             this.connectionProcessId = null;
        }
        this.saveState(); // Save disconnected state (e.g., no selected axis)
    }

    // Enables/disables controls based on connection status AND other states
    updateControlStates(connected) {
        console.log(`[updateControlStates] Called with connected: ${connected}`);
        const isIdle = connected && !this.isFocusing && !this.isCapturing && !this.isRecording;
        const canStartActivity = isIdle;

        const hasSelectedCamera = this.uiManager.serialNumberSelect && this.uiManager.serialNumberSelect.value !== '';
        const canConnect = !this.isConnected && hasSelectedCamera && !this.connectionProcessId;
        console.log(`[updateControlStates] hasSelectedCamera: ${hasSelectedCamera}, isConnected: ${this.isConnected}, connectionProcessId: ${this.connectionProcessId}, Calculated canConnect: ${canConnect}`);

        let connectBtnDisabled = true; // Default to disabled
        if (this.uiManager.connectBtn) {
             connectBtnDisabled = !(canConnect || this.isConnected) || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;
             this.uiManager.connectBtn.disabled = connectBtnDisabled;
             this.uiManager.connectBtn.textContent = this.isConnected ? "断开" : "连接";
        }

        if(this.uiManager.serialNumberSelect) this.uiManager.serialNumberSelect.disabled = this.isConnected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;

        const isIdleAndConnected = this.isConnected && !this.isFocusing && !this.isCapturing && !this.isRecording && !this.isCalibrating;
        if(this.uiManager.btnPlay) this.uiManager.btnPlay.disabled = !canStartActivity || this.isCapturing || this.isRecording || this.isCalibrating;
        if(this.uiManager.btnStop) this.uiManager.btnStop.disabled = !(this.isCapturing || this.isRecording);
        if(this.uiManager.btnCapture) this.uiManager.btnCapture.disabled = !canStartActivity || this.isCapturing || this.isRecording || this.isCalibrating;
        if(this.uiManager.btnRecord) this.uiManager.btnRecord.disabled = !canStartActivity || this.isCapturing || this.isRecording || this.isCalibrating;
        if(this.uiManager.btnTrigger) this.uiManager.btnTrigger.disabled = !canStartActivity || this.isCapturing || this.isRecording || this.isCalibrating;

        this.uiManager.panelControls.forEach(ctrl => {
             // Simplified exclusion for testing, refine if needed
             const coreControls = ['connect-btn', 'serial-number'];
             if (!coreControls.includes(ctrl.id)) { // Apply general disabled state
                 // We need finer control for buttons that should be enabled in specific states
                 // ctrl.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording || this.isCalibrating;
             }
        });
        
        // Example: Refine specific button states here (this part needs full review later)
        // ... (rest of the updateControlStates logic for other buttons) ...

        console.log(`[updateControlStates] Finished. connectBtn disabled: ${connectBtnDisabled}`);
    }

    // --- Event Listeners ---
    initializeEventListeners() {
        // Use uiManager references for adding listeners
        if (this.uiManager.connectBtn) {
             this.uiManager.connectBtn.addEventListener('click', () => {
                if (this.isConnected) {
                    this.disconnectCamera();
                } else {
                    this.connectCamera();
                }
            });
        }

        if (this.uiManager.serialNumberSelect) {
             this.uiManager.serialNumberSelect.addEventListener('change', () => {
                console.log('[Change Listener] Camera selection changed:', this.uiManager.serialNumberSelect.value);
                console.log('[Change Listener] Calling updateControlStates with isConnected:', this.isConnected);
                this.updateControlStates(this.isConnected);
            });
        }

        this.uiManager.configAxisBtn?.addEventListener('click', (e) => {
             e.stopPropagation();
             this.fetchAndShowAxisDropdown();
         });

        this.uiManager.startFocusBtn?.addEventListener('click', () => this.startAutofocus());
        this.uiManager.stopFocusBtn?.addEventListener('click', () => this.stopAutofocus());

        this.uiManager.btnPlay?.addEventListener('click', () => this.startCapture());
        this.uiManager.btnStop?.addEventListener('click', () => this.stopCapture());
        this.uiManager.btnCapture?.addEventListener('click', () => this.singleShot());
        this.uiManager.btnRecord?.addEventListener('click', () => this.startRecording());
        this.uiManager.btnTrigger?.addEventListener('click', () => this.softwareTrigger());
        document.getElementById('btn-settings')?.addEventListener('click', () => alert("模拟：打开设置面板（未实现）")); // Keep direct if not managed by UIManager

        this.uiManager.selectConfigBtn?.addEventListener('click', () => alert("模拟：打开文件选择器选择配置文件"));
        this.uiManager.selectFolderBtn?.addEventListener('click', () => alert("模拟：打开文件夹选择器选择保存路径"));

        // ROI Drawing listeners - might need adjustment based on where state is managed
        this.uiManager.simulatedImage?.addEventListener('mousedown', this.handleRoiMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleRoiMouseMove.bind(this)); // Global listeners remain on document/window
        document.addEventListener('mouseup', this.handleRoiMouseUp.bind(this));

        this.uiManager.drawRoiFocusBtn?.addEventListener('click', () => {
            console.log("点击绘制对焦 ROI 按钮");
            this.startFocusRoiDraw();
        });

        this.uiManager.confirmFocusRoiBtn?.addEventListener('click', this.confirmFocusRoi.bind(this));
        this.uiManager.redrawFocusRoiBtn?.addEventListener('click', () => {
             console.log("点击重绘对焦 ROI 按钮");
             this.startFocusRoiDraw(true);
        });
        this.uiManager.clearFocusRoiBtn?.addEventListener('click', this.clearFocusRoi.bind(this));
        this.uiManager.toggleFocusRoiVisibilityBtn?.addEventListener('click', this.toggleFocusRoiVisibility.bind(this));

        this.uiManager.calibrateBtn?.addEventListener('click', () => {
            if (this.uiManager.calibrateBtn.disabled) return;
            this.startCalibration();
        });
        this.uiManager.toggleViewBtn?.addEventListener('click', () => {
            if (this.uiManager.toggleViewBtn.disabled) return;
            this.toggleCalibrationView();
        });

        this.uiManager.clearAxisBtn?.addEventListener('click', () => {
            if (this.uiManager.clearAxisBtn.disabled) return;
            this.clearAxisConfig();
        });

        document.body.addEventListener('click', (e) => {
            if (this.isAxisDropdownVisible &&
                this.uiManager.axisDropdown && !this.uiManager.axisDropdown.contains(e.target) &&
                e.target !== this.uiManager.configAxisBtn) {
                this.hideAxisDropdown();
            }
        });

        // Mouse position update
        this.uiManager.simulatedImage?.addEventListener('mousemove', (e) => {
            const rect = this.uiManager.simulatedImage.getBoundingClientRect();
            const scaleX = this.uiManager.simulatedImage.naturalWidth / rect.width;
            const scaleY = this.uiManager.simulatedImage.naturalHeight / rect.height;
            const x = Math.round((e.clientX - rect.left) * scaleX);
            const y = Math.round((e.clientY - rect.top) * scaleY);
            const clampedX = Math.max(0, Math.min(x, this.uiManager.simulatedImage.naturalWidth));
            const clampedY = Math.max(0, Math.min(y, this.uiManager.simulatedImage.naturalHeight));
            if(this.uiManager.statusBarMouse) this.uiManager.statusBarMouse.textContent = `${clampedX}, ${clampedY}`;
        });
        this.uiManager.simulatedImage?.addEventListener('mouseleave', () => {
             if(this.uiManager.statusBarMouse) this.uiManager.statusBarMouse.textContent = `---, ---`;
        });

        // Calibration ROI listeners
        this.uiManager.drawCalibRoiBtn?.addEventListener('click', () => this.enableCalibRoi());
        this.uiManager.confirmCalibRoiBtn?.addEventListener('click', () => this.confirmCalibRoi());
        this.uiManager.redrawCalibRoiBtn?.addEventListener('click', () => this.redrawCalibRoi());

        this.uiManager.toggleCalibRoiVisibilityBtn?.addEventListener('click', () => {
            if(this.uiManager.toggleCalibRoiVisibilityBtn.disabled) return;
            this.isCalibRoiVisible = !this.isCalibRoiVisible;
             console.log(`校准 ROI 可见性切换为: ${this.isCalibRoiVisible}`);
            this.updateCalibRoiControlsUI(); // This method will eventually move to UIManager
        });
    }

    getEffectiveBestZ() {
        let refX, refY;
        if (this.finalRoiRect) {
            refX = this.finalRoiRect.x + this.finalRoiRect.width / 2;
            refY = this.finalRoiRect.y + this.finalRoiRect.height / 2;
        } else if (this.uiManager.simulatedImage && this.uiManager.simulatedImage.naturalWidth > 0) {
            refX = this.uiManager.simulatedImage.naturalWidth / 2;
            refY = this.uiManager.simulatedImage.naturalHeight / 2;
        } else {
             console.warn("Cannot get effective Z: simulated image dimensions not available.");
             return 15.0; // Default Z
        }
        const quadrant = this.getCoordinateQuadrant(refX, refY);
        return this.QUADRANT_BEST_Z[quadrant] || 15.0;
    }

    handleRoiMouseDown(event) {
        if (this.focusRoiState !== 'drawing' || this.isShowingCalibrationPattern) return;

        const imageRect = this.uiManager.simulatedImage?.getBoundingClientRect();
        if (!imageRect || event.clientX < imageRect.left || event.clientX > imageRect.right || event.clientY < imageRect.top || event.clientY > imageRect.bottom) {
            return;
        }
        event.preventDefault();

        this.isDrawingRoi = true;
        const coords = this.getImageCoordinates(event, this.uiManager.simulatedImage);
        if (!coords) {
            this.isDrawingRoi = false;
            return;
        }
        this.roiStartX = coords.x;
        this.roiStartY = coords.y;
        this.pendingRoiRect = { x: this.roiStartX, y: this.roiStartY, width: 0, height: 0 };
        this.updateRoiOverlay(); // Will move to UIManager
        console.log("Focus ROI Mouse Down - Start Drawing");
    }

    handleRoiMouseMove(event) {
        if (!this.isDrawingRoi || this.focusRoiState !== 'drawing' || this.isShowingCalibrationPattern) return;

        const coords = this.getImageCoordinates(event, this.uiManager.simulatedImage);
        if (!coords) return;
        this.currentRoiX = coords.x;
        this.currentRoiY = coords.y;

        const x = Math.min(this.roiStartX, this.currentRoiX);
        const y = Math.min(this.roiStartY, this.currentRoiY);
        const width = Math.abs(this.currentRoiX - this.roiStartX);
        const height = Math.abs(this.currentRoiY - this.roiStartY);

        this.pendingRoiRect = { x, y, width, height };
        this.updateRoiOverlay(); // Will move to UIManager
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

        if (this.uiManager.simulatedImage) {
            this.uiManager.simulatedImage.style.cursor = 'default';
        }
        this.updateRoiControlsUI(); // Will move to UIManager
        this.updateRoiOverlay(); // Will move to UIManager
        console.log("Focus ROI Mouse Up");
    }

    // --- Initial Setup ---
    initUI() {
        // Methods inside initUI will be moved or adapted for UIManager
        this.updateControlStates(false);
        this.fetchAvailableCameras();

        if (this.uiManager.simulatedImage) {
            this.uiManager.simulatedImage.onload = () => {
                if(this.uiManager.statusBarImageDims) this.uiManager.statusBarImageDims.textContent = `${this.uiManager.simulatedImage.naturalWidth}, ${this.uiManager.simulatedImage.naturalHeight}`;
                this.updateRoiOverlay();
                this.updateCalibRoiOverlay();
            };
            // Ensure dimensions are updated if image is already loaded/cached
            if (this.uiManager.simulatedImage.complete && this.uiManager.simulatedImage.naturalWidth > 0) {
                 if(this.uiManager.statusBarImageDims) this.uiManager.statusBarImageDims.textContent = `${this.uiManager.simulatedImage.naturalWidth}, ${this.uiManager.simulatedImage.naturalHeight}`;
            }
        }

        // Initial draw/hide of overlays and controls
        this.updateRoiOverlay();
        this.updateCalibRoiOverlay();
        this.updateRoiControlsUI();
        this.updateCalibRoiControlsUI();
        this.loadState(); // Load saved state after initial UI setup
        // Call again after loadState to reflect potentially loaded ROI
        this.updateRoiOverlay();
        this.updateCalibRoiOverlay();
    }

    getImageCoordinates(event, targetElement) {
        if (!targetElement) {
            console.error("getImageCoordinates: targetElement is missing!");
            return { x: 0, y: 0 }; // Return default or null?
        }

        const rect = targetElement.getBoundingClientRect();

        // Check if it's the SVG container or the image
        const isSvgElement = targetElement.tagName?.toLowerCase() === 'svg' || targetElement === this.uiManager.calibrationPatternDisplay;
        const naturalWidth = isSvgElement ? rect.width : targetElement.naturalWidth;
        const naturalHeight = isSvgElement ? rect.height : targetElement.naturalHeight;

        if (rect.width === 0 || rect.height === 0 || naturalWidth === 0 || naturalHeight === 0) {
            console.warn("getImageCoordinates: Invalid dimensions for target element or rect.", { rect, naturalWidth, naturalHeight });
            return null;
        }

        const scaleX = naturalWidth / rect.width;
        const scaleY = naturalHeight / rect.height;

        // Handle both mouse and touch events
        let clientX = event.clientX;
        let clientY = event.clientY;
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        }
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        // Clamp coordinates to image/svg bounds
        const clampedX = Math.max(0, Math.min(x, naturalWidth));
        const clampedY = Math.max(0, Math.min(y, naturalHeight));

        return { x: clampedX, y: clampedY };
    }

    updateRoiOverlay() {
        if (!this.uiManager.focusRoiOverlay || !this.uiManager.simulatedImage || !this.uiManager.simulatedImage.parentElement || this.isShowingCalibrationPattern) {
             if(this.uiManager.focusRoiOverlay) this.uiManager.focusRoiOverlay.style.display = 'none';
             return;
        }

        let rectToDraw = null;
        let isVisible = false;

        // Determine which ROI to draw based on state
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
            const overlay = this.uiManager.focusRoiOverlay;
            const image = this.uiManager.simulatedImage;
            const imageRect = image.getBoundingClientRect();
            const container = image.parentElement;
            const containerRect = container.getBoundingClientRect();
            const naturalWidth = image.naturalWidth;
            const naturalHeight = image.naturalHeight;

            if (imageRect.width > 0 && imageRect.height > 0 && naturalWidth > 0 && naturalHeight > 0) {
                const scaleX = imageRect.width / naturalWidth;
                const scaleY = imageRect.height / naturalHeight;

                // Calculate display coordinates relative to the container
                const displayX = (imageRect.left - containerRect.left) + (rectToDraw.x * scaleX);
                const displayY = (imageRect.top - containerRect.top) + (rectToDraw.y * scaleY);
                const displayW = rectToDraw.width * scaleX;
                const displayH = rectToDraw.height * scaleY;

                overlay.style.left = `${displayX}px`;
                overlay.style.top = `${displayY}px`;
                overlay.style.width = `${displayW}px`;
                overlay.style.height = `${displayH}px`;
                overlay.style.opacity = '1'; // Make it visible
                overlay.style.display = 'block';
            } else {
                overlay.style.display = 'none'; // Hide if image dimensions are invalid
            }
        } else {
            this.uiManager.focusRoiOverlay.style.display = 'none';
            this.uiManager.focusRoiOverlay.style.opacity = '0'; // Also set opacity to 0
        }
    }

    updateCalibRoiOverlay() {
        if (!this.uiManager.calibRoiOverlay || !this.uiManager.calibrationPatternDisplay || !this.uiManager.calibrationPatternDisplay.parentElement) {
             if(this.uiManager.calibRoiOverlay) this.uiManager.calibRoiOverlay.style.display = 'none';
             return;
        }

        if (!this.isShowingCalibrationPattern) {
              this.uiManager.calibRoiOverlay.style.display = 'none';
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
             const overlay = this.uiManager.calibRoiOverlay;
             const patternDisplay = this.uiManager.calibrationPatternDisplay;
             const patternRect = patternDisplay.getBoundingClientRect();
             const container = patternDisplay.parentElement;
             const containerRect = container.getBoundingClientRect();

             // SVG/pattern coordinates are often direct, no naturalWidth/Height needed
             const naturalWidth = patternRect.width;
             const naturalHeight = patternRect.height;

             if (patternRect.width > 0 && patternRect.height > 0) {
                 const scaleX = 1; // Assuming pattern display matches container size directly
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
             this.uiManager.calibRoiOverlay.style.display = 'none';
             this.uiManager.calibRoiOverlay.style.opacity = '0';
         }
     }

    // --- New Calibration Simulation Logic ---
    async startCalibration() {
        if (this.isCalibrating || this.isFocusing || this.isCapturing || this.isRecording || !this.isConnected || this.uiManager.focusStatusText.textContent !== '已对焦') {
            console.warn('无法开始当量计算：状态不满足 (需要连接、已对焦、空闲)');
            return;
        }

        console.log("--------- 开始当量计算流程 --------- ");
        this.isCalibrating = true;
        this.uiManager.footerStatus.textContent = "状态: 当量计算中...";
        this.updateControlStates(true);
        this.uiManager.calibrationResultValue.textContent = "计算中...";
        if (!this.isShowingCalibrationPattern) {
            this.switchToPatternView(); // This handles UI switching
        }

        // Store calibration process ID for potential cancellation
        const processId = `calib_${Date.now()}`;
        this.calibrationProcessId = processId;

        try {
            console.log("模拟: (已显示标准棋盘格图像)");
            await this.wait(this.CALIBRATION_DELAY / 3, 'calibrationProcessId');
            if (this.calibrationProcessId !== processId) throw new Error("校准已取消");

            console.log("模拟: 捕获图像并分析棋盘格特征...");
            await this.wait(this.CALIBRATION_DELAY / 3, 'calibrationProcessId');
            if (this.calibrationProcessId !== processId) throw new Error("校准已取消");
            console.log(`模拟: 检测到特征间距为 ${this.SIMULATED_SQUARE_SIZE_PX} 像素`);

            const knownSquareSizeMm = parseFloat(this.uiManager.calibSquareSizeInput.value);
            if (isNaN(knownSquareSizeMm) || knownSquareSizeMm <= 0) {
                console.error("输入的方格尺寸无效:", this.uiManager.calibSquareSizeInput.value);
                throw new Error("输入的方格尺寸无效");
            }

            this.calibrationRatio = this.SIMULATED_SQUARE_SIZE_PX / knownSquareSizeMm;
            console.log(`计算当量: ${this.SIMULATED_SQUARE_SIZE_PX} px / ${knownSquareSizeMm} mm = ${this.calibrationRatio.toFixed(2)} pixels/mm`);
            this.uiManager.calibrationResultValue.textContent = `${this.calibrationRatio.toFixed(2)} px/mm`;
            await this.wait(this.CALIBRATION_DELAY / 3, 'calibrationProcessId');
            if (this.calibrationProcessId !== processId) throw new Error("校准已取消");

            console.log("--------- 当量计算流程完成 --------- ");
            this.saveState(); // Save the calculated ratio

        } catch (error) {
            console.error("当量计算过程中出错:", error);
            this.uiManager.calibrationResultValue.textContent = `计算失败`;
            // Optionally show an alert or notification
            // alert(`当量计算失败: ${error.message}`);
        } finally {
            console.log("模拟: 当量计算状态结束");
            this.isCalibrating = false;
            this.calibrationProcessId = null; // Clear the process ID
            this.uiManager.footerStatus.textContent = this.isConnected ? "状态: 已连接" : "状态: 未连接";
            this.updateControlStates(this.isConnected);
        }
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
        this.uiManager.simulatedImage.style.display = 'none';
        this.uiManager.calibrationPatternDisplay.innerHTML = this.CHECKERBOARD_SVG;
        this.uiManager.calibrationPatternDisplay.style.display = 'flex';
        this.uiManager.toggleViewBtn.innerHTML = '<i class="fas fa-camera"></i> 显示相机视图';
        this.isShowingCalibrationPattern = true;
        if (this.focusRoiState === 'drawing') {
           this.cancelFocusRoiDraw(); // Cancel focus ROI if drawing when switching
        }
        // Update overlays and controls for the new view
        this.updateRoiOverlay();
        this.updateCalibRoiOverlay();
        this.updateControlStates(this.isConnected);
        this.updateCalibRoiControlsUI();
    }

    switchToCameraView() {
        console.log("切换到相机视图");
        this.uiManager.calibrationPatternDisplay.style.display = 'none';
        this.uiManager.calibrationPatternDisplay.innerHTML = ''; // Clear SVG
        this.uiManager.simulatedImage.style.display = 'block';
        this.uiManager.toggleViewBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 显示标定板';
        this.isShowingCalibrationPattern = false;
        if (this.isInCalibRoiDrawMode) {
            this.cancelCalibRoiDraw(); // Cancel calibration ROI if drawing when switching
        }
        // Update overlays and controls for the new view
        this.updateCalibRoiOverlay();
        this.updateRoiOverlay();
        this.updateControlStates(this.isConnected);
        this.updateCalibRoiControlsUI();
    }
    // -------------------------

    // --- Autofocus Logic ---
    async startAutofocus() {
        if (this.isFocusing || !this.isConnected || !this.selectedAxisId) return;

        console.log("--------- 开始自动对焦流程 --------- ");
        this.isFocusing = true;
        this.bestZFound = null; // Reset previous best Z
        let bestClarityRough = -1;
        let bestZRough = null;
        this.updateFocusStatus('初始化检查'); // Method defined below
        await this.wait(this.INIT_DELAY);

        try {
            this.updateFocusStatus('请求Z轴控制权');
            // In real app, await backend call here
            await this.wait(this.CONTROL_REQUEST_DELAY);

            this.updateFocusStatus('粗对焦中');
            console.log('粗对焦: 扫描范围', this.Z_RANGE, '步长', this.Z_STEP_ROUGH);
            for (let z = this.Z_RANGE.min; z <= this.Z_RANGE.max; z += this.Z_STEP_ROUGH) {
                if (!this.isFocusing) throw new Error('对焦已手动停止');
                await this.simulateZMovement(z);
                const clarity = this.currentClarity; // Use the value calculated in simulateZMovement
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
                const currentZFine = parseFloat(z.toFixed(2)); // Use precise float for comparison
                if (!this.isFocusing) throw new Error('对焦已手动停止');
                await this.simulateZMovement(currentZFine);
                const clarity = this.currentClarity; // Use value from simulateZMovement
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
            await this.wait(this.CONTROL_REQUEST_DELAY); // Simulate time for movement and settling

            this.updateFocusStatus('保存参数中');
            this.saveState(); // Save the best Z found
            await this.wait(this.SAVE_DELAY);

           this.updateFocusStatus('已对焦');
           console.log("--------- 自动对焦流程成功完成 --------- ");

        } catch (error) {
            console.error("自动对焦过程中出错:", error);
            if (this.isFocusing) {
                // If error occurred during focusing, not due to manual stop
                this.updateFocusStatus('错误');
                alert(`自动对焦失败: ${error.message}`);
            } else {
                // If error is '对焦已手动停止'
                this.updateFocusStatus('已停止');
            }
        } finally {
            this.isFocusing = false;
            this.focusProcessId = null; // Clear the process ID
            this.updateControlStates(this.isConnected);
        }
    }

    stopAutofocus() {
        if (!this.isFocusing) return;
        console.log("请求停止自动对焦...");
        this.isFocusing = false; // Set flag immediately
        // Cancel any pending wait timer associated with autofocus
        if (this.focusProcessId) {
             clearTimeout(this.focusProcessId);
             this.focusProcessId = null;
             console.log("自动对焦定时器已清除。");
        }
        this.updateControlStates(this.isConnected); // Update buttons immediately
         // Update status via UIManager
        this.uiManager.updateFocusStatus('已停止');
        console.log("停止信号已发送。对焦循环将在下一次检查时退出。");
    }
    // ---------------------

    // --- 获取并显示轴配置下拉列表 ---
    async fetchAndShowAxisDropdown() {
        if (!this.isConnected) return;

        if (this.isAxisDropdownVisible) {
            this.hideAxisDropdown(); // Call the controller's logic hiding method
            return;
        }

        console.log("模拟: 开始获取轴列表...");
        // Show dropdown visuals via UIManager
        this.uiManager.showAxisDropdownVisuals();
        this.isAxisDropdownVisible = true;

        // Simulate backend fetch
        try {
            // Use a specific process ID for axis fetching cancellation
            await this.wait(400, 'axisFetchProcessId');
            // Simulated axis data
            const availableAxes = [
                { id: 'PLC_Axis_Z1', name: '龙门 Z 轴' },
                { id: 'PLC_Axis_Z2', name: '旋转台 Z 轴' },
                { id: 'PLC_Axis_A1', name: '辅助轴 A' },
                { id: 'SimulatedZ', name: '模拟 Z 轴' },
            ];
            console.log("模拟: 获取到轴列表:", availableAxes);

            // Populate dropdown via UIManager
            this.uiManager.populateAxisDropdown(availableAxes);
            
            // Add event listeners after populating
            this.uiManager.axisListUl.querySelectorAll('li[data-axis-id]').forEach(li => {
                 li.addEventListener('click', () => this.selectAxis(li.dataset.axisId));
            });

        } catch (error) {
            // Check if error is due to cancellation (stop during wait)
            if (error.message.includes('Stopped during wait')) {
                 console.log("模拟: 轴列表获取被取消。");
            } else {
                 console.error("模拟: 获取轴列表时出错:", error);
                 // Set error state via UIManager
                 this.uiManager.setAxisDropdownError();
            }
        }
    }

    hideAxisDropdown() {
        // Cancel any pending axis fetch timer if dropdown is hidden
        if (this.axisFetchProcessId) {
             clearTimeout(this.axisFetchProcessId);
             this.axisFetchProcessId = null;
        }
        // Hide visuals via UIManager
        this.uiManager.hideAxisDropdownVisuals();
        this.isAxisDropdownVisible = false;
    }

    selectAxis(axisId) {
        console.log(`选择了轴: ${axisId}`);
        this.selectedAxisId = axisId;
        // Update button via UIManager
        this.uiManager.updateConfigAxisButtonDisplay(axisId);
        this.hideAxisDropdown(); // Use controller method to hide
        this.updateControlStates(this.isConnected); // Update button states based on selection
        this.saveState(); // Save the newly selected axis
        console.log("模拟: 已将选定的轴保存到状态。");
    }

    async clearAxisConfig() {
        console.log("清空轴配置...");
        const oldAxisId = this.selectedAxisId;
        this.selectedAxisId = null;
        // Update button via UIManager
        this.uiManager.updateConfigAxisButtonDisplay(null);
        this.updateControlStates(this.isConnected); // Update button states

        try {
            // Simulate backend call to clear config for the specific camera
            console.log(`模拟: 通知后端清空轴配置 (相机: ${this.uiManager.serialNumberSelect.value}, 原轴ID: ${oldAxisId})`);
            // In a real app, you might await a fetch call here
            // await fetch(`${this.backendUrl}/clear_axis_config`, { method: 'POST', body: JSON.stringify({ serialNumber: this.uiManager.serialNumberSelect.value }) });
            alert("模拟: 轴配置已清空"); // Placeholder confirmation
        } catch (error) {
            console.error("模拟: 清空轴配置时后端通信出错:", error);
            alert("模拟: 清空轴配置时发生错误");
            // Optional: Revert UI changes if backend call fails?
            // this.selectedAxisId = oldAxisId;
            // this.uiManager.updateConfigAxisButtonDisplay(oldAxisId);
            // this.updateControlStates(this.isConnected);
        }
        this.saveState(); // Save the cleared state
    }

    saveState() {
        if (!this.isConnected || !this.uiManager.serialNumberSelect.value) return;
        const cameraSN = this.uiManager.serialNumberSelect.value;
        const stateToSave = {
            selectedAxisId: this.selectedAxisId,
            bestZFound: this.bestZFound,
            calibrationRatio: this.calibrationRatio,
            // Save ROI state? Depends on requirements
            // finalFocusRoi: this.finalRoiRect,
            // finalCalibRoi: this.finalCalibRoiRect,
            // calibSquareSize: parseFloat(this.uiManager.calibSquareSizeInput.value)
        };
        try {
            localStorage.setItem(`cameraState_${cameraSN}`, JSON.stringify(stateToSave));
            console.log(`状态已保存到 localStorage (相机: ${cameraSN}):`, stateToSave);
        } catch (e) {
            console.error("保存状态到 localStorage 时出错:", e);
        }
    }

    loadState() {
        if (!this.isConnected || !this.uiManager.serialNumberSelect.value) return;
        const cameraSN = this.uiManager.serialNumberSelect.value;
        try {
            const savedStateJSON = localStorage.getItem(`cameraState_${cameraSN}`);
            if (savedStateJSON) {
                const savedState = JSON.parse(savedStateJSON);
                console.log(`从 localStorage 加载状态 (相机: ${cameraSN}):`, savedState);

                // Restore state properties
                if (savedState.hasOwnProperty('selectedAxisId')) {
                    this.selectedAxisId = savedState.selectedAxisId;
                    // Update UI via UIManager
                    this.uiManager.updateConfigAxisButtonDisplay(this.selectedAxisId);
                }
                if (savedState.hasOwnProperty('bestZFound')) {
                    this.bestZFound = savedState.bestZFound;
                    // Potentially update focus status if best Z implies 'Focused'
                    // if (this.bestZFound !== null) { this.uiManager.updateFocusStatus('已对焦'); }
                }
                if (savedState.hasOwnProperty('calibrationRatio')) {
                    this.calibrationRatio = savedState.calibrationRatio;
                    // Update UI via UIManager
                    if (this.calibrationRatio !== null && this.uiManager.calibrationResultValue) {
                        this.uiManager.calibrationResultValue.textContent = `${this.calibrationRatio.toFixed(2)} px/mm`;
                    }
                }
                // Restore ROI state if saved
                // if (savedState.finalFocusRoi) { this.finalRoiRect = savedState.finalFocusRoi; this.focusRoiState = 'confirmed'; }
                // if (savedState.finalCalibRoi) { this.finalCalibRoiRect = savedState.finalCalibRoi; /* Update state? */ }
                // if (savedState.calibSquareSize) { this.uiManager.calibSquareSizeInput.value = savedState.calibSquareSize; }

                this.updateControlStates(this.isConnected); // Update controls based on loaded state
                // Need to redraw overlays based on loaded ROI state
                this.updateRoiOverlay();
                this.updateCalibRoiOverlay();
            } else {
                console.log(`未找到相机 ${cameraSN} 的已保存状态。`);
                // Apply default state if no saved state?
                this.resetUIData(); // Reset relevant parts
            }
        } catch (e) {
            console.error("从 localStorage 加载状态时出错:", e);
            // Handle error, maybe clear corrupted state?
            // localStorage.removeItem(`cameraState_${cameraSN}`);
            this.resetUIData();
        }
    }

    resetUIData() {
        // Clear text inputs and status displays managed by UIManager
        if (this.uiManager.configFileInput) this.uiManager.configFileInput.value = '';
        if (this.uiManager.savePathInput) this.uiManager.savePathInput.value = '';
        if (this.uiManager.cameraNameInput) this.uiManager.cameraNameInput.value = '';
        if (this.uiManager.cameraModelInput) this.uiManager.cameraModelInput.value = '';
        if (this.uiManager.currentZInput) this.uiManager.currentZInput.value = '--';
        if (this.uiManager.clarityValueInput) this.uiManager.clarityValueInput.value = '--';
        if (this.uiManager.footerZPos) this.uiManager.footerZPos.textContent = '--';

        // Reset internal ROI state
        this.finalRoiRect = null;
        this.pendingRoiRect = null;
        this.focusRoiState = 'idle';
        this.updateRoiOverlay();    // Update overlay (will hide)
        this.updateRoiControlsUI(); // Update buttons (will hide confirm/redraw etc.)

        // Reset internal Calibration ROI state
        this.finalCalibRoiRect = null;
        this.pendingCalibRoiRect = null;
        this.isInCalibRoiDrawMode = false;
        this.isDrawingCalibRoi = false;
        this.updateCalibRoiOverlay();
        this.updateCalibRoiControlsUI();

        // Reset other state
        this.selectedAxisId = null;
        // Reset axis button text via UIManager
        this.uiManager.updateConfigAxisButtonDisplay(null);

        if (this.uiManager.calibrationResultValue) this.uiManager.calibrationResultValue.textContent = '-- px/mm';
        // Reset camera properties? Depends on desired behavior on disconnect
    }

    // --- Fetch Available Cameras ---
    async fetchAvailableCameras() {
        console.log("正在获取可用相机列表...");
        this.uiManager.showCameraSelectLoading(); // Use UIManager method

        try {
            // Simulate backend fetch
            await this.wait(300);
            const cameraList = ['SN_Sim_1', 'SN_Sim_2', 'SN_Backend_123', 'SN_Backend_456'];
            console.log("模拟: 获取到相机列表:", cameraList);

            // Populate dropdown via UIManager
            this.uiManager.populateCameraDropdown(cameraList);

            // Set dropdown enabled/disabled state via UIManager
            const hasCameras = cameraList && cameraList.length > 0;
            this.uiManager.setCameraSelectReady(hasCameras);

            // Update other control states (like connect button)
            this.updateControlStates(this.isConnected);

        } catch (error) {
            console.error("获取可用相机列表失败:", error);
            this.uiManager.setCameraSelectError(); // Use UIManager method
        }
    }
    // -------------------------------

    // --- Helper functions for Quadrant Logic ---
    getCoordinateQuadrant(imageX, imageY) {
        if (!this.uiManager.simulatedImage || !this.uiManager.simulatedImage.naturalWidth) {
             console.warn("Cannot get quadrant: simulated image dimensions not available.");
             return 'TL'; // Default
        }
        const midX = this.uiManager.simulatedImage.naturalWidth / 2;
        const midY = this.uiManager.simulatedImage.naturalHeight / 2;
        if (imageX < midX && imageY < midY) return 'TL';
        if (imageX >= midX && imageY < midY) return 'TR';
        if (imageX < midX && imageY >= midY) return 'BL';
        if (imageX >= midX && imageY >= midY) return 'BR';
        return 'TL'; // Default fallback
    }

    // --- Calibration ROI Logic ---
    enableCalibRoi() {
        if (this.uiManager.drawCalibRoiBtn.disabled || !this.isConnected || !this.isShowingCalibrationPattern) return;

        console.log('启用校准 ROI 绘制模式');
        this.isInCalibRoiDrawMode = true;
        this.pendingCalibRoiRect = null; // Clear any pending rect
        this.isDrawingCalibRoi = false;

        if (this.uiManager.calibrationPatternDisplay) {
             this.uiManager.calibrationPatternDisplay.style.cursor = 'crosshair';
             // Add event listeners for drawing on the pattern display
             // Use .bind to maintain 'this' context
            if (!this.boundHandleCalibRoiMouseDown) {
                 this.boundHandleCalibRoiMouseDown = this.handleCalibRoiMouseDown.bind(this);
                 this.uiManager.calibrationPatternDisplay.addEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
            }
            // Move/Up listeners are added to window on mouse down
        }
        this.updateCalibRoiControlsUI(); // Update button states
    }

    handleCalibRoiMouseDown(event) {
        if (!this.isInCalibRoiDrawMode || this.isDrawingCalibRoi || !this.isShowingCalibrationPattern) return;

        event.preventDefault(); // Prevent text selection, etc.
        console.log("Calibration ROI Mouse Down - Start Drawing");
        this.isDrawingCalibRoi = true;
        const coords = this.getImageCoordinates(event, this.uiManager.calibrationPatternDisplay);
         if (!coords) {
             this.isDrawingCalibRoi = false;
             console.error("Calibration ROI Mouse Down - Failed to get coordinates.");
             return;
         }
        this.calibRoiStartX = coords.x;
        this.calibRoiStartY = coords.y;
        this.pendingCalibRoiRect = { x: this.calibRoiStartX, y: this.calibRoiStartY, width: 0, height: 0 };
        this.updateCalibRoiOverlay(); // Show initial dot

        // Add global listeners for move and up
        this.boundHandleCalibRoiMouseMove = this.handleCalibRoiMouseMove.bind(this);
        this.boundHandleCalibRoiMouseUp = this.handleCalibRoiMouseUp.bind(this);
        window.addEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
        window.addEventListener('mouseup', this.boundHandleCalibRoiMouseUp);
    }

    handleCalibRoiMouseMove(event) {
        if (!this.isDrawingCalibRoi || !this.isInCalibRoiDrawMode || !this.isShowingCalibrationPattern) return;

        const coords = this.getImageCoordinates(event, this.uiManager.calibrationPatternDisplay);
        if (!coords) return;
        this.currentCalibRoiX = coords.x;
        this.currentCalibRoiY = coords.y;

        const x = Math.min(this.calibRoiStartX, this.currentCalibRoiX);
        const y = Math.min(this.calibRoiStartY, this.currentCalibRoiY);
        const width = Math.abs(this.currentCalibRoiX - this.calibRoiStartX);
        const height = Math.abs(this.currentCalibRoiY - this.calibRoiStartY);

        this.pendingCalibRoiRect = { x, y, width, height };
        this.updateCalibRoiOverlay(); // Update overlay as mouse moves
    }

    handleCalibRoiMouseUp(event) {
        if (!this.isDrawingCalibRoi || !this.isInCalibRoiDrawMode || !this.isShowingCalibrationPattern) return;

        console.log("Calibration ROI Mouse Up");
        this.isDrawingCalibRoi = false;
        this.isInCalibRoiDrawMode = false; // Drawing mode ends on mouse up

        // Remove global listeners
        if (this.boundHandleCalibRoiMouseMove) window.removeEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
        if (this.boundHandleCalibRoiMouseUp) window.removeEventListener('mouseup', this.boundHandleCalibRoiMouseUp);

        // Reset cursor
        if (this.uiManager.calibrationPatternDisplay) {
            this.uiManager.calibrationPatternDisplay.style.cursor = 'default';
        }

        // Validate drawn rectangle size
        if (this.pendingCalibRoiRect && (this.pendingCalibRoiRect.width < 5 || this.pendingCalibRoiRect.height < 5)) {
            console.log('Calibration ROI 绘制尺寸过小，未设置');
            this.pendingCalibRoiRect = null; // Discard small rect
        } else if (this.pendingCalibRoiRect) {
            console.log('Calibration ROI 绘制完成，等待确认:', this.pendingCalibRoiRect);
            // State is now 'drawn' implicitly by having a pending rect
        } else {
            console.log('Calibration ROI mouse up without valid rect.');
            this.pendingCalibRoiRect = null;
        }

        this.updateCalibRoiOverlay(); // Update overlay (might hide if rect discarded)
        this.updateCalibRoiControlsUI(); // Update buttons (show confirm/redraw)
    }

    confirmCalibRoi() {
        if (this.uiManager.confirmCalibRoiBtn.disabled || !this.pendingCalibRoiRect || !this.isShowingCalibrationPattern) return;

        this.finalCalibRoiRect = { ...this.pendingCalibRoiRect }; // Copy pending to final
        this.pendingCalibRoiRect = null; // Clear pending
        console.log('校准 ROI 已确认:', this.finalCalibRoiRect);
        // Reset cursor (might be redundant, but safe)
        if (this.uiManager.calibrationPatternDisplay) this.uiManager.calibrationPatternDisplay.style.cursor = 'default';
        this.isInCalibRoiDrawMode = false; // Ensure drawing mode is off
        this.isCalibRoiVisible = true; // Make sure it's visible after confirming
        this.updateCalibRoiOverlay(); // Redraw with final styles
        this.updateCalibRoiControlsUI(); // Update buttons (hide confirm, show redraw/toggle)
        // Optionally save state?
        // this.saveState();
    }

    redrawCalibRoi() {
        if (this.uiManager.redrawCalibRoiBtn.disabled || !this.isShowingCalibrationPattern) return;

        console.log('请求重新绘制校准 ROI');
        // Reset state variables related to calibration ROI
        this.pendingCalibRoiRect = null;
        this.finalCalibRoiRect = null;
        this.isInCalibRoiDrawMode = false;
        this.isDrawingCalibRoi = false;

        // Clean up listeners if any were left hanging (belt and suspenders)
        if (this.boundHandleCalibRoiMouseMove) window.removeEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
        if (this.boundHandleCalibRoiMouseUp) window.removeEventListener('mouseup', this.boundHandleCalibRoiMouseUp);
        if (this.uiManager.calibrationPatternDisplay && this.boundHandleCalibRoiMouseDown) {
            // Might need to remove the mousedown listener if re-adding in enableCalibRoi
            // this.uiManager.calibrationPatternDisplay.removeEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
            // this.boundHandleCalibRoiMouseDown = null; // Clear bound function reference
             this.uiManager.calibrationPatternDisplay.style.cursor = 'default';
        }

        // Update UI immediately
        this.updateCalibRoiOverlay(); // Hide existing overlay
        this.updateCalibRoiControlsUI(); // Reset buttons to initial state

        // Trigger the drawing process again
        this.enableCalibRoi();
    }
    // --------------------------

    // --- Focus ROI Actions --- (Mostly state management)
    cancelFocusRoiDraw() {
        // Only cancel if currently in 'drawing' state
        if (!this.isDrawingRoi || this.focusRoiState !== 'drawing') return;
        console.log("取消对焦 ROI 绘制");
        this.isDrawingRoi = false;
        this.focusRoiState = 'idle';
        if (this.uiManager.simulatedImage) {
            this.uiManager.simulatedImage.style.cursor = 'default';
        }
        this.pendingRoiRect = null; // Discard pending rect
        this.updateRoiOverlay(); // Hide overlay
        this.updateRoiControlsUI(); // Update buttons
    }

    cancelCalibRoiDraw() {
        // Only cancel if currently drawing
        if (!this.isDrawingCalibRoi || !this.isInCalibRoiDrawMode) return;
        console.log("取消校准 ROI 绘制");
        this.isDrawingCalibRoi = false;
        this.isInCalibRoiDrawMode = false;
        if (this.uiManager.calibrationPatternDisplay) {
            this.uiManager.calibrationPatternDisplay.style.cursor = 'default';
            // Remove window listeners added during mousedown
            if (this.boundHandleCalibRoiMouseMove) window.removeEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
            if (this.boundHandleCalibRoiMouseUp) window.removeEventListener('mouseup', this.boundHandleCalibRoiMouseUp);
        }
        this.pendingCalibRoiRect = null; // Discard pending rect
        this.updateCalibRoiOverlay(); // Hide overlay
        this.updateCalibRoiControlsUI(); // Update buttons
    }

    startFocusRoiDraw(isRedraw = false) {
        if (!this.isConnected || this.isFocusing || this.isCalibrating) return;
        if (isRedraw) {
            console.log("开始重绘对焦 ROI");
            this.finalRoiRect = null; // Clear confirmed ROI if redrawing
        } else {
            console.log("开始绘制对焦 ROI");
        }
        this.focusRoiState = 'drawing';
        this.pendingRoiRect = null; // Ensure no pending rect initially
        this.isDrawingRoi = false; // Reset internal drawing flag
        if (this.uiManager.simulatedImage) {
            this.uiManager.simulatedImage.style.cursor = 'crosshair'; // Set cursor
        }
        this.updateRoiOverlay(); // Ensure overlay is hidden initially
        this.updateRoiControlsUI(); // Update button visibility/state
    }

    clearFocusRoi() {
        if (this.focusRoiState === 'idle') return; // No ROI to clear

        console.log("清除对焦 ROI");
        this.focusRoiState = 'idle';
        this.finalRoiRect = null;
        this.pendingRoiRect = null;
        this.isDrawingRoi = false; // Ensure drawing flag is off
        this.isFocusRoiVisible = true; // Reset visibility preference
        if (this.uiManager.simulatedImage) {
            this.uiManager.simulatedImage.style.cursor = 'default'; // Reset cursor
        }
        this.updateRoiOverlay(); // Hide overlay
        this.updateRoiControlsUI(); // Update buttons
        // Optionally save state?
        // this.saveState();
    }

    confirmFocusRoi() {
        if (this.focusRoiState !== 'drawn' || !this.pendingRoiRect) return;

        this.finalRoiRect = { ...this.pendingRoiRect }; // Confirm by copying
        this.focusRoiState = 'confirmed';
        this.pendingRoiRect = null; // Clear pending
        this.isFocusRoiVisible = true; // Ensure visible on confirm

        console.log("对焦 ROI 已确认:", this.finalRoiRect);

        // Reset cursor
        if (this.uiManager.simulatedImage) {
             this.uiManager.simulatedImage.style.cursor = 'default';
        }

        this.updateRoiOverlay(); // Update overlay to confirmed style
        this.updateRoiControlsUI(); // Update button states
        // Optionally save state?
        // this.saveState();
    }

    toggleFocusRoiVisibility() {
        // Can only toggle if ROI is confirmed and not showing calibration pattern
        if (this.isShowingCalibrationPattern || !this.finalRoiRect || this.focusRoiState !== 'confirmed') return;

        this.isFocusRoiVisible = !this.isFocusRoiVisible;
        console.log(`对焦 ROI 可见性: ${this.isFocusRoiVisible}`);
        this.updateRoiOverlay(); // Update visual state
        this.updateRoiControlsUI(); // Update button icon/title
    }
    // ---------------------------

    // --- UI Update Methods (Candidates to move to UIManager) ---
    // These methods currently read controller state (`this.*`) and update UI elements (`this.uiManager.*`).
    // When moved to UIManager, they might need the relevant state passed as arguments.

    updateRoiControlsUI() {
        console.log(`[updateRoiControlsUI] State: ${this.focusRoiState}`);
        const canDraw = this.isConnected && !this.isFocusing && !this.isCalibrating;

        // Draw Button
        if (this.uiManager.drawRoiFocusBtn) {
            const shouldShowDraw = this.focusRoiState === 'idle';
            console.log(`[updateRoiControlsUI] Draw Button - Found: true, Should Show: ${shouldShowDraw}`);
            this.uiManager.drawRoiFocusBtn.style.display = shouldShowDraw ? 'inline-block' : 'none';
            this.uiManager.drawRoiFocusBtn.disabled = !canDraw;
        } else {
             console.warn("[updateRoiControlsUI] Draw Button (draw-roi-focus-btn) not found!");
        }

        // Button Group (Confirm, Redraw, Clear, Toggle Visibility)
        if (this.uiManager.focusRoiButtonGroup) {
            const shouldShowGroup = this.focusRoiState === 'drawn' || this.focusRoiState === 'confirmed';
             console.log(`[updateRoiControlsUI] Button Group - Found: true, Should Show: ${shouldShowGroup}`);
            this.uiManager.focusRoiButtonGroup.style.display = shouldShowGroup ? 'flex' : 'none';
        } else {
             console.warn("[updateRoiControlsUI] Button Group (focus-roi-button-group) not found!");
        }

        // Confirm Button (inside group)
        if (this.uiManager.confirmFocusRoiBtn) {
            const shouldShowConfirm = this.focusRoiState === 'drawn';
             console.log(`[updateRoiControlsUI] Confirm Button - Found: true, Should Show: ${shouldShowConfirm}`);
            this.uiManager.confirmFocusRoiBtn.style.display = shouldShowConfirm ? 'inline-block' : 'none';
            this.uiManager.confirmFocusRoiBtn.disabled = !canDraw;
        } else {
            console.warn("[updateRoiControlsUI] Confirm Button (confirm-roi-focus-btn) not found!");
        }

         // Redraw Button (inside group)
         if (this.uiManager.redrawFocusRoiBtn) {
             const shouldShowRedraw = this.focusRoiState === 'drawn' || this.focusRoiState === 'confirmed';
             this.uiManager.redrawFocusRoiBtn.style.display = shouldShowRedraw ? 'inline-block' : 'none';
             this.uiManager.redrawFocusRoiBtn.disabled = !canDraw;
         } else {
              console.warn("[updateRoiControlsUI] Redraw Button (redraw-roi-focus-btn) not found!");
         }

         // Clear Button (inside group)
         if (this.uiManager.clearFocusRoiBtn) {
             const shouldShowClear = this.focusRoiState === 'drawn' || this.focusRoiState === 'confirmed';
             this.uiManager.clearFocusRoiBtn.style.display = shouldShowClear ? 'inline-block' : 'none';
             this.uiManager.clearFocusRoiBtn.disabled = !canDraw;
         } else {
             console.warn("[updateRoiControlsUI] Clear Button (clear-roi-focus-btn) not found!");
         }

         // Toggle Visibility Button (inside group)
         if (this.uiManager.toggleFocusRoiVisibilityBtn) {
             const shouldShowToggle = this.focusRoiState === 'confirmed';
             this.uiManager.toggleFocusRoiVisibilityBtn.style.display = shouldShowToggle ? 'inline-block' : 'none';
             this.uiManager.toggleFocusRoiVisibilityBtn.disabled = !shouldShowToggle; // Only enabled when confirmed
             // Update icon based on visibility state
             const icon = this.uiManager.toggleFocusRoiVisibilityBtn.querySelector('i');
             if (icon) {
                 icon.className = this.isFocusRoiVisible ? 'fas fa-eye' : 'fas fa-eye-slash';
             }
             this.uiManager.toggleFocusRoiVisibilityBtn.title = this.isFocusRoiVisible ? "隐藏对焦ROI" : "显示对焦ROI";
         } else {
             console.warn("[updateRoiControlsUI] Toggle Visibility Button (toggle-focus-roi-visibility-btn) not found!");
         }
    }

    updateCalibRoiControlsUI() {
        const showCalibControls = this.isShowingCalibrationPattern;
        const canInteract = this.isConnected && !this.isFocusing && !this.isCalibrating;

        console.log(`[updateCalibRoiControlsUI] showCalibControls: ${showCalibControls}, pending: ${!!this.pendingCalibRoiRect}, final: ${!!this.finalCalibRoiRect}, drawingMode: ${this.isInCalibRoiDrawMode}`);

        // Hide all calibration ROI controls initially
        if (this.uiManager.drawCalibRoiBtn) this.uiManager.drawCalibRoiBtn.style.display = 'none';
        if (this.uiManager.calibRoiButtonGroup) this.uiManager.calibRoiButtonGroup.style.display = 'none';
        if (this.uiManager.confirmCalibRoiBtn) this.uiManager.confirmCalibRoiBtn.style.display = 'none';
        if (this.uiManager.redrawCalibRoiBtn) this.uiManager.redrawCalibRoiBtn.style.display = 'none';
        if (this.uiManager.toggleCalibRoiVisibilityBtn) this.uiManager.toggleCalibRoiVisibilityBtn.style.display = 'none';

        if (showCalibControls) {
            // State: Pending confirmation (rectangle drawn)
            if (this.pendingCalibRoiRect) {
                if (this.uiManager.calibRoiButtonGroup) this.uiManager.calibRoiButtonGroup.style.display = 'flex';
                if (this.uiManager.confirmCalibRoiBtn) {
                     this.uiManager.confirmCalibRoiBtn.style.display = 'inline-block';
                     this.uiManager.confirmCalibRoiBtn.disabled = !canInteract;
                }
                if (this.uiManager.redrawCalibRoiBtn) { // Allow redraw even when pending
                     this.uiManager.redrawCalibRoiBtn.style.display = 'inline-block';
                     this.uiManager.redrawCalibRoiBtn.disabled = !canInteract;
                }
             // State: Confirmed (rectangle exists and is final)
             } else if (this.finalCalibRoiRect) {
                 if (this.uiManager.calibRoiButtonGroup) this.uiManager.calibRoiButtonGroup.style.display = 'flex';
                 if (this.uiManager.redrawCalibRoiBtn) {
                     this.uiManager.redrawCalibRoiBtn.style.display = 'inline-block';
                     this.uiManager.redrawCalibRoiBtn.disabled = !canInteract;
                 }
                 if (this.uiManager.toggleCalibRoiVisibilityBtn) {
                     this.uiManager.toggleCalibRoiVisibilityBtn.style.display = 'inline-block';
                     this.uiManager.toggleCalibRoiVisibilityBtn.disabled = !this.finalCalibRoiRect || !canInteract;
                 }
             // State: Idle (no ROI drawn or confirmed)
             } else {
                 if (this.uiManager.drawCalibRoiBtn) {
                     this.uiManager.drawCalibRoiBtn.style.display = 'inline-block';
                     this.uiManager.drawCalibRoiBtn.disabled = !canInteract || this.isInCalibRoiDrawMode; // Disable if already in drawing mode
                 }
             }
        }
        // Ensure button state (icon/title) for toggle visibility is correct
        this.updateCalibRoiToggleButtonState();
    }

    updateCalibRoiToggleButtonState() {
        if (!this.uiManager.toggleCalibRoiVisibilityBtn) return;

        const icon = this.uiManager.toggleCalibRoiVisibilityBtn.querySelector('i');
        if (!icon) return;

        if (this.isCalibRoiVisible) {
            icon.className = 'fas fa-eye'; // Use className for simplicity
            this.uiManager.toggleCalibRoiVisibilityBtn.title = "隐藏校准ROI";
        } else {
            icon.className = 'fas fa-eye-slash';
            this.uiManager.toggleCalibRoiVisibilityBtn.title = "显示校准ROI";
        }
    }

    updateUIFromState(state) {
        if (!state) return;
        console.log('Backend state received in updateUIFromState:', JSON.stringify(state));

        this.isConnected = state.isConnected;

        if (this.isConnected) {
            // Update Camera Select Dropdown (if SN provided)
            if (this.uiManager.serialNumberSelect && state.serialNumber) {
                 let found = false;
                 for(let i=0; i<this.uiManager.serialNumberSelect.options.length; i++){
                     if(this.uiManager.serialNumberSelect.options[i].value === state.serialNumber){
                         this.uiManager.serialNumberSelect.selectedIndex = i;
                         found = true;
                         break;
                     }
                 }
                 if (!found) { // Add if not present
                    const newOption = new Option(state.serialNumber, state.serialNumber, false, true);
                    this.uiManager.serialNumberSelect.appendChild(newOption);
                 }
            } else if (this.uiManager.serialNumberSelect) {
                this.uiManager.serialNumberSelect.value = ''; // Select placeholder if no SN
            }

            // Update Info Fields
            if (this.uiManager.configFileInput) { this.uiManager.configFileInput.value = state.configFile || ''; }
            if (this.uiManager.savePathInput) { this.uiManager.savePathInput.value = state.savePath || ''; }
            if (this.uiManager.cameraNameInput) { this.uiManager.cameraNameInput.value = state.cameraName || ''; }
            if (this.uiManager.cameraModelInput) { this.uiManager.cameraModelInput.value = state.cameraModel || ''; }

            // Update Z and Clarity (handle undefined)
            this.currentZ = state.currentZ !== undefined ? state.currentZ : '--';
            this.currentClarity = state.clarity;

            const currentZStr = typeof this.currentZ === 'number' ? this.currentZ.toFixed(2) : '--';
            if (this.uiManager.footerZPos) { this.uiManager.footerZPos.textContent = currentZStr; }
            if (this.uiManager.currentZInput) { this.uiManager.currentZInput.value = currentZStr; }
            // Apply blur uses clarity, clarity input updated within applyBlur/updateFocusStatus
            if (!this.isShowingCalibrationPattern) {
                 // Call UIManager's method
                 this.uiManager.applyBlur(this.currentClarity, this.MAX_BLUR);
             }

            // Update Camera Properties (Example for Exposure, Gain, Trigger Mode)
            const properties = state.properties || {};
            const propsContainer = document.querySelector('.property-grid'); // Query here or cache in UIManager
            if(propsContainer){ // Check if container exists
                Object.entries(properties).forEach(([key, propData]) => {
                     // Example: Find elements by a more robust method if IDs change
                     const exposureInput = document.getElementById('exposure-time');
                     const gainInput = document.getElementById('gain');
                     const triggerSelect = document.getElementById('trigger-mode-select');

                     if (key === '曝光时间(us)' && exposureInput) {
                          exposureInput.value = propData.value;
                     } else if (key === '增益' && gainInput) {
                          gainInput.value = propData.value;
                     } else if (key === '触发模式' && triggerSelect) {
                         // Ensure the value exists as an option before setting
                         if ([...triggerSelect.options].some(opt => opt.value === propData.value)) {
                              triggerSelect.value = propData.value;
                         }
                     }
                     // Add more properties as needed
                });
            }

            // Update Focus ROI based on backend state
            if (state.roiCoords && state.roiEnabled !== false) {
                 // Assuming backend sends roiCoords in {l, t, r, b} format
                 // Convert to {x, y, width, height}
                 this.finalRoiRect = {
                      x: state.roiCoords.l,
                      y: state.roiCoords.t,
                      width: state.roiCoords.r - state.roiCoords.l,
                      height: state.roiCoords.b - state.roiCoords.t
                 };
                 this.focusRoiState = this.finalRoiRect ? 'confirmed' : 'idle';
                 this.isFocusRoiVisible = true; // Assume visible if sent
             } else {
                 this.finalRoiRect = null;
                 this.focusRoiState = 'idle';
             }
            this.pendingRoiRect = null; // Clear any pending local ROI

            // Update Focus Status Text and Style via UIManager
            this.uiManager.updateFocusStatus(state.focusStatus || '空闲');

            // Update Selected Axis
            this.selectedAxisId = state.selectedAxisId;
             // Update axis button text via UIManager
            this.uiManager.updateConfigAxisButtonDisplay(this.selectedAxisId);

            // Refresh Overlays and Controls based on the new state
            this.updateRoiOverlay();
            this.updateCalibRoiOverlay(); // Update even if not visible, state might change
            this.updateRoiControlsUI();
            this.updateCalibRoiControlsUI();

        } else { // If disconnected
            this.resetUIData(); // Clear UI fields
            if (!this.isShowingCalibrationPattern) {
                 // Call UIManager's method
                 this.uiManager.applyBlur(1, this.MAX_BLUR); // Set image to sharp (max clarity)
             }
             // Update status via UIManager
            this.uiManager.updateFocusStatus('未连接');
        }
        // Always update control enabled/disabled states based on the final connection status
        this.updateControlStates(this.isConnected);
    }

    // --- Method updateFocusStatus removed, moved to UIManager ---
    // updateFocusStatus(status) { ... }

    // -----------------------------------------
} // End Class