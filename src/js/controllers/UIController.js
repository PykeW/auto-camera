import { Utilities } from '../utils/Utilities.js';

class UIController {
    constructor(cameraController) {
        this.cameraController = cameraController; // Reference main controller
        this.utilities = new Utilities(); // 引用工具类

        // --- Element References ---
        // Status Bar & Footer
        this.footerZPos = document.getElementById('footer-z-pos');
        this.footerStatus = document.getElementById('footer-status');
        this.statusBarStatus = document.querySelector('.status-bar span:first-child'); // Assuming this is for general status
        this.statusBarFps = document.querySelector('.status-bar span:nth-child(2)');
        this.statusBarMouse = document.getElementById('mouse-coords');
        this.statusBarImageDims = document.getElementById('image-dims');

        // Focus Display
        this.simulatedImage = document.getElementById('simulated-image');
        this.currentZInput = document.getElementById('current-z');
        this.clarityValueInput = document.getElementById('clarity-value');

        // General Controls (Subset managed by UIController for state)
        // Note: Enabling/disabling logic might remain in CameraController or specific feature controllers
        this.connectBtn = document.getElementById('connect-btn');
        this.serialNumberSelect = document.getElementById('serial-number');
        this.panelControls = document.querySelectorAll('.requires-connection input, .requires-connection select, .requires-connection button, .requires-connection table input, .requires-connection table select');
        this.headerButtons = document.querySelectorAll('.header-controls .header-button:not(#btn-settings)');

        // Focus ROI Elements
        this.focusRoiOverlay = document.getElementById('focus-roi-overlay');
        this.confirmFocusRoiBtn = document.getElementById('confirm-roi-focus-btn');
        this.redrawFocusRoiBtn = document.getElementById('redraw-roi-focus-btn');
        this.drawRoiFocusBtn = document.getElementById('draw-roi-focus-btn');
        this.toggleFocusRoiVisibilityBtn = document.getElementById('toggle-focus-roi-visibility-btn');
        this.clearFocusRoiBtn = document.getElementById('clear-roi-focus-btn');
        this.focusRoiButtonGroup = document.getElementById('focus-roi-button-group');

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

         // --- Simulation Parameters (needed for blur) ---
         this.MAX_BLUR = 5; // px

        this.initializeEventListeners();
        this.updateRoiControlsUI(); // Initial state
        this.updateFocusRoiOverlay(); // Initial state
    }

    initializeEventListeners() {
        // Image mouse listeners for coordinates and ROI drawing
        this.simulatedImage?.addEventListener('mousedown', this.handleRoiMouseDown.bind(this));
        // Use document/window for mousemove/mouseup to capture events outside the image
        document.addEventListener('mousemove', this.handleRoiMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleRoiMouseUp.bind(this));
        this.simulatedImage?.addEventListener('mousemove', this.updateMouseCoordinates.bind(this));
        this.simulatedImage?.addEventListener('mouseleave', this.clearMouseCoordinates.bind(this));

        // Image load listener for dimensions
        this.simulatedImage?.addEventListener('load', this.updateImageDimensions.bind(this));

        // Focus ROI Button Listeners
        this.drawRoiFocusBtn?.addEventListener('click', () => {
            console.log("点击绘制对焦 ROI 按钮");
            this.startFocusRoiDraw();
        });
        this.confirmFocusRoiBtn?.addEventListener('click', this.confirmFocusRoi.bind(this));
        this.redrawFocusRoiBtn?.addEventListener('click', () => {
             console.log("点击重绘对焦 ROI 按钮");
             this.startFocusRoiDraw(true); // Pass redraw flag
        });
        this.clearFocusRoiBtn?.addEventListener('click', this.clearFocusRoi.bind(this));
        this.toggleFocusRoiVisibilityBtn?.addEventListener('click', this.toggleFocusRoiVisibility.bind(this));
    }

    // --- UI Update Functions ---
    updateZDisplay(zValue) {
        const zStr = (typeof zValue === 'number') ? zValue.toFixed(2) : '--';
        if (this.currentZInput) this.currentZInput.value = zStr;
        if (this.footerZPos) this.footerZPos.textContent = zStr;
    }

