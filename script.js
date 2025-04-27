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
        this.headerButtons = document.querySelectorAll('.header-controls .header-button:not(#btn-settings)'); // Exclude settings button
        this.panelControls = document.querySelectorAll('.requires-connection input, .requires-connection select, .requires-connection button, .requires-connection table input, .requires-connection table select');
        this.stationSelect = document.getElementById('station-select');
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

        // Modal elements
        this.axisConfigModal = document.getElementById('axis-config-modal');
        this.modalOverlay = this.axisConfigModal.querySelector('.modal-overlay');
        this.modalCameraSNInput = document.getElementById('modal-camera-sn');
        this.axisSelectDropdown = document.getElementById('axis-select');
        this.modalSaveAxisBtn = document.getElementById('modal-save-axis-btn');
        this.modalCancelAxisBtn = document.getElementById('modal-cancel-axis-btn');

        // --- Simulation Parameters ---
        this.SIMULATED_BEST_Z = 15.5; // mm
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
        this.CALIBRATION_DELAY = 300; // ms for simulated calibration
        // ---------------------------

        // --- Simulated PLC Data ---
        this.simulatedAxes = ["主Z轴", "副Z轴-A", "Z轴-工位2", "龙门Z轴"];
        this.selectedAxis = null; // Store the selected axis for the "connected" camera
        // ---------------------------

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

        this.initializeEventListeners();
        this.initUI();
    }

    // --- Utility Functions ---
    calculateClarity(z) {
        const diff = z - this.SIMULATED_BEST_Z;
        const focusSharpness = 2.0;
        const clarity = Math.exp(-(diff * diff) / (2 * focusSharpness * focusSharpness));
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
        if (this.isConnected || this.connectionProcessId) return; // Prevent multiple connections
        console.log("开始连接相机...");
        this.connectBtn.textContent = "连接中...";
        this.connectBtn.disabled = true;
        this.footerStatus.textContent = "状态: 连接中...";

        try {
            await this.wait(this.CONNECT_DELAY, 'connectionProcessId'); // Simulate connection time
            
            // Simulate successful connection
            this.isConnected = true;
            console.log("相机连接成功");
            this.footerStatus.textContent = "状态: 已连接";
            this.connectBtn.textContent = "断开连接";
            this.selectedAxis = null; // Reset axis selection on new connection
            
            // Populate data and enable controls *after* connection
            this.populateSimulatedData();
            this.updateControlStates(true); 
            this.updateUI(); // Update Z, clarity, blur
            this.updateFocusStatus('空闲'); // Set focus status to Idle after connection

        } catch(error) {
             console.error("连接中断或失败:", error);
             this.footerStatus.textContent = "状态: 连接失败";
             this.connectBtn.textContent = "连接";
        } finally {
            this.connectBtn.disabled = false;
             this.connectionProcessId = null;
        }
    }

    disconnectCamera() {
        if (!this.isConnected || this.connectionProcessId) return;
        console.log("断开相机连接...");
        this.stopAutofocus(); // Stop any ongoing focus process
        this.stopCapture(); // Stop any ongoing capture/record
        this.isConnected = false;
        this.isCapturing = false;
        this.isRecording = false;
        this.roiEnabled = false;
        this.connectBtn.textContent = "连接";
        this.footerStatus.textContent = "状态: 未连接";
        this.updateControlStates(false); // Disable controls
        this.resetUIData(); // Clear simulated data
        this.updateFocusStatus('未连接');
        if (this.roiOverlay) this.roiOverlay.style.display = 'none'; // Hide ROI on disconnect
        if (this.enableRoiBtn) this.enableRoiBtn.textContent = "启用ROI";
        this.selectedAxis = null; // Clear axis selection on disconnect
        console.log("相机已断开");
    }

    // Enables/disables controls based on connection status AND other states
    updateControlStates(connected) {
        const isIdle = connected && !this.isFocusing && !this.isCapturing && !this.isRecording;
        const canStartActivity = connected && !this.isFocusing; // Can start capture/record if connected and not focusing

        // Connect Button
        if(this.connectBtn) this.connectBtn.disabled = this.isFocusing || this.isCapturing || this.isRecording; // Cannot disconnect while busy
        if(this.connectBtn) this.connectBtn.textContent = connected ? "断开连接" : "连接";

        // Header Buttons
        if(this.btnPlay) this.btnPlay.disabled = !canStartActivity || this.isCapturing || this.isRecording;
        if(this.btnStop) this.btnStop.disabled = !(this.isCapturing || this.isRecording);
        if(this.btnCapture) this.btnCapture.disabled = !canStartActivity || this.isCapturing || this.isRecording;
        if(this.btnRecord) this.btnRecord.disabled = !canStartActivity || this.isCapturing || this.isRecording;
        if(this.btnTrigger) this.btnTrigger.disabled = !canStartActivity || this.isCapturing || this.isRecording;
        // Settings button might always be enabled or have its own logic

        // Panel controls requiring connection (General)
        this.panelControls.forEach(ctrl => {
             if (!['connect-btn', 'start-focus-btn', 'stop-focus-btn', 'calibrate-btn'].includes(ctrl.id) && !ctrl.classList.contains('header-button')) {
                  ctrl.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording;
             }
        });
        if(this.stationSelect) this.stationSelect.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording;

        // File/Folder Select Buttons
        if(this.selectConfigBtn) this.selectConfigBtn.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording;
        if(this.selectFolderBtn) this.selectFolderBtn.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording;

        // Focus buttons
        this.startFocusBtn.disabled = !isIdle;
        this.stopFocusBtn.disabled = !this.isFocusing;

        // Calibration button
        const focusComplete = connected && this.focusStatusText.textContent === '已对焦';
        this.calibrateBtn.disabled = !focusComplete || this.isCapturing || this.isRecording;

        // ROI Button
        if(this.enableRoiBtn) this.enableRoiBtn.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording;
        if(this.enableRoiBtn) this.enableRoiBtn.textContent = this.roiEnabled ? "禁用ROI" : "启用ROI";

        // Table controls
        document.querySelectorAll('#property-table input, #property-table select').forEach(ctrl => {
             ctrl.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording;
         });

        // Reset station select if disconnected
        if (!connected && this.stationSelect) {
             this.stationSelect.disabled = true;
        }

        // Config Axis Button
        if (this.configAxisBtn) this.configAxisBtn.disabled = !connected || this.isFocusing || this.isCapturing || this.isRecording;
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
        if (this.roiSection) { // Reset ROI if selectors worked
             try {
                 this.roiSection.querySelectorAll('input').forEach(input => input.value = '--');
             } catch(e) { /* ignore */ }
        }
        this.applyBlur(1); // Apply max blur
    }

    // Populates controls with simulated data (called after connection)
    populateSimulatedData() {
        console.log("正在填充模拟数据...");
        // Basic Settings
        this.serialNumberSelect.innerHTML = '<option value="SN12345678">SN12345678</option><option value="SN98765432">SN98765432</option>';
        this.serialNumberSelect.value = "SN12345678";
        this.configFileInput.value = "C:/CameraConfigs/default_定焦.cfg";
        this.savePathInput.value = "D:/Captures/定焦相机/";
        this.cameraNameInput.value = "前置定焦相机";
        this.cameraModelInput.value = "模拟相机 (XYZ-100)";

        // Camera Properties Table
        const properties = [
             { name: 'Y反转', type: 'select', options: ['否', '是'], value: '否' },
             { name: 'X反转', type: 'select', options: ['否', '是'], value: '否' },
             { name: '触发模式', type: 'select', options: ['连续采集', '外部触发', '软件触发'], value: '连续采集' },
             { name: '触发信号', type: 'select', options: ['上升', '下降', '任意边缘'], value: '上升' },
             { name: '触发源', type: 'select', options: ['通道0', '通道1', '软件'], value: '通道0' },
             { name: '图像格式', type: 'select', options: ['MONO8', 'MONO10', 'RGB8', 'BAYER_RG8'], value: 'MONO8' },
             { name: '曝光时间(us)', type: 'number', value: 15000, min: 10, max: 1000000, step: 10 },
             { name: '增益', type: 'number', value: 1.2, min: 0, max: 16, step: 0.1 },
             { name: '白平衡', type: 'select', options: ['自动', '手动', '关闭'], value: '自动' },
             { name: '红(R)', type: 'range', value: 55, min: 0, max: 100 },
             { name: '绿(G)', type: 'range', value: 50, min: 0, max: 100 },
             { name: '蓝(B)', type: 'range', value: 60, min: 0, max: 100 }
        ];
        this.propertyTableBody.innerHTML = '';
        properties.forEach(prop => {
            const row = this.propertyTableBody.insertRow();
            const nameCell = row.insertCell();
            const valueCell = row.insertCell();
            nameCell.textContent = prop.name;
            let control;
            if (prop.type === 'select') {
                control = document.createElement('select');
                prop.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    control.appendChild(option);
                });
                control.value = prop.value;
            } else if (prop.type === 'number' || prop.type === 'range') {
                 control = document.createElement('input');
                 control.type = prop.type;
                 control.value = prop.value;
                 if (prop.min !== undefined) control.min = prop.min;
                 if (prop.max !== undefined) control.max = prop.max;
                 if (prop.step !== undefined) control.step = prop.step;
            }
             if (control) {
                 valueCell.appendChild(control);
                 control.disabled = !this.isConnected; // Ensure new controls are disabled if created while disconnected (edge case)
                 control.addEventListener('change', (e) => {
                     console.log(`属性更改: ${prop.name} = ${e.target.value}`);
                     // Add specific actions here if needed, e.g., update camera settings
                 });
             }
        });

        // ROI Area
        try {
             // Check if the ROI input references were found in the constructor
             if (this.roiLeftX && this.roiTopY && this.roiRightX && this.roiBottomY) {
                 // Use the stored references instead of querying again
                 this.roiLeftX.value = 150;
                 this.roiTopY.value = 100;
                 this.roiRightX.value = 450;
                 this.roiBottomY.value = 400;
            } else {
                // Log a warning if the elements weren't found initially
                if (!this.warnedAboutRoiNotFound) { // Prevent repeated warnings
                     console.warn("警告: 未能在构造函数中完全找到 ROI 输入框引用，无法填充模拟值。");
                     this.warnedAboutRoiNotFound = true; // Set flag
                 }
            }
        } catch (e) {
            // This catch might still be useful for unexpected errors during value setting
            console.error("填充 ROI 区域时发生意外错误:", e);
        }
        console.log("模拟数据填充完成。");
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
                 console.log(`模拟: [控制器->图像处理] 获取当前位置清晰度`);
                 console.log(` > 粗扫: Z=${z_rough.toFixed(2)}, 清晰度=${this.currentClarity.toFixed(3)}`);
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
                  console.log(`模拟: [控制器->图像处理] 获取当前位置清晰度`);
                 console.log(` > 精扫: Z=${z_fine.toFixed(2)}, 清晰度=${this.currentClarity.toFixed(3)}`);
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
             // Optionally revert to idle after a delay if focus was successful
             if (this.focusStatusText.textContent === '已对焦') {
                 setTimeout(() => {
                     if(this.isConnected && !this.isFocusing) this.updateFocusStatus('空闲');
                 }, 2000);
             }
        }
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
        console.log(`模拟: ROI 已 ${this.roiEnabled ? '启用' : '禁用'}`);
        if (this.roiOverlay) {
            this.roiOverlay.style.display = this.roiEnabled ? 'block' : 'none';
            if (this.roiEnabled) {
                 // Simulate setting ROI overlay position based on inputs (or fixed for demo)
                 const l = parseInt(document.querySelector('.panel-section:has(h3:contains("ROI区域")) input[type="number"]:nth-of-type(1)').value) || 150;
                 const t = parseInt(document.querySelector('.panel-section:has(h3:contains("ROI区域")) input[type="number"]:nth-of-type(2)').value) || 100;
                 const r = parseInt(document.querySelector('.panel-section:has(h3:contains("ROI区域")) input[type="number"]:nth-of-type(3)').value) || 450;
                 const b = parseInt(document.querySelector('.panel-section:has(h3:contains("ROI区域")) input[type="number"]:nth-of-type(4)').value) || 400;

                // IMPORTANT: Calculation needs to be relative to the *displayed* image size
                const imgRect = this.simulatedImage.getBoundingClientRect();
                const scaleX = imgRect.width / this.simulatedImage.naturalWidth;
                const scaleY = imgRect.height / this.simulatedImage.naturalHeight;

                // Calculate position relative to the image's top-left corner within the camera-view container
                const containerRect = this.simulatedImage.parentElement.getBoundingClientRect();
                const imgOffsetX = imgRect.left - containerRect.left;
                const imgOffsetY = imgRect.top - containerRect.top;

                const dispL = imgOffsetX + (l * scaleX);
                const dispT = imgOffsetY + (t * scaleY);
                const dispW = (r - l) * scaleX;
                const dispH = (b - t) * scaleY;

                this.roiOverlay.style.left = `${dispL}px`;
                this.roiOverlay.style.top = `${dispT}px`;
                this.roiOverlay.style.width = `${dispW}px`;
                this.roiOverlay.style.height = `${dispH}px`;
            }
        }
        this.updateControlStates(true);
    }

    // --- Axis Configuration Modal Logic ---
    openAxisConfigModal() {
        if (!this.isConnected || !this.axisConfigModal) return;

        console.log("打开轴配置弹窗...");
        // Populate dropdown
        this.axisSelectDropdown.innerHTML = '<option value="">--请选择--</option>'; // Clear existing
        this.simulatedAxes.forEach(axis => {
            const option = document.createElement('option');
            option.value = axis;
            option.textContent = axis;
            this.axisSelectDropdown.appendChild(option);
        });

        // Set current selection if available
        this.axisSelectDropdown.value = this.selectedAxis || "";
        this.modalCameraSNInput.value = this.serialNumberSelect.value || "N/A"; // Show current camera SN

        // Use classList to show modal with transition
        this.axisConfigModal.classList.add('show');
    }

    closeAxisConfigModal() {
         if (!this.axisConfigModal) return;
         // Use classList to hide modal with transition
         this.axisConfigModal.classList.remove('show');
         console.log("关闭轴配置弹窗");
    }

    saveAxisConfiguration() {
        if (!this.axisConfigModal) return;
        const newlySelectedAxis = this.axisSelectDropdown.value;
        if (!newlySelectedAxis) {
            alert("请选择一个有效的Z轴！");
            return;
        }
        this.selectedAxis = newlySelectedAxis;
        console.log(`模拟: 保存相机 ${this.modalCameraSNInput.value} 的 Z 轴配置为: ${this.selectedAxis}`);
        alert(`模拟：配置已保存: ${this.selectedAxis}`); // Give user feedback
        this.closeAxisConfigModal();
        // In a real app, you might trigger other actions here
    }

    // --- Event Listeners ---
    initializeEventListeners() {
        this.connectBtn.addEventListener('click', () => {
            if (this.isConnected) {
                this.disconnectCamera();
            } else {
                this.connectCamera();
            }
        });
        this.configAxisBtn.addEventListener('click', () => this.openAxisConfigModal());
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
        this.calibrateBtn?.addEventListener('click', () => {
            if (this.isConnected && this.focusStatusText.textContent === '已对焦' && !this.isCapturing && !this.isRecording) {
                 console.log("模拟: 手动触发当量计算...");
                 alert("模拟：执行当量计算（未实现详细逻辑）");
             } else {
                 console.warn("请先连接、成功对焦且停止采集/录制后再执行当量计算");
             }
         });
        this.enableRoiBtn?.addEventListener('click', () => this.toggleROI());

        // Modal listeners
        this.modalSaveAxisBtn.addEventListener('click', () => this.saveAxisConfiguration());
        this.modalCancelAxisBtn.addEventListener('click', () => this.closeAxisConfigModal());
        this.modalOverlay.addEventListener('click', () => this.closeAxisConfigModal()); // Close on overlay click

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
    }

    // --- Initial Setup ---
    initUI() {
        this.updateUI();
        this.updateFocusStatus('未连接');
        this.updateControlStates(false); // Ensure controls start disabled
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
}

// Initialize the controller when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CameraController();
}); 