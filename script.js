class CameraController {
    constructor() {
        this.video = document.querySelector('.camera-feed video');
        this.status = document.querySelector('.status');
        this.fpsDisplay = document.querySelector('.fps');
        this.stream = null;
        this.track = null;
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        
        this.initializeControls();
        this.initializeCamera();
    }

    async initializeCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    facingMode: 'environment'
                }
            });
            
            this.video.srcObject = this.stream;
            this.track = this.stream.getVideoTracks()[0];
            this.status.textContent = '相机已初始化';
            
            this.updateFPS();
            this.setupCameraCapabilities();
        } catch (error) {
            console.error('相机初始化失败:', error);
            this.status.textContent = '相机初始化失败: ' + error.message;
        }
    }

    initializeControls() {
        // 曝光时间控制
        const exposureTime = document.getElementById('exposure-time');
        exposureTime.addEventListener('input', (e) => {
            this.setExposureTime(parseFloat(e.target.value));
        });

        // 增益控制
        const gain = document.getElementById('gain');
        gain.addEventListener('input', (e) => {
            this.setGain(parseFloat(e.target.value));
        });

        // 白平衡控制
        const whiteBalance = document.getElementById('white-balance');
        whiteBalance.addEventListener('change', (e) => {
            this.setWhiteBalance(e.target.value);
        });

        // 自动对焦控制
        const autofocus = document.getElementById('autofocus');
        autofocus.addEventListener('change', (e) => {
            this.setAutofocus(e.target.checked);
        });

        // 手动对焦控制
        const focusPosition = document.getElementById('focus-position');
        focusPosition.addEventListener('input', (e) => {
            this.setFocusPosition(parseFloat(e.target.value));
        });
    }

    setupCameraCapabilities() {
        const capabilities = this.track.getCapabilities();
        const settings = this.track.getSettings();

        // 设置曝光时间范围
        if (capabilities.exposureTime) {
            const exposureTime = document.getElementById('exposure-time');
            exposureTime.min = capabilities.exposureTime.min;
            exposureTime.max = capabilities.exposureTime.max;
            exposureTime.value = settings.exposureTime || capabilities.exposureTime.min;
        }

        // 设置增益范围
        if (capabilities.gain) {
            const gain = document.getElementById('gain');
            gain.min = capabilities.gain.min;
            gain.max = capabilities.gain.max;
            gain.value = settings.gain || capabilities.gain.min;
        }

        // 设置白平衡模式
        if (capabilities.whiteBalanceMode) {
            const whiteBalance = document.getElementById('white-balance');
            capabilities.whiteBalanceMode.forEach(mode => {
                const option = document.createElement('option');
                option.value = mode;
                option.textContent = mode;
                whiteBalance.appendChild(option);
            });
            whiteBalance.value = settings.whiteBalanceMode || capabilities.whiteBalanceMode[0];
        }

        // 设置自动对焦
        if (capabilities.focusMode) {
            const autofocus = document.getElementById('autofocus');
            autofocus.checked = settings.focusMode === 'continuous';
        }

        // 设置手动对焦范围
        if (capabilities.focusDistance) {
            const focusPosition = document.getElementById('focus-position');
            focusPosition.min = capabilities.focusDistance.min;
            focusPosition.max = capabilities.focusDistance.max;
            focusPosition.value = settings.focusDistance || capabilities.focusDistance.min;
        }
    }

    async setExposureTime(value) {
        try {
            await this.track.applyConstraints({
                advanced: [{ exposureTime: value }]
            });
        } catch (error) {
            console.error('设置曝光时间失败:', error);
        }
    }

    async setGain(value) {
        try {
            await this.track.applyConstraints({
                advanced: [{ gain: value }]
            });
        } catch (error) {
            console.error('设置增益失败:', error);
        }
    }

    async setWhiteBalance(mode) {
        try {
            await this.track.applyConstraints({
                advanced: [{ whiteBalanceMode: mode }]
            });
        } catch (error) {
            console.error('设置白平衡失败:', error);
        }
    }

    async setAutofocus(enabled) {
        try {
            await this.track.applyConstraints({
                advanced: [{ focusMode: enabled ? 'continuous' : 'manual' }]
            });
        } catch (error) {
            console.error('设置自动对焦失败:', error);
        }
    }

    async setFocusPosition(value) {
        try {
            await this.track.applyConstraints({
                advanced: [{ focusDistance: value }]
            });
        } catch (error) {
            console.error('设置对焦位置失败:', error);
        }
    }

    updateFPS() {
        const now = performance.now();
        const delta = now - this.lastTime;
        
        if (delta >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / delta);
            this.fpsDisplay.textContent = `FPS: ${this.fps}`;
            this.frameCount = 0;
            this.lastTime = now;
        }
        
        this.frameCount++;
        requestAnimationFrame(() => this.updateFPS());
    }
}

