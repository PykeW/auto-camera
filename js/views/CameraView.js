export class CameraView {
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
    }

    applyBlur(clarity, maxBlur) {
        if (!this.simulatedImage) return;
        const blurValue = (1 - clarity) * maxBlur;
        this.simulatedImage.style.filter = `blur(${blurValue.toFixed(2)}px)`;
    }

    updateUI(isConnected, currentZ, currentClarity, calculateClarityFunc, applyBlurFunc) {
        if (this.currentZInput) this.currentZInput.value = isConnected ? currentZ.toFixed(2) : '--';
        if (this.footerZPos) this.footerZPos.textContent = isConnected ? currentZ.toFixed(2) : '--';

        let clarityToDisplay = '--';
        let clarityForBlur = 1; // No blur if disconnected

        if (isConnected) {
            const calculatedClarity = calculateClarityFunc(currentZ);
            clarityToDisplay = calculatedClarity.toFixed(3);
            clarityForBlur = calculatedClarity;
            if (this.clarityValueInput) this.clarityValueInput.value = clarityToDisplay;
            applyBlurFunc(clarityForBlur); // Call applyBlur via the passed function
        } else {
            if (this.clarityValueInput) this.clarityValueInput.value = '--';
            if (this.simulatedImage) this.simulatedImage.style.filter = 'none'; // Remove blur when disconnected
        }
    }

    // Central function to update status text and apply CSS class
    updateFocusStatusText(status) {
        if (!this.focusStatusText) return;
        this.focusStatusText.textContent = status;
        const className = `status-${status.replace(/[ /]/g, '-')}`;
        this.focusStatusText.className = className; // Only update class, button states handled elsewhere
    }

    // Enables/disables controls based on connection status AND other states
    updateControlStates(state) {
        const { 
            isConnected, 
            isFocusing, 
            isCapturing, 
            isRecording, 
            isCalibrating, 
            selectedAxisId, 
            focusRoiState, 
            pendingCalibRoiRect, 
            finalCalibRoiRect, 
            isShowingCalibrationPattern, 
            isInCalibRoiDrawMode, 
            isFocusRoiVisible, 
            isCalibRoiVisible, 
            connectionProcessId,
            serialNumberSelected,
            focusStatusText // Need the text content for one check
        } = state;

        const isIdle = isConnected && !isFocusing && !isCapturing && !isRecording && !isCalibrating;
        const canStartActivity = isIdle;

        const canConnect = !isConnected && serialNumberSelected && !connectionProcessId;
        if(this.connectBtn) this.connectBtn.disabled = !(canConnect || isConnected) || isFocusing || isCapturing || isRecording || isCalibrating || connectionProcessId;
        if(this.connectBtn) this.connectBtn.textContent = isConnected ? "断开" : "连接";

        if(this.serialNumberSelect) this.serialNumberSelect.disabled = isConnected || isFocusing || isCapturing || isRecording || isCalibrating || connectionProcessId;

        const isIdleAndConnected = isConnected && !isFocusing && !isCapturing && !isRecording && !isCalibrating;
        if(this.btnPlay) this.btnPlay.disabled = !canStartActivity || isCapturing || isRecording || isCalibrating;
        if(this.btnStop) this.btnStop.disabled = !(isCapturing || isRecording);
        if(this.btnCapture) this.btnCapture.disabled = !canStartActivity || isCapturing || isRecording || isCalibrating;
        if(this.btnRecord) this.btnRecord.disabled = !canStartActivity || isCapturing || isRecording || isCalibrating;
        if(this.btnTrigger) this.btnTrigger.disabled = !canStartActivity || isCapturing || isRecording || isCalibrating;

        this.panelControls.forEach(ctrl => {
             const excludedIds = ['connect-btn', 'start-focus-btn', 'stop-focus-btn', 'calibrate-btn', 'toggle-view-btn', 'confirm-roi-focus-btn', 'redraw-roi-focus-btn', 'calib-square-size'];
             if (!excludedIds.includes(ctrl.id) && !ctrl.classList.contains('header-button')) {
                  ctrl.disabled = !isConnected || isFocusing || isCapturing || isRecording || isCalibrating;
             }
        });

        if(this.selectConfigBtn) this.selectConfigBtn.disabled = !isConnected || isFocusing || isCapturing || isRecording || isCalibrating;
        if(this.selectFolderBtn) this.selectFolderBtn.disabled = !isConnected || isFocusing || isCapturing || isRecording || isCalibrating;

        if(this.startFocusBtn) this.startFocusBtn.disabled = !isIdle || !selectedAxisId || isCalibrating;
        if(this.stopFocusBtn) this.stopFocusBtn.disabled = !isFocusing;

        const focusComplete = isConnected && focusStatusText === '已对焦';
        if(this.calibrateBtn) this.calibrateBtn.disabled = !focusComplete || !selectedAxisId || isCapturing || isRecording || isCalibrating || isFocusing;

        if(this.toggleViewBtn) this.toggleViewBtn.disabled = !isConnected || isCalibrating || isFocusing;

        if(this.calibSquareSizeInput) this.calibSquareSizeInput.disabled = !isConnected || isCalibrating || isFocusing;

        const isFocusRoiPending = isConnected && focusRoiState === 'drawn';
        const hasFocusRoiConfirmed = isConnected && focusRoiState === 'confirmed';
        const canDrawRoi = isIdle && focusRoiState === 'idle';

        if (this.drawRoiFocusBtn) {
            this.drawRoiFocusBtn.disabled = !canDrawRoi || isCalibrating;
        }

        const canInteractWithRoi = isIdle && !isCalibrating;

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
                if (isFocusRoiVisible) {
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

        const isCalibRoiPending = isConnected && pendingCalibRoiRect;
        const hasCalibRoiConfirmed = isConnected && finalCalibRoiRect;
        const canEnableCalibRoi = isIdle && isShowingCalibrationPattern && !isInCalibRoiDrawMode && !hasCalibRoiConfirmed && !isCalibRoiPending;

        if (this.drawCalibRoiBtn) {
            this.drawCalibRoiBtn.disabled = !canEnableCalibRoi;
            this.drawCalibRoiBtn.style.display = (isShowingCalibrationPattern && !isCalibRoiPending && !hasCalibRoiConfirmed) ? 'inline-block' : 'none';
            if(isInCalibRoiDrawMode) this.drawCalibRoiBtn.disabled = true;
        }

        const calibRoiGroup = this.confirmCalibRoiBtn?.closest('.roi-button-group');
         if (calibRoiGroup) {
             calibRoiGroup.style.display = (isCalibRoiPending || hasCalibRoiConfirmed) ? 'flex' : 'none';
             if (this.confirmCalibRoiBtn) {
                 this.confirmCalibRoiBtn.disabled = !isCalibRoiPending;
                 this.confirmCalibRoiBtn.style.display = isCalibRoiPending ? 'inline-block' : 'none';
             }
             if (this.redrawCalibRoiBtn) {
                  const canRedrawCalib = isIdle && isShowingCalibrationPattern && (isCalibRoiPending || hasCalibRoiConfirmed);
                  this.redrawCalibRoiBtn.disabled = !canRedrawCalib;
                 this.redrawCalibRoiBtn.style.display = (isCalibRoiPending || hasCalibRoiConfirmed) ? 'inline-block' : 'none';
             }
              if (this.toggleCalibRoiVisibilityBtn) {
                 this.toggleCalibRoiVisibilityBtn.disabled = !hasCalibRoiConfirmed;
                 this.toggleCalibRoiVisibilityBtn.style.display = hasCalibRoiConfirmed ? 'inline-block' : 'none';
                 this.toggleCalibRoiVisibilityBtn.innerHTML = isCalibRoiVisible ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
                 this.toggleCalibRoiVisibilityBtn.title = isCalibRoiVisible ? '隐藏校准ROI' : '显示校准ROI';
             }
         }

        // Assuming property table controls should also be disabled during operations
        document.querySelectorAll('#property-table input, #property-table select').forEach(ctrl => {
             ctrl.disabled = !isConnected || isFocusing || isCapturing || isRecording || isCalibrating;
         });

        if (this.configAxisBtn) this.configAxisBtn.disabled = !isConnected || isFocusing || isCapturing || isRecording || isCalibrating;

        if (this.clearAxisBtn) this.clearAxisBtn.disabled = !isConnected || !selectedAxisId || isFocusing || isCapturing || isRecording || isCalibrating;

        // The last toggle visibility update seems redundant, but keeping for now 
        // if needed outside the calibRoiGroup block.
        if (this.toggleCalibRoiVisibilityBtn && !(calibRoiGroup?.contains(this.toggleCalibRoiVisibilityBtn))) {
            this.toggleCalibRoiVisibilityBtn.disabled = !hasCalibRoiConfirmed;
            this.toggleCalibRoiVisibilityBtn.style.display = hasCalibRoiConfirmed ? 'inline-block' : 'none';
            this.toggleCalibRoiVisibilityBtn.innerHTML = isCalibRoiVisible ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            this.toggleCalibRoiVisibilityBtn.title = isCalibRoiVisible ? '隐藏校准ROI' : '显示校准ROI';
        }
    }

    // UI Update methods will be moved here later
} 