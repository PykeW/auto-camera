class CalibrationController {
    constructor(cameraController) {
        this.cameraController = cameraController; // Reference to the main controller
        this.ui = cameraController.uiController; // Reference UI Controller if needed
        this.state = cameraController.state; // Reference shared state if needed

        // --- Calibration Elements ---
        this.calibrationPatternDisplay = document.getElementById('calibration-pattern-display');
        this.calibrationResultValue = document.getElementById('calibration-result-value');
        this.cameraDisplayContainer = document.getElementById('camera-display-container');
        this.toggleViewBtn = document.getElementById('toggle-view-btn');
        this.calibSquareSizeInput = document.getElementById('calib-square-size');

        // --- Calibration ROI Elements ---
        this.drawCalibRoiBtn = document.getElementById('draw-roi-calib-btn');
        this.calibRoiOverlay = document.getElementById('calibration-roi-overlay');
        this.confirmCalibRoiBtn = document.getElementById('confirm-roi-calib-btn');
        this.redrawCalibRoiBtn = document.getElementById('redraw-roi-calib-btn');
        this.toggleCalibRoiVisibilityBtn = document.getElementById('toggle-calib-roi-visibility-btn');
        this.calibRoiButtonGroup = document.getElementById('calib-roi-button-group');

        // --- Simulation Parameters (subset needed for calibration) ---
        this.CALIBRATION_DELAY = 1500; // ms total for simulated calibration steps
        this.SIMULATED_SQUARE_SIZE_PX = 37.5; // Simulated pixel size of square at best focus
        this.CHECKERBOARD_SVG = `<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="checkerboard" width="75" height="75" patternUnits="userSpaceOnUse"><rect width="37.5" height="37.5" fill="black"/><rect x="37.5" y="37.5" width="37.5" height="37.5" fill="black"/></pattern></defs><rect width="300" height="300" fill="white"/><rect width="300" height="300" fill="url(#checkerboard)"/><style>rect { stroke: grey; stroke-width: 0.5; }</style></svg>`;

        // --- State Variables ---
        this.isCalibrating = false;
        this.calibrationRatio = null; // Store calibration result
        this.isShowingCalibrationPattern = false;
        this.calibrationProcessId = null; // ID for calibration wait timer

        // --- Calibration ROI State ---
        this.isDrawingCalibRoi = false;      // Is mouse currently down for drawing Calib ROI
        this.isInCalibRoiDrawMode = false;   // Has user clicked "Enable Calib ROI" button
        this.calibRoiStartX = 0;
        this.calibRoiStartY = 0;
        this.currentCalibRoiX = 0;
        this.currentCalibRoiY = 0;
        this.finalCalibRoiRect = null;     // The confirmed calibration ROI
        this.pendingCalibRoiRect = null;    // The drawn calibration ROI waiting for confirmation
        this.isCalibRoiVisible = true; // Default to visible when exists

        this.initializeEventListeners();
        this.updateCalibRoiControlsUI(); // Initial UI state for controls
        this.updateCalibRoiOverlay();    // Initial overlay state
    }

    initializeEventListeners() {
        this.calibrateBtn = document.getElementById('calibrate-btn'); // Get reference here

        this.calibrateBtn?.addEventListener('click', () => {
            if (this.calibrateBtn.disabled) return;
            this.startCalibration();
        });
        this.toggleViewBtn?.addEventListener('click', () => {
            if (this.toggleViewBtn.disabled) return;
            this.toggleCalibrationView();
        });

        this.drawCalibRoiBtn?.addEventListener('click', () => this.enableCalibRoi());
        this.confirmCalibRoiBtn?.addEventListener('click', () => this.confirmCalibRoi());
        this.redrawCalibRoiBtn?.addEventListener('click', () => this.redrawCalibRoi());

        this.toggleCalibRoiVisibilityBtn?.addEventListener('click', () => {
            if(this.toggleCalibRoiVisibilityBtn.disabled) return;
            this.isCalibRoiVisible = !this.isCalibRoiVisible;
            console.log(`校准 ROI 可见性切换为: ${this.isCalibRoiVisible}`);
            this.updateCalibRoiControlsUI();
            this.updateCalibRoiOverlay(); // Update overlay visibility
        });

        // Mouse listeners for drawing need to be attached to the pattern display when enabled
        // See enableCalibRoi and handleCalibRoiMouseDown
    }

    // --- New Calibration Simulation Logic ---
    async startCalibration() {
        // Access shared state via cameraController or state object
        if (this.isCalibrating || this.cameraController.isFocusing || this.cameraController.isCapturing || this.cameraController.isRecording || !this.cameraController.isConnected || this.cameraController.focusController?.focusStatusText?.textContent !== '已对焦') {
            console.warn('无法开始当量计算：状态不满足 (需要连接、已对焦、空闲)');
            return;
        }

        console.log("--------- 开始当量计算流程 --------- ");
        this.isCalibrating = true;
        this.cameraController.updateFooterStatus("状态: 当量计算中..."); // Update via main controller
        this.cameraController.updateControlStates(); // Update global controls
        this.calibrationResultValue.textContent = "计算中...";
        if (!this.isShowingCalibrationPattern) {
            this.switchToPatternView(); // Ensure pattern is visible
        }


        try {
            console.log("模拟: (已显示标准棋盘格图像)");
            await this.cameraController.wait(this.CALIBRATION_DELAY / 3, 'calibrationProcessId', this); // Use shared wait

            console.log("模拟: 捕获图像并分析棋盘格特征...");
            await this.cameraController.wait(this.CALIBRATION_DELAY / 3, 'calibrationProcessId', this);
            console.log(`模拟: 检测到特征间距为 ${this.SIMULATED_SQUARE_SIZE_PX} 像素`);

            const knownSquareSizeMm = parseFloat(this.calibSquareSizeInput.value);
            if (isNaN(knownSquareSizeMm) || knownSquareSizeMm <= 0) {
                console.error("输入的方格尺寸无效:", this.calibSquareSizeInput.value);
                throw new Error("输入的方格尺寸无效");
            }

            this.calibrationRatio = this.SIMULATED_SQUARE_SIZE_PX / knownSquareSizeMm;
            console.log(`计算当量: ${this.SIMULATED_SQUARE_SIZE_PX} px / ${knownSquareSizeMm} mm = ${this.calibrationRatio.toFixed(2)} pixels/mm`);
            this.calibrationResultValue.textContent = `${this.calibrationRatio.toFixed(2)} px/mm`;
            await this.cameraController.wait(this.CALIBRATION_DELAY / 3, 'calibrationProcessId', this);

            console.log("--------- 当量计算流程完成 --------- ");

        } catch (error) {
             // Check if error is due to stopping
             if (error.message.includes('Stopped during wait') || error.message.includes('手动停止')) {
                 console.log("当量计算被停止。");
                 this.calibrationResultValue.textContent = `已停止`;
             } else {
                 console.error("当量计算过程中出错:", error);
                 this.calibrationResultValue.textContent = `计算失败`;
                 // Optionally alert the user
                 // alert(`当量计算失败: ${error.message}`);
             }
        } finally {
            console.log("模拟: 当量计算状态结束");
            this.isCalibrating = false;
            this.calibrationProcessId = null; // Clear process ID
            this.cameraController.updateFooterStatus(this.cameraController.isConnected ? "状态: 已连接" : "状态: 未连接");
            this.cameraController.updateControlStates(); // Update global controls
            this.cameraController.saveState(); // Save state via main controller
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
        // Notify main controller or UI controller to update overlays if needed
        this.cameraController.uiController?.updateFocusRoiOverlay(); // Example
        this.updateCalibRoiOverlay();
    }

    switchToPatternView() {
        console.log("切换到标定板视图");
        if (this.cameraController.simulatedImage) this.cameraController.simulatedImage.style.display = 'none';
        if (this.calibrationPatternDisplay) {
            this.calibrationPatternDisplay.innerHTML = this.CHECKERBOARD_SVG;
            this.calibrationPatternDisplay.style.display = 'flex'; // Use flex for centering if needed
        }
        if (this.toggleViewBtn) this.toggleViewBtn.innerHTML = '<i class="fas fa-camera"></i> 显示相机视图';
        this.isShowingCalibrationPattern = true;

        // Cancel focus ROI drawing if active
        this.cameraController.uiController?.cancelFocusRoiDraw();

        // Update overlays and controls
        this.cameraController.uiController?.updateFocusRoiOverlay();
        this.updateCalibRoiOverlay();
        this.cameraController.updateControlStates(); // Global controls
        this.updateCalibRoiControlsUI();      // Calibration specific controls
    }

    switchToCameraView() {
        console.log("切换到相机视图");
        if (this.calibrationPatternDisplay) {
            this.calibrationPatternDisplay.style.display = 'none';
            this.calibrationPatternDisplay.innerHTML = '';
        }
        if (this.cameraController.simulatedImage) this.cameraController.simulatedImage.style.display = 'block';
        if (this.toggleViewBtn) this.toggleViewBtn.innerHTML = '<i class="fas sync-alt"></i> 显示标定板';
        this.isShowingCalibrationPattern = false;

        // Cancel calibration ROI drawing if active
        if (this.isInCalibRoiDrawMode) {
            this.cancelCalibRoiDraw();
        }

        // Update overlays and controls
        this.updateCalibRoiOverlay();
        this.cameraController.uiController?.updateFocusRoiOverlay();
        this.cameraController.updateControlStates(); // Global controls
        this.updateCalibRoiControlsUI();      // Calibration specific controls
    }
    // -------------------------

    // --- Calibration ROI Logic ---
    enableCalibRoi() {
        if (this.drawCalibRoiBtn?.disabled || !this.cameraController.isConnected || !this.isShowingCalibrationPattern) return;

        console.log('启用校准 ROI 绘制模式');
        this.isInCalibRoiDrawMode = true;
        this.pendingCalibRoiRect = null; // Clear any pending rect
        this.finalCalibRoiRect = null;   // Clear final rect as well if redraw is intended
        this.isDrawingCalibRoi = false;

        if (this.calibrationPatternDisplay) {
             this.calibrationPatternDisplay.style.cursor = 'crosshair';
            // Add listeners directly to the pattern display, ensure they are removed later
            if (!this.boundHandleCalibRoiMouseDown) {
                 this.boundHandleCalibRoiMouseDown = this.handleCalibRoiMouseDown.bind(this);
                 this.calibrationPatternDisplay.addEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
            }
            // Ensure mouse move/up listeners are added *during* mousedown
        }
        this.updateCalibRoiControlsUI(); // Update button states (e.g., disable draw button)
        this.updateCalibRoiOverlay(); // Ensure overlay is hidden initially
    }

    handleCalibRoiMouseDown(event) {
        // Ignore if not in draw mode, or already drawing, or not showing pattern
        if (!this.isInCalibRoiDrawMode || this.isDrawingCalibRoi || !this.isShowingCalibrationPattern) return;

        event.preventDefault();
        console.log("Calibration ROI Mouse Down - Start Drawing");
        this.isDrawingCalibRoi = true;

        // Use UIController's helper function if available and appropriate
        const coords = this.cameraController.uiController?.getImageCoordinates(event, this.calibrationPatternDisplay)
                    || this.fallbackGetImageCoordinates(event, this.calibrationPatternDisplay); // Fallback if UI controller not ready/present

         if (!coords) {
             this.isDrawingCalibRoi = false;
             console.error("Calibration ROI Mouse Down - Failed to get coordinates.");
             return;
         }
        this.calibRoiStartX = coords.x;
        this.calibRoiStartY = coords.y;
        this.pendingCalibRoiRect = { x: this.calibRoiStartX, y: this.calibRoiStartY, width: 0, height: 0 };
        this.updateCalibRoiOverlay(); // Show initial dot or small rect

        // Add global listeners for move and up, remove on mouse up
        this.boundHandleCalibRoiMouseMove = this.handleCalibRoiMouseMove.bind(this);
        this.boundHandleCalibRoiMouseUp = this.handleCalibRoiMouseUp.bind(this);
        window.addEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
        window.addEventListener('mouseup', this.boundHandleCalibRoiMouseUp);
    }

    handleCalibRoiMouseMove(event) {
        if (!this.isDrawingCalibRoi || !this.isInCalibRoiDrawMode || !this.isShowingCalibrationPattern) return;

        const coords = this.cameraController.uiController?.getImageCoordinates(event, this.calibrationPatternDisplay)
                    || this.fallbackGetImageCoordinates(event, this.calibrationPatternDisplay);
        if (!coords) return;
        this.currentCalibRoiX = coords.x;
        this.currentCalibRoiY = coords.y;

        const x = Math.min(this.calibRoiStartX, this.currentCalibRoiX);
        const y = Math.min(this.calibRoiStartY, this.currentCalibRoiY);
        const width = Math.abs(this.currentCalibRoiX - this.calibRoiStartX);
        const height = Math.abs(this.currentCalibRoiY - this.calibRoiStartY);

        this.pendingCalibRoiRect = { x, y, width, height };
        this.updateCalibRoiOverlay(); // Update rect as mouse moves
    }

    handleCalibRoiMouseUp(event) {
        if (!this.isDrawingCalibRoi || !this.isInCalibRoiDrawMode || !this.isShowingCalibrationPattern) return;

        console.log("Calibration ROI Mouse Up");
        this.isDrawingCalibRoi = false;
        // Keep isInCalibRoiDrawMode = true until confirmed or redrawn

        // Remove global listeners
        if (this.boundHandleCalibRoiMouseMove) window.removeEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
        if (this.boundHandleCalibRoiMouseUp) window.removeEventListener('mouseup', this.boundHandleCalibRoiMouseUp);

        // Optional: Remove mousedown listener from pattern display if needed, or keep it for redraw
        // if (this.calibrationPatternDisplay && this.boundHandleCalibRoiMouseDown) {
        //     this.calibrationPatternDisplay.removeEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
        //     this.boundHandleCalibRoiMouseDown = null; // Clear reference
        // }

        if (this.pendingCalibRoiRect && (this.pendingCalibRoiRect.width < 5 || this.pendingCalibRoiRect.height < 5)) {
            console.log('Calibration ROI 绘制尺寸过小，未设置');
            this.pendingCalibRoiRect = null; // Discard small rect
            this.isInCalibRoiDrawMode = false; // Exit draw mode if rect is invalid
             if(this.calibrationPatternDisplay) this.calibrationPatternDisplay.style.cursor = 'default';
        } else if (this.pendingCalibRoiRect) {
            console.log('Calibration ROI 绘制完成，等待确认:', this.pendingCalibRoiRect);
            // Don't change isInCalibRoiDrawMode yet
            // Keep cursor as crosshair? Or change to default? Let's keep it default.
            if(this.calibrationPatternDisplay) this.calibrationPatternDisplay.style.cursor = 'default';
        } else {
            console.log('Calibration ROI mouse up without valid rect.');
            this.isInCalibRoiDrawMode = false; // Exit draw mode if no rect drawn
             if(this.calibrationPatternDisplay) this.calibrationPatternDisplay.style.cursor = 'default';
        }

        this.updateCalibRoiOverlay();
        this.updateCalibRoiControlsUI(); // Show confirm/redraw buttons
    }

    confirmCalibRoi() {
        if (this.confirmCalibRoiBtn?.disabled || !this.pendingCalibRoiRect || !this.isShowingCalibrationPattern) return;

        this.finalCalibRoiRect = { ...this.pendingCalibRoiRect };
        this.pendingCalibRoiRect = null; // Clear pending
        console.log('校准 ROI 已确认:', this.finalCalibRoiRect);

        if (this.calibrationPatternDisplay) {
            this.calibrationPatternDisplay.style.cursor = 'default';
            // Remove mouse down listener if it's still attached
            if (this.boundHandleCalibRoiMouseDown) {
                 this.calibrationPatternDisplay.removeEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
                 this.boundHandleCalibRoiMouseDown = null;
            }
        }
        this.isInCalibRoiDrawMode = false; // Exit draw mode
        this.isCalibRoiVisible = true;    // Ensure it's visible after confirmation

        this.updateCalibRoiOverlay();
        this.updateCalibRoiControlsUI(); // Update buttons (hide confirm, show toggle/redraw)
        this.cameraController.saveState(); // Persist ROI if needed
    }

    redrawCalibRoi() {
        if (this.redrawCalibRoiBtn?.disabled || !this.isShowingCalibrationPattern) return;

        console.log('请求重新绘制校准 ROI');
        this.pendingCalibRoiRect = null; // Clear pending rect
        this.finalCalibRoiRect = null;   // Clear confirmed rect
        this.isInCalibRoiDrawMode = false; // Ensure we exit previous draw mode if any
        this.isDrawingCalibRoi = false;  // Ensure drawing flag is reset

        if (this.calibrationPatternDisplay) {
            this.calibrationPatternDisplay.style.cursor = 'default'; // Reset cursor first
            // Remove old listeners if they somehow persist
            if (this.boundHandleCalibRoiMouseDown) {
                 this.calibrationPatternDisplay.removeEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
                 this.boundHandleCalibRoiMouseDown = null;
            }
            if (this.boundHandleCalibRoiMouseMove) window.removeEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
            if (this.boundHandleCalibRoiMouseUp) window.removeEventListener('mouseup', this.boundHandleCalibRoiMouseUp);
        }

        this.updateCalibRoiOverlay(); // Hide ROI
        this.updateCalibRoiControlsUI(); // Update buttons (should hide redraw/confirm, show draw)
        this.enableCalibRoi(); // Re-enter draw mode
    }

     cancelCalibRoiDraw() {
        if (!this.isDrawingCalibRoi && !this.isInCalibRoiDrawMode) return; // Nothing to cancel

        console.log("取消校准 ROI 绘制");
        const wasDrawing = this.isDrawingCalibRoi;
        this.isDrawingCalibRoi = false;
        this.isInCalibRoiDrawMode = false;

        if (this.calibrationPatternDisplay) {
            this.calibrationPatternDisplay.style.cursor = 'default';
            // Remove listeners only if they were added
            if (this.boundHandleCalibRoiMouseDown) {
                 this.calibrationPatternDisplay.removeEventListener('mousedown', this.boundHandleCalibRoiMouseDown);
                 this.boundHandleCalibRoiMouseDown = null;
            }
            if (wasDrawing) { // Only remove move/up if drawing was in progress
                 if (this.boundHandleCalibRoiMouseMove) window.removeEventListener('mousemove', this.boundHandleCalibRoiMouseMove);
                 if (this.boundHandleCalibRoiMouseUp) window.removeEventListener('mouseup', this.boundHandleCalibRoiMouseUp);
            }
        }
        this.pendingCalibRoiRect = null; // Clear any partially drawn rect
        this.updateCalibRoiOverlay(); // Hide overlay
        this.updateCalibRoiControlsUI(); // Reset buttons
    }

    // --- UI Update Functions ---
    updateCalibRoiOverlay() {
        const overlay = this.calibRoiOverlay;
        const patternDisplay = this.calibrationPatternDisplay;

        if (!overlay || !patternDisplay || !patternDisplay.parentElement) {
             if(overlay) overlay.style.display = 'none';
             // console.warn("Cannot update calib ROI overlay: Missing elements.");
             return;
        }

        // Hide if not showing calibration pattern
        if (!this.isShowingCalibrationPattern) {
              overlay.style.display = 'none';
              return;
         }

        let rectToDraw = null;
        let isVisible = false;

        // Determine which rectangle to draw and if it should be visible
        if (this.finalCalibRoiRect && this.isCalibRoiVisible) {
             // Draw confirmed ROI if it exists and visibility is enabled
             rectToDraw = this.finalCalibRoiRect;
             isVisible = true;
        } else if (this.pendingCalibRoiRect) {
             // Draw pending ROI if it exists (user is drawing or has finished drawing but not confirmed)
             rectToDraw = this.pendingCalibRoiRect;
             isVisible = true;
        }
        // Note: No separate state for 'drawing' needed here for display logic,
        // just whether a pending rect exists.

        if (rectToDraw && isVisible) {
             const patternRect = patternDisplay.getBoundingClientRect();
             const container = patternDisplay.parentElement; // Assume parent is the offset container
             const containerRect = container.getBoundingClientRect();

             // Use patternRect dimensions as natural dimensions for SVG/pattern display
             const naturalWidth = patternRect.width;
             const naturalHeight = patternRect.height;

             if (naturalWidth > 0 && naturalHeight > 0) {
                 // Calculate scale (usually 1 for SVG within its container if sized correctly)
                 const scaleX = 1; // Assuming patternDisplay itself is the reference size
                 const scaleY = 1;

                 // Calculate position relative to the container
                 // Offset of the pattern display within the container + scaled ROI coordinates
                 const displayX = (patternRect.left - containerRect.left) + (rectToDraw.x * scaleX);
                 const displayY = (patternRect.top - containerRect.top) + (rectToDraw.y * scaleY);
                 const displayW = rectToDraw.width * scaleX;
                 const displayH = rectToDraw.height * scaleY;

                 overlay.style.left = `${displayX}px`;
                 overlay.style.top = `${displayY}px`;
                 overlay.style.width = `${displayW}px`;
                 overlay.style.height = `${displayH}px`;
                 overlay.style.opacity = '1'; // Make sure it's visible
                 overlay.style.display = 'block';

             } else {
                 // console.warn("Cannot draw calib ROI: Pattern display has zero dimensions.");
                 overlay.style.display = 'none'; // Hide if pattern display dimensions are invalid
             }
         } else {
             // Hide overlay if no rect to draw or if not visible
             overlay.style.display = 'none';
             overlay.style.opacity = '0'; // Hide smoothly if desired
         }
     }

    updateCalibRoiControlsUI() {
        // Determine overall state for enabling/disabling
        const canInteract = this.cameraController.isConnected && !this.cameraController.isFocusing && !this.isCalibrating;

        // Default visibility: hide everything first
        const buttonsToHide = [
            this.drawCalibRoiBtn,
            this.confirmCalibRoiBtn,
            this.redrawCalibRoiBtn,
            this.toggleCalibRoiVisibilityBtn
        ];
        buttonsToHide.forEach(btn => { if (btn) btn.style.display = 'none'; });
        if (this.calibRoiButtonGroup) this.calibRoiButtonGroup.style.display = 'none';


        // Only show controls if the calibration pattern view is active
        if (this.isShowingCalibrationPattern) {
            if (this.pendingCalibRoiRect) {
                 // State: ROI drawn, waiting for confirmation
                 if (this.calibRoiButtonGroup) this.calibRoiButtonGroup.style.display = 'flex';
                 if (this.confirmCalibRoiBtn) {
                     this.confirmCalibRoiBtn.style.display = 'inline-block';
                     this.confirmCalibRoiBtn.disabled = !canInteract;
                 }
                 if (this.redrawCalibRoiBtn) {
                     this.redrawCalibRoiBtn.style.display = 'inline-block';
                     this.redrawCalibRoiBtn.disabled = !canInteract;
                 }
                 // Hide Draw and Toggle buttons
            } else if (this.finalCalibRoiRect) {
                 // State: ROI confirmed
                 if (this.calibRoiButtonGroup) this.calibRoiButtonGroup.style.display = 'flex';
                 if (this.redrawCalibRoiBtn) {
                     this.redrawCalibRoiBtn.style.display = 'inline-block';
                     this.redrawCalibRoiBtn.disabled = !canInteract;
                 }
                 if (this.toggleCalibRoiVisibilityBtn) {
                     this.toggleCalibRoiVisibilityBtn.style.display = 'inline-block';
                     this.toggleCalibRoiVisibilityBtn.disabled = !canInteract; // Enable toggle only when interaction is possible
                     this.updateCalibRoiToggleButtonState(); // Update icon/title
                 }
                 // Hide Draw and Confirm buttons
            } else {
                 // State: Idle (no ROI drawn or confirmed)
                 if (this.drawCalibRoiBtn) {
                     this.drawCalibRoiBtn.style.display = 'inline-block';
                     // Disable if interaction is blocked OR if already in draw mode (prevent re-click)
                     this.drawCalibRoiBtn.disabled = !canInteract || this.isInCalibRoiDrawMode;
                 }
                 // Hide Button Group and its contents
                 if (this.calibRoiButtonGroup) this.calibRoiButtonGroup.style.display = 'none';
            }
        } else {
            // State: Not in calibration view, hide all calib ROI controls
             if (this.calibRoiButtonGroup) this.calibRoiButtonGroup.style.display = 'none';
             if (this.drawCalibRoiBtn) this.drawCalibRoiBtn.style.display = 'none';
        }
    }

    updateCalibRoiToggleButtonState() {
        if (!this.toggleCalibRoiVisibilityBtn) return;

        const icon = this.toggleCalibRoiVisibilityBtn.querySelector('i');
        if (!icon) return; // Needed for icon swapping

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

    // Fallback coordinate function if UIController isn't available or ready
    fallbackGetImageCoordinates(event, targetElement) {
        if (!targetElement) return null;
        const rect = targetElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;

         // Simple calculation assuming targetElement's rect represents image coords 1:1
         // This might be inaccurate if there's scaling/padding not accounted for.
         const x = event.clientX - rect.left;
         const y = event.clientY - rect.top;

        // Clamp to bounds
        const clampedX = Math.max(0, Math.min(x, rect.width));
        const clampedY = Math.max(0, Math.min(y, rect.height));

        return { x: clampedX, y: clampedY };
    }

    // --- State Management ---
    // Methods to load/save calibration-specific state if needed
    saveCalibrationState() {
        return {
            calibrationRatio: this.calibrationRatio,
            finalCalibRoiRect: this.finalCalibRoiRect,
            // Don't save pending states like pendingCalibRoiRect, isDrawingCalibRoi etc.
        };
    }

    loadCalibrationState(savedState) {
        if (!savedState) return;

        if (savedState.hasOwnProperty('calibrationRatio')) {
            this.calibrationRatio = savedState.calibrationRatio;
            if (this.calibrationRatio !== null && this.calibrationResultValue) {
                this.calibrationResultValue.textContent = `${this.calibrationRatio.toFixed(2)} px/mm`;
            } else if (this.calibrationResultValue) {
                 this.calibrationResultValue.textContent = '-- px/mm';
            }
        }
         if (savedState.hasOwnProperty('finalCalibRoiRect') && savedState.finalCalibRoiRect) {
             this.finalCalibRoiRect = savedState.finalCalibRoiRect;
             this.isCalibRoiVisible = true; // Assume visible when loaded
         } else {
             this.finalCalibRoiRect = null;
         }
         // Reset transient states
         this.pendingCalibRoiRect = null;
         this.isInCalibRoiDrawMode = false;
         this.isDrawingCalibRoi = false;

         // Update UI based on loaded state
         this.updateCalibRoiOverlay();
         this.updateCalibRoiControlsUI();
    }

    // Reset calibration state (e.g., on disconnect)
     resetCalibrationState() {
         this.isCalibrating = false;
         this.calibrationRatio = null;
         this.isShowingCalibrationPattern = false; // Default to camera view
         if (this.calibrationProcessId) {
             clearTimeout(this.calibrationProcessId);
             this.calibrationProcessId = null;
         }
         this.pendingCalibRoiRect = null;
         this.finalCalibRoiRect = null;
         this.isInCalibRoiDrawMode = false;
         this.isDrawingCalibRoi = false;
         this.isCalibRoiVisible = true;

         // Reset UI elements
         if (this.calibrationResultValue) this.calibrationResultValue.textContent = '-- px/mm';
         // Ensure view is reset to camera
         if (this.isShowingCalibrationPattern) {
            this.switchToCameraView(); // Should handle UI updates internally
         } else {
             // Still need to update overlays and controls even if view wasn't switched
             this.updateCalibRoiOverlay();
             this.updateCalibRoiControlsUI();
         }
     }
} 