// 初始化相机控制器
document.addEventListener('DOMContentLoaded', () => {
    const simulatedImage = document.getElementById('simulated-image');
    const currentZInput = document.getElementById('current-z');
    const clarityValueInput = document.getElementById('clarity-value');
    const startFocusBtn = document.getElementById('start-focus-btn');
    const stopFocusBtn = document.getElementById('stop-focus-btn');
    const focusStatusText = document.getElementById('focus-status-text');
    const footerZPos = document.getElementById('footer-z-pos');

    // --- Simulation Parameters ---
    const SIMULATED_BEST_Z = 15.5; // mm - The Z position where focus is perfect
    const Z_RANGE = { min: 5, max: 25 }; // mm - Scan range for autofocus
    const Z_STEP_ROUGH = 1.0; // mm - Step size for rough scan
    const Z_STEP_FINE = 0.1; // mm - Step size for fine scan
    const SCAN_DELAY_ROUGH = 100; // ms - Delay between steps in rough scan
    const SCAN_DELAY_FINE = 80; // ms - Delay between steps in fine scan
    const MAX_BLUR = 5; // px - Maximum blur applied when out of focus
    // ---------------------------

    let currentZ = 10.0;
    let targetZ = currentZ;
    let isFocusing = false;
    let focusProcessId = null; // To store setTimeout id for interruption
    let currentClarity = 0;
    let bestZFound = null;

    // --- Utility Functions ---

    // Calculates simulated clarity (0 to 1), peaking at SIMULATED_BEST_Z
    // Using a Gaussian-like function for smoother falloff
    function calculateClarity(z) {
        const diff = z - SIMULATED_BEST_Z;
        // Adjust the 'width' of the focus peak (smaller value = sharper peak)
        const focusSharpness = 2.0;
        const clarity = Math.exp(-(diff * diff) / (2 * focusSharpness * focusSharpness));
        return clarity; // Returns value between 0 and 1
    }

    // Applies blur based on clarity
    function applyBlur(clarity) {
        const blurValue = (1 - clarity) * MAX_BLUR;
        simulatedImage.style.filter = `blur(${blurValue.toFixed(2)}px)`;
    }

    // Updates the UI elements
    function updateUI() {
        currentZInput.value = currentZ.toFixed(2);
        footerZPos.textContent = currentZ.toFixed(2);
        currentClarity = calculateClarity(currentZ);
        clarityValueInput.value = currentClarity.toFixed(3);
        applyBlur(currentClarity);
    }

    // Updates focus status text and button states
    function updateFocusStatus(status) {
        focusStatusText.textContent = status;
        isFocusing = (status === '粗对焦中' || status === '精细对焦中' || status === '移动到最佳位置');
        startFocusBtn.disabled = isFocusing;
        stopFocusBtn.disabled = !isFocusing;
        // Add classes for potential styling
        focusStatusText.className = `status-${status.replace(/ /g, '-')}`;
    }

    // --- Simulation Logic ---

    async function simulateZMovement(target, stepDelay) {
        return new Promise((resolve) => {
            const step = target > currentZ ? Math.abs(Z_STEP_ROUGH/5) : -Math.abs(Z_STEP_ROUGH/5); // Smaller steps for smooth movement
            const intervalId = setInterval(() => {
                 if (focusProcessId !== intervalId) { // Check if stopped
                    clearInterval(intervalId);
                    resolve(false); // Indicate stopped
                    return;
                }
                currentZ += step;
                updateUI();
                if (Math.abs(currentZ - target) < Math.abs(step) / 2) {
                    currentZ = target;
                    updateUI();
                    clearInterval(intervalId);
                    resolve(true); // Indicate finished normally
                }
            }, 20); // Faster interval for smooth visual movement
             focusProcessId = intervalId; // Store interval ID for potential stop
        });
    }

    async function startAutofocus() {
        if (isFocusing) return;
        console.log("开始自动对焦...");
        bestZFound = null;
        let maxClarityFound = -1;

        // 1. Rough Scan
        updateFocusStatus('粗对焦中');
        let z = Z_RANGE.min;
        let stopped = false;
        while (z <= Z_RANGE.max && !stopped) {
            targetZ = z;
            // No smooth movement here, just jump and measure
            currentZ = z;
            updateUI();
            console.log(`粗扫: Z=${z.toFixed(2)}, 清晰度=${currentClarity.toFixed(3)}`);

            if (currentClarity > maxClarityFound) {
                maxClarityFound = currentClarity;
                bestZFound = z; // Store the best Z from rough scan
            }

            // Wait for the next step
            await new Promise(resolve => { focusProcessId = setTimeout(resolve, SCAN_DELAY_ROUGH); });
             if (focusProcessId === null) { // Check if stopped during delay
                stopped = true;
                break;
            }
            z += Z_STEP_ROUGH;
        }

        if (stopped || bestZFound === null) {
            if(stopped) console.log("粗对焦被停止");
            else console.error("粗对焦未找到峰值");
            updateFocusStatus('已停止');
            return;
        }

        console.log(`粗对焦峰值 Z ≈ ${bestZFound.toFixed(2)}`);

        // 2. Fine Scan (around the rough peak)
        updateFocusStatus('精细对焦中');
        maxClarityFound = -1; // Reset for fine scan
        let fineStart = Math.max(Z_RANGE.min, bestZFound - Z_STEP_ROUGH); // Scan around the rough peak
        let fineEnd = Math.min(Z_RANGE.max, bestZFound + Z_STEP_ROUGH);
        z = fineStart;
        let finalBestZ = bestZFound; // Default to rough if fine fails

        while (z <= fineEnd && !stopped) {
            targetZ = z;
             currentZ = z;
            updateUI();
            console.log(`精扫: Z=${z.toFixed(2)}, 清晰度=${currentClarity.toFixed(3)}`);

            if (currentClarity > maxClarityFound) {
                maxClarityFound = currentClarity;
                finalBestZ = z;
            }

            await new Promise(resolve => { focusProcessId = setTimeout(resolve, SCAN_DELAY_FINE); });
             if (focusProcessId === null) { // Check if stopped
                 stopped = true;
                break;
            }
            z += Z_STEP_FINE;
        }

         if (stopped) {
             console.log("精细对焦被停止");
            updateFocusStatus('已停止');
            return;
        }

        console.log(`精细对焦完成，最佳 Z = ${finalBestZ.toFixed(2)}`);
        bestZFound = finalBestZ;

        // 3. Move to Best Position
        updateFocusStatus('移动到最佳位置');
        targetZ = bestZFound;
        const finishedMovement = await simulateZMovement(targetZ); // Smooth movement to final position

        if(finishedMovement){
            console.log("已移动到最佳位置");
             updateFocusStatus('已对焦');
        } else {
            console.log("移动到最佳位置时被停止");
            updateFocusStatus('已停止');
        }
    }

    function stopAutofocus() {
        if (focusProcessId) {
            clearTimeout(focusProcessId); // Clear timeouts (for steps)
            clearInterval(focusProcessId); // Clear intervals (for movement)
            focusProcessId = null; // Signal that it's stopped
            console.log("对焦已手动停止");
             if(isFocusing && focusStatusText.textContent !== '已停止') {
                updateFocusStatus('已停止');
            }
             isFocusing = false; // Ensure state is updated
             startFocusBtn.disabled = false;
             stopFocusBtn.disabled = true;
        }
    }

    // --- Event Listeners ---
    startFocusBtn.addEventListener('click', startAutofocus);
    stopFocusBtn.addEventListener('click', stopAutofocus);

    // --- Initial UI Update ---
    updateUI();
    updateFocusStatus('空闲'); // Set initial status
}); 