    updateClarityDisplay(clarityValue) {
        const clarityStr = (typeof clarityValue === 'number') ? clarityValue.toFixed(3) : '--';
        if (this.clarityValueInput) this.clarityValueInput.value = clarityStr;
    }

    applyBlur(clarity) {
         if (!this.simulatedImage) return;
         // Apply blur only if not showing calibration pattern
         if (!this.cameraController.calibrationController?.isShowingCalibrationPattern) {
             const blurValue = (clarity !== null && clarity !== undefined && clarity >= 0 && clarity <= 1)
                             ? (1 - clarity) * this.MAX_BLUR
                             : 0; // Default to no blur if clarity is invalid
             this.simulatedImage.style.filter = `blur(${blurValue.toFixed(2)}px)`;
         } else {
             // Explicitly remove blur if calibration pattern is shown
             this.simulatedImage.style.filter = 'none';
         }
     }

    updateFooterStatus(statusText) {
        if (this.footerStatus) this.footerStatus.textContent = `状态: ${statusText}`;
        // Potentially update a more general status bar element too
        // if (this.statusBarStatus) this.statusBarStatus.textContent = statusText;
    }

    updateFocusStatusText(statusText, statusClass) {
        // This might belong more in FocusController, but updating UI element is here
        const focusStatusText = document.getElementById('focus-status-text');
        if (focusStatusText) {
            focusStatusText.textContent = statusText;
            focusStatusText.className = statusClass || ''; // Apply CSS class for styling
        }
    }

    updateMouseCoordinates(event) {
        const coords = this.getImageCoordinates(event, this.simulatedImage);
        if (coords && this.statusBarMouse) {
            this.statusBarMouse.textContent = `${Math.round(coords.x)}, ${Math.round(coords.y)}`;
        } else if (this.statusBarMouse) {
             this.statusBarMouse.textContent = `---, ---`; // Clear if coords invalid
        }
    }

    clearMouseCoordinates() {
        if(this.statusBarMouse) this.statusBarMouse.textContent = `---, ---`;
    }

    updateImageDimensions() {
        if (this.simulatedImage && this.statusBarImageDims) {
            const width = this.simulatedImage.naturalWidth;
            const height = this.simulatedImage.naturalHeight;
            if (width > 0 && height > 0) {
                this.statusBarImageDims.textContent = `${width}, ${height}`;
                // Update overlays whenever image dimensions change/load
                this.updateFocusRoiOverlay();
                this.cameraController.calibrationController?.updateCalibRoiOverlay(); // Update calib overlay too
            } else {
                this.statusBarImageDims.textContent = `---, ---`;
            }
        }
    }

    // --- Coordinate Calculation --- (Moved from original class)
    getImageCoordinates(event, targetElement) {
        if (!targetElement) {
            console.error("getImageCoordinates: targetElement is missing!");
            return null; // Return null on error
        }

        const rect = targetElement.getBoundingClientRect();

        // Check if target is the calibration pattern (SVG) or the image
        const isSvgElement = targetElement.tagName?.toLowerCase() === 'svg' || targetElement === this.cameraController.calibrationController?.calibrationPatternDisplay;
        const naturalWidth = isSvgElement ? rect.width : targetElement.naturalWidth;
        const naturalHeight = isSvgElement ? rect.height : targetElement.naturalHeight;

        if (rect.width === 0 || rect.height === 0 || !naturalWidth || !naturalHeight || naturalWidth === 0 || naturalHeight === 0) {
            // console.warn("getImageCoordinates: Invalid dimensions for target element or rect.", { rect, naturalWidth, naturalHeight });
            return null; // Return null for invalid dimensions
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

        // Calculate coordinates relative to the image/element content
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        // Clamp coordinates to the natural dimensions of the element
        const clampedX = Math.max(0, Math.min(x, naturalWidth));
        const clampedY = Math.max(0, Math.min(y, naturalHeight));

        return { x: clampedX, y: clampedY };
    }


    // --- Focus ROI Drawing and Management ---
    handleRoiMouseDown(event) {
        // Only allow drawing if in the correct state and calibration view is off
        if (this.focusRoiState !== 'drawing' || this.cameraController.calibrationController?.isShowingCalibrationPattern) return;

        const imageRect = this.simulatedImage?.getBoundingClientRect();
        // Ensure click is within the image bounds
        if (!imageRect || event.clientX < imageRect.left || event.clientX > imageRect.right || event.clientY < imageRect.top || event.clientY > imageRect.bottom) {
            return;
        }
        event.preventDefault(); // Prevent default image drag behavior

        this.isDrawingRoi = true;
        const coords = this.getImageCoordinates(event, this.simulatedImage);
        if (!coords) { // Check if coordinates are valid
            this.isDrawingRoi = false;
            return;
        }
        this.roiStartX = coords.x;
        this.roiStartY = coords.y;
        // Initialize pending rect at the start point with zero size
        this.pendingRoiRect = { x: this.roiStartX, y: this.roiStartY, width: 0, height: 0 };
        this.updateFocusRoiOverlay(); // Show the initial drawing state (optional)
        console.log("Focus ROI Mouse Down - Start Drawing");
    }

    handleRoiMouseMove(event) {
        // Only process if currently drawing ROI
        if (!this.isDrawingRoi || this.focusRoiState !== 'drawing' || this.cameraController.calibrationController?.isShowingCalibrationPattern) return;

        const coords = this.getImageCoordinates(event, this.simulatedImage);
        if (!coords) return; // Ignore if coordinates are invalid
        this.currentRoiX = coords.x;
        this.currentRoiY = coords.y;

        // Calculate top-left corner (x, y) and dimensions (width, height)
        const x = Math.min(this.roiStartX, this.currentRoiX);
        const y = Math.min(this.roiStartY, this.currentRoiY);
        const width = Math.abs(this.currentRoiX - this.roiStartX);
        const height = Math.abs(this.currentRoiY - this.roiStartY);

        this.pendingRoiRect = { x, y, width, height };
        this.updateFocusRoiOverlay(); // Update the visual representation of the ROI
    }

    handleRoiMouseUp(event) {
        // Only process if finishing an ROI draw
        if (!this.isDrawingRoi || this.focusRoiState !== 'drawing' || this.cameraController.calibrationController?.isShowingCalibrationPattern) return;

        this.isDrawingRoi = false; // Mark drawing as finished

        // Validate the drawn ROI size
        if (this.pendingRoiRect && (this.pendingRoiRect.width < 5 || this.pendingRoiRect.height < 5)) {
            console.log("Focus ROI too small, canceling draw.");
            
            // 显示区域过小提示
            this.utilities.showNotification(
                'warning',
                'ROI 过小',
                '绘制的区域太小，请重新绘制一个更大的区域',
                5000
            );
            
            this.focusRoiState = 'idle'; // Revert state to idle
            this.pendingRoiRect = null; // Discard the small rectangle
            
            // 移除绘制模式视觉提示
            if (this.simulatedImage) {
                this.simulatedImage.classList.remove('drawing-roi-mode');
            }
            
            this.updateFocusRoiOverlay(); // Hide the tiny rect
            this.updateRoiControlsUI(); // Update buttons
            return;
        }

        this.focusRoiState = 'drawn';
        console.log("Focus ROI 绘制完成，等待确认:", this.pendingRoiRect);

        // Reset cursor
        if (this.simulatedImage) {
            this.simulatedImage.style.cursor = 'default';
        }
        this.updateRoiControlsUI(); // Update button visibility/state
        this.updateFocusRoiOverlay(); // Update overlay based on new state
        console.log("Focus ROI Mouse Up");
    }

    startFocusRoiDraw(isRedraw = false) {
        console.log("开始绘制对焦 ROI");
        this.focusRoiState = 'drawing';
        this.updateRoiControlsUI();

        // 显示通知
        this.utilities.showNotification(
            'info',
            'ROI 绘制',
            '请在图像上按住鼠标左键并拖动以绘制矩形对焦区域，松开鼠标完成绘制',
            5000
        );
        
        // 清除按钮组显示
        this.focusRoiButtonGroup.style.display = 'none';
        // 设置主绘制按钮
        this.drawRoiFocusBtn.textContent = '正在绘制...';
        this.drawRoiFocusBtn.style.backgroundColor = 'var(--accent-blue)';
        this.drawRoiFocusBtn.style.color = 'white';

        // 清除之前的选择 (if redrawing)
        if (isRedraw) {
            this.clearFocusRoi(true); // Pass silent flag to avoid notification on clear
        }
        
        // 添加绘制模式视觉提示
        if (this.simulatedImage) {
            this.simulatedImage.classList.add('drawing-roi-mode');
        }
        
        // Ensure overlay is visible
        this.focusRoiOverlay.style.display = 'block';
    }

    confirmFocusRoi() {
        console.log("确认对焦 ROI");
        
        // 移除绘制模式视觉提示
        if (this.simulatedImage) {
            this.simulatedImage.classList.remove('drawing-roi-mode');
        }
        
        if (this.pendingRoiRect) {
            this.focusRoiState = 'confirmed';
            this.finalRoiRect = { ...this.pendingRoiRect }; // Copy the pending rect to final
            this.pendingRoiRect = null; // Clear pending
            
            // 显示确认通知
            this.utilities.showNotification(
                'success',
                'ROI 已确认',
                '对焦区域设置成功，系统将使用此区域进行自动对焦',
                5000
            );
            
            this.updateRoiControlsUI();
            this.updateFocusRoiOverlay();
            // Save ROI state to persist configuration
            this.saveFocusRoiState();
        }
    }

    clearFocusRoi(silent = false) {
        console.log("清除对焦 ROI");
        
        // 移除绘制模式视觉提示
        if (this.simulatedImage) {
            this.simulatedImage.classList.remove('drawing-roi-mode');
        }
        
        this.focusRoiState = 'idle';
        this.finalRoiRect = null;
        this.pendingRoiRect = null;
        this.isDrawingRoi = false;
        this.updateRoiControlsUI();
        this.updateFocusRoiOverlay();
        
        // 显示通知（除非是静默模式）
        if (!silent) {
            this.utilities.showNotification(
                'info',
                'ROI 已清除',
                '对焦区域已重置，将使用整个图像进行对焦',
                5000
            );
        }
        
        // Reset buttons
        this.drawRoiFocusBtn.textContent = '绘制';
        this.drawRoiFocusBtn.style.backgroundColor = '';
        this.drawRoiFocusBtn.style.color = '';
        
        // Save the cleared state
        this.saveFocusRoiState();
    }

    cancelFocusRoiDraw() {
        console.log("取消绘制对焦 ROI");
        
        // 移除绘制模式视觉提示
        if (this.simulatedImage) {
            this.simulatedImage.classList.remove('drawing-roi-mode');
        }
        
        if (this.focusRoiState === 'drawing') {
            this.focusRoiState = this.finalRoiRect ? 'confirmed' : 'idle';
            this.isDrawingRoi = false;
            this.pendingRoiRect = null;
            
            // 显示取消通知
            this.utilities.showNotification(
                'info',
                'ROI 绘制已取消',
                '已取消绘制操作，保持原有设置不变',
                5000
            );
            
            this.updateRoiControlsUI();
            this.updateFocusRoiOverlay();
        }
    }

    toggleFocusRoiVisibility() {
        // Can only toggle visibility if an ROI is confirmed and not in calibration view
        if (this.cameraController.calibrationController?.isShowingCalibrationPattern || !this.finalRoiRect || this.focusRoiState !== 'confirmed') {
             console.warn("Cannot toggle Focus ROI visibility: No confirmed ROI or in calibration view.");
             return;
        }

        this.isFocusRoiVisible = !this.isFocusRoiVisible;
        console.log(`对焦 ROI 可见性: ${this.isFocusRoiVisible}`);
        this.updateFocusRoiOverlay(); // Update overlay visibility
        this.updateRoiControlsUI(); // Update toggle button appearance
    }

    // --- Focus ROI UI Updates ---
    updateFocusRoiOverlay() {
        const overlay = this.focusRoiOverlay;
        const image = this.simulatedImage;

        // Ensure elements exist
        if (!overlay || !image || !image.parentElement) {
            if (overlay) overlay.style.display = 'none'; // Hide if elements missing
            // console.warn("Cannot update focus ROI overlay: Missing elements.");
            return;
        }

         // Hide focus ROI if calibration pattern is showing
         if (this.cameraController.calibrationController?.isShowingCalibrationPattern) {
             overlay.style.display = 'none';
             return;
         }

        let rectToDraw = null;
        let isVisible = false;

        // Determine which rect to draw based on state
        if (this.focusRoiState === 'confirmed' && this.finalRoiRect && this.isFocusRoiVisible) {
            // Show final, confirmed ROI if visibility is on
            rectToDraw = this.finalRoiRect;
            isVisible = true;
        } else if (this.focusRoiState === 'drawn' && this.pendingRoiRect) {
            // Show pending ROI after drawing is complete but before confirmation
             rectToDraw = this.pendingRoiRect;
             isVisible = true;
         } else if (this.focusRoiState === 'drawing' && this.pendingRoiRect && this.isDrawingRoi) {
             // Show pending ROI while actively drawing
              rectToDraw = this.pendingRoiRect;
              isVisible = true;
         }

        if (rectToDraw && isVisible) {
            // Get image and container dimensions for scaling
            const imageRect = image.getBoundingClientRect();
            const container = image.parentElement; // ROI is positioned relative to this container
            const containerRect = container.getBoundingClientRect();
            const naturalWidth = image.naturalWidth;
            const naturalHeight = image.naturalHeight;

            // Ensure dimensions are valid before calculating scale
            if (imageRect.width > 0 && imageRect.height > 0 && naturalWidth > 0 && naturalHeight > 0) {
                const scaleX = imageRect.width / naturalWidth;
                const scaleY = imageRect.height / naturalHeight;

                // Calculate display position and size relative to the container
                // Position = Image offset within container + Scaled ROI coordinates
                const displayX = (imageRect.left - containerRect.left) + (rectToDraw.x * scaleX);
                const displayY = (imageRect.top - containerRect.top) + (rectToDraw.y * scaleY);
                const displayW = rectToDraw.width * scaleX;
                const displayH = rectToDraw.height * scaleY;

                // Apply styles to the overlay element
                overlay.style.left = `${displayX}px`;
                overlay.style.top = `${displayY}px`;
                overlay.style.width = `${displayW}px`;
                overlay.style.height = `${displayH}px`;
                overlay.style.opacity = '1'; // Ensure visible
                overlay.style.display = 'block'; // Make it visible
            } else {
                // console.warn("Cannot draw focus ROI: Image dimensions are invalid.");
                overlay.style.display = 'none'; // Hide overlay if image dimensions are bad
            }
        } else {
            // Hide overlay if no rect to draw or visibility is off
            overlay.style.display = 'none';
            overlay.style.opacity = '0'; // Optional: fade out
        }
    }

     updateRoiControlsUI() {
         // console.log(`[updateRoiControlsUI] State: ${this.focusRoiState}, Connected: ${this.cameraController.isConnected}, Focusing: ${this.cameraController.isFocusing}, Calibrating: ${this.cameraController.calibrationController?.isCalibrating}`);

         // Determine if interactions are generally allowed
         const canInteract = this.cameraController.isConnected && !this.cameraController.isFocusing && !this.cameraController.calibrationController?.isCalibrating && !this.cameraController.calibrationController?.isShowingCalibrationPattern;

         // --- Visibility Control ---
         // Default: Hide all buttons first
         if (this.drawRoiFocusBtn) this.drawRoiFocusBtn.style.display = 'none';
         if (this.focusRoiButtonGroup) this.focusRoiButtonGroup.style.display = 'none';
         if (this.confirmFocusRoiBtn) this.confirmFocusRoiBtn.style.display = 'none';
         if (this.redrawFocusRoiBtn) this.redrawFocusRoiBtn.style.display = 'none';
         if (this.clearFocusRoiBtn) this.clearFocusRoiBtn.style.display = 'none';
         if (this.toggleFocusRoiVisibilityBtn) this.toggleFocusRoiVisibilityBtn.style.display = 'none';

         // --- Logic based on ROI state ---
         switch (this.focusRoiState) {
             case 'idle':
                 // Show only the Draw button if interaction is allowed
                 if (this.drawRoiFocusBtn) {
                     this.drawRoiFocusBtn.style.display = 'inline-block';
                     this.drawRoiFocusBtn.disabled = !canInteract;
                 }
                 break;

             case 'drawing':
                 // No buttons typically shown while actively drawing
                 // Optionally show a "Cancel Draw" button if needed
                 break;

             case 'drawn':
                 // Show the button group with Confirm and Redraw (or Clear)
                 if (this.focusRoiButtonGroup) this.focusRoiButtonGroup.style.display = 'flex';
                 if (this.confirmFocusRoiBtn) {
                     this.confirmFocusRoiBtn.style.display = 'inline-block';
                     this.confirmFocusRoiBtn.disabled = !canInteract;
                 }
                 // Option 1: Show Redraw
                 if (this.redrawFocusRoiBtn) {
                      this.redrawFocusRoiBtn.style.display = 'inline-block';
                      this.redrawFocusRoiBtn.disabled = !canInteract;
                 }
                 // Option 2: Show Clear instead of Redraw if preferred workflow
                 // if (this.clearFocusRoiBtn) {
                 //     this.clearFocusRoiBtn.style.display = 'inline-block';
                 //     this.clearFocusRoiBtn.disabled = !canInteract;
                 // }
                 break;

             case 'confirmed':
                 // Show the button group with Redraw, Clear, and Toggle Visibility
                 if (this.focusRoiButtonGroup) this.focusRoiButtonGroup.style.display = 'flex';
                 if (this.redrawFocusRoiBtn) {
                     this.redrawFocusRoiBtn.style.display = 'inline-block';
                     this.redrawFocusRoiBtn.disabled = !canInteract;
                 }
                 if (this.clearFocusRoiBtn) {
                     this.clearFocusRoiBtn.style.display = 'inline-block';
                     this.clearFocusRoiBtn.disabled = !canInteract;
                 }
                 if (this.toggleFocusRoiVisibilityBtn) {
                     this.toggleFocusRoiVisibilityBtn.style.display = 'inline-block';
                     this.toggleFocusRoiVisibilityBtn.disabled = !canInteract;
                     // Update the toggle button icon/title
                     this.updateFocusRoiToggleButtonState();
                 }
                 break;
         }
     }

    updateFocusRoiToggleButtonState() {
        if (!this.toggleFocusRoiVisibilityBtn) return;
        const icon = this.toggleFocusRoiVisibilityBtn.querySelector('i');
        if (!icon) return; // Requires <i> element for icon swapping

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

    // --- Initial UI Setup ---
    initialUISetup() {
        this.updateZDisplay(null); // Show '--' initially
        this.updateClarityDisplay(null);
        this.applyBlur(1); // Apply max blur or no blur initially?
        this.updateFooterStatus('未连接');
        this.clearMouseCoordinates();
        this.updateImageDimensions(); // Attempt to get initial dimensions
        this.updateFocusRoiOverlay(); // Ensure overlay matches initial state
        this.updateRoiControlsUI();   // Ensure buttons match initial state
    }

    // --- State Management (for ROI) ---
    saveFocusRoiState() {
        return {
            finalRoiRect: this.finalRoiRect,
             // Don't save pending/drawing states
             // isFocusRoiVisible state might be persisted if desired
             isFocusRoiVisible: this.isFocusRoiVisible,
        };
    }

    loadFocusRoiState(savedState) {
        if (!savedState) return;

         if (savedState.hasOwnProperty('finalRoiRect') && savedState.finalRoiRect) {
             this.finalRoiRect = savedState.finalRoiRect;
             this.focusRoiState = 'confirmed'; // Set state based on loaded data
         } else {
             this.finalRoiRect = null;
             this.focusRoiState = 'idle';
         }

        // Load visibility state if saved
        if (savedState.hasOwnProperty('isFocusRoiVisible')) {
            this.isFocusRoiVisible = savedState.isFocusRoiVisible;
        } else {
             this.isFocusRoiVisible = true; // Default to visible if not saved
        }

        // Reset transient states
         this.pendingRoiRect = null;
         this.isDrawingRoi = false;

        // Update UI based on loaded state
         this.updateFocusRoiOverlay();
         this.updateRoiControlsUI();
    }

    resetRoiState() {
         this.focusRoiState = 'idle';
         this.finalRoiRect = null;
         this.pendingRoiRect = null;
         this.isDrawingRoi = false;
         this.isFocusRoiVisible = true;
         if (this.simulatedImage) {
             this.simulatedImage.style.cursor = 'default';
         }
         this.updateFocusRoiOverlay();
         this.updateRoiControlsUI();
     }
} 