// 全局状态
let cameraState = {
    isConnected: false,
    isFocusing: false,
    isCapturing: false,
    isRecording: false,
    XPosition: null,
    YPosition: null,
    ZPosition: null,
    UPosition: null,
    isZConfigured: false,
    isDrawingROI: false,
    roiEnabled: false,
    isShowingCalibration: false,
    calibrationResult: null,
    axisLimits: {
        X: { min: -100.0, max: 100.0 },
        Y: { min: -100.0, max: 100.0 },
        Z: { min: 0.0, max: 50.0 },
        U: { min: -180.0, max: 180.0 }
    },
    focusParams: {
        rangeUp: 5.0,
        rangeDown: 5.0,
        times: 2,
        steps: 10,
        exposure: 5000,
        gain: 1.0
    },
    // 新增PLC轴数据和映射
    plcAxes: [],
    axisMapping: {
        "1": "X",
        "2": "Y", 
        "3": "Z",
        "4": "U"
    }
};

// 相机标定相关状态
let calibrationState = {
    isCalibrating: false,
    markDetected: false,
    markCentered: false,
    currentPoint: null,
    totalPoints: 0,
    completedPoints: 0,
    markPoints: [],
    calibrationMatrix: [],
    calibrationResults: null,
    // 添加模拟标定需要的字段
    imageWidth: 1920,
    imageHeight: 1080,
    centerX: 960,  // 图片中心X坐标
    centerY: 540,  // 图片中心Y坐标
    simulationDelay: 500, // 模拟移动和拍照的延迟时间(ms)
    markPosition: null, // 当前Mark点位置
    matrixCells: [], // 矩阵单元格DOM元素引用
    failedPoints: [] // 记录失败的点位
};

// DOM 元素
let connectBtn, serialInput, statusText, focusStatusText, currentZInput, clarityInput;
let startFocusBtn, stopFocusBtn, axisInputs, jogBtns, stepSelects;
let axisConfigModal, axisSelect, encoderValue, axisRatio, axisBacklash, axisSpeed;
let axisAcc, softLimitMin, softLimitMax;
let configFileInput, savePathInput, selectConfigBtn, selectFolderBtn;
let drawRoiFocusBtn, focusRoiButtonGroup;
let focusParamsModal, focusRangeUp, focusRangeDown, focusTimes, focusSteps, focusExposure, focusGain;
// 当量计算相关
let toggleViewBtn, calibrateBtn, calibSquareSize, calibResultValue;
let simulatedImage, calibrationPattern;

// 初始化DOM引用
function initializeDOMReferences() {
    // 基础控件
    connectBtn = document.getElementById('connect-btn');
    serialInput = document.getElementById('serial-number');
    statusText = document.getElementById('status-text');
    focusStatusText = document.getElementById('focus-status-text');
    currentZInput = document.getElementById('current-z');
    clarityInput = document.getElementById('clarity-value');
    startFocusBtn = document.getElementById('start-focus-btn');
    stopFocusBtn = document.getElementById('stop-focus-btn');

    // 轴控件
    axisInputs = {
        x: document.getElementById('x-axis'),
        y: document.getElementById('y-axis'),
        z: document.getElementById('z-axis'),
        u: document.getElementById('u-axis')
    };

    // 点动和步进控件
    jogBtns = document.querySelectorAll('.jog-btn');
    stepSelects = document.querySelectorAll('.step-select');

    // 配置弹窗控件
    axisConfigModal = document.getElementById('axis-config-modal');
    axisSelect = document.getElementById('axis-select');
    encoderValue = document.getElementById('encoder-value');
    axisRatio = document.getElementById('axis-ratio');
    axisBacklash = document.getElementById('axis-backlash');
    axisSpeed = document.getElementById('axis-speed');
    axisAcc = document.getElementById('axis-acc');
    softLimitMin = document.getElementById('soft-limit-min');
    softLimitMax = document.getElementById('soft-limit-max');

    // 配置文件和保存路径控件
    configFileInput = document.getElementById('config-file');
    savePathInput = document.getElementById('save-path');
    selectConfigBtn = document.getElementById('select-config-btn');
    selectFolderBtn = document.getElementById('select-folder-btn');

    // ROI相关控件
    drawRoiFocusBtn = document.getElementById('draw-roi-focus-btn');
    focusRoiButtonGroup = document.getElementById('focus-roi-button-group');
    
    // 对焦控制按钮
    startFocusBtn = document.getElementById('start-focus-btn');
    stopFocusBtn = document.getElementById('stop-focus-btn');

    // ROI相关按钮
    const confirmRoiBtn = document.getElementById('confirm-roi-focus-btn');
    const redrawRoiBtn = document.getElementById('redraw-roi-focus-btn');
    const clearRoiBtn = document.getElementById('clear-roi-focus-btn');
    const toggleRoiVisibilityBtn = document.getElementById('toggle-focus-roi-visibility-btn');

    // 自动对焦参数设置控件
    focusParamsModal = document.getElementById('focus-params-modal');
    focusRangeUp = document.getElementById('focus-range-up');
    focusRangeDown = document.getElementById('focus-range-down');
    focusTimes = document.getElementById('focus-times');
    focusSteps = document.getElementById('focus-steps');
    focusExposure = document.getElementById('focus-exposure');
    focusGain = document.getElementById('focus-gain');

    // 校准和当量计算相关控件
    toggleViewBtn = document.getElementById('toggle-view-btn');
    calibrateBtn = document.getElementById('calibrate-btn');
    calibSquareSize = document.getElementById('calib-square-size');
    calibResultValue = document.getElementById('calibration-result-value');
    simulatedImage = document.getElementById('simulated-image');
    calibrationPattern = document.getElementById('calibration-pattern-display');

    // 标定控件
    matrixSize = document.getElementById('matrix-size');
    pointOffset = document.getElementById('point-offset');
    markSize = document.getElementById('mark-size');
    detectMarkBtn = document.getElementById('detect-mark-btn');
    centerMarkBtn = document.getElementById('center-mark-btn');
    startCalibBtn = document.getElementById('start-calib-btn');
    stopCalibBtn = document.getElementById('stop-calib-btn');
    calibrationStatus = document.getElementById('calibration-status');
    currentPoint = document.getElementById('current-point');
    calibrationProgress = document.getElementById('calibration-progress');

    // 添加事件监听器
    if (selectConfigBtn) {
        selectConfigBtn.addEventListener('click', selectConfigFile);
    }
    if (selectFolderBtn) {
        selectFolderBtn.addEventListener('click', selectSavePath);
    }
    if (drawRoiFocusBtn) {
        drawRoiFocusBtn.addEventListener('click', toggleRoiDrawing);
    }
    if (confirmRoiBtn) {
        confirmRoiBtn.addEventListener('click', confirmRoi);
    }
    if (redrawRoiBtn) {
        redrawRoiBtn.addEventListener('click', redrawRoi);
    }
    if (clearRoiBtn) {
        clearRoiBtn.addEventListener('click', clearRoi);
    }
    if (toggleRoiVisibilityBtn) {
        toggleRoiVisibilityBtn.addEventListener('click', toggleRoiVisibility);
    }

    // 自动对焦参数设置相关事件监听
    document.getElementById('save-focus-params').addEventListener('click', saveFocusParams);
    document.getElementById('cancel-focus-params').addEventListener('click', hideFocusParamsModal);
    focusParamsModal.querySelector('.close-button').addEventListener('click', hideFocusParamsModal);

    // 添加参数设置按钮到对焦控制区
    const focusControls = document.querySelector('.focus-controls');
    if (focusControls) {
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'primary-button';
        settingsBtn.innerHTML = '<i class="fas fa-cog"></i> 对焦参数';
        settingsBtn.addEventListener('click', showFocusParamsModal);
        settingsBtn.id = 'focus-settings-btn';
        focusControls.appendChild(settingsBtn);
    }

    // 校准相关的事件监听器
    if (toggleViewBtn) {
        toggleViewBtn.addEventListener('click', toggleCalibrationView);
        console.log('校准图像切换按钮就绪', toggleViewBtn);
    } else {
        console.error('未找到校准图像切换按钮(#toggle-view-btn)');
    }
    if (calibrateBtn) {
        calibrateBtn.addEventListener('click', calculateRatio);
        console.log('当量计算按钮就绪', calibrateBtn);
    } else {
        console.error('未找到当量计算按钮(#calibrate-btn)');
    }

    // 标定相关事件监听
    if (detectMarkBtn) {
        detectMarkBtn.addEventListener('click', detectMarkPoint);
    }
    if (centerMarkBtn) {
        centerMarkBtn.addEventListener('click', centerMarkPoint);
    }
    if (startCalibBtn) {
        startCalibBtn.addEventListener('click', startCalibration);
    }
    if (stopCalibBtn) {
        stopCalibBtn.addEventListener('click', stopCalibration);
    }
}

// 轴配置相关
const axisConfigs = {
    X: { ratio: 0.001, backlash: 0.01, speed: 10.0, acc: 100.0 },
    Y: { ratio: 0.001, backlash: 0.01, speed: 10.0, acc: 100.0 },
    Z: { ratio: 0.001, backlash: 0.005, speed: 5.0, acc: 50.0 },
    U: { ratio: 0.01, backlash: 0.02, speed: 20.0, acc: 200.0 }
};

// 更新轴配置显示
function updateAxisDisplay(state) {
    if (!state) return;
    
    Object.keys(axisInputs).forEach(axis => {
        const input = axisInputs[axis];
        if (input) {
            const position = state[`${axis.toUpperCase()}Position`];
            input.disabled = !state.isConnected;
            input.value = position !== null ? position.toFixed(3) : '';
            
            // 更新点动按钮状态
            const btns = document.querySelectorAll(`.jog-btn[data-axis="${axis.toUpperCase()}"]`);
            btns.forEach(btn => {
                btn.disabled = !state.isConnected;
                if (state.isConnected && state.axisLimits && state.axisLimits[axis.toUpperCase()]) {
                    const isPlus = btn.classList.contains('plus');
                    const limit = state.axisLimits[axis.toUpperCase()];
                    const step = parseFloat(document.querySelector(`.step-select[data-axis="${axis.toUpperCase()}"]`).value);
                    
                    // 检查是否会超出限制
                    if (isPlus) {
                        btn.disabled = position + step > limit.max;
                    } else {
                        btn.disabled = position - step < limit.min;
                    }
                }
            });
            
            // 更新配置按钮状态
            const configBtn = document.querySelector(`.config-button[data-axis="${axis.toUpperCase()}"]`);
            if (configBtn) {
                configBtn.disabled = !state.isConnected;
            }
        }
    });
    
    // 更新Z轴配置状态
    if (state.ZPosition !== null) {
        const zDiff = Math.abs(state.ZPosition - state.currentZ);
        state.isZConfigured = zDiff < 0.01; // 如果Z轴位置和当前Z位置接近，认为已配置
    }
    
    // 更新自动对焦按钮状态
    if (startFocusBtn && stopFocusBtn) {
        startFocusBtn.disabled = !state.isConnected || state.isFocusing || !state.isZConfigured;
        stopFocusBtn.disabled = !state.isConnected || !state.isFocusing;
    }
}

// 点动控制函数
async function jogAxis(axis, direction) {
    if (!cameraState.isConnected) return;
    
    // 获取对应的轴ID
    const axisId = getAxisIdByName(axis);
    if (!axisId) return;
    
    const stepSelect = document.querySelector(`.step-select[data-axis="${axis}"]`);
    const step = parseFloat(stepSelect.value) * direction;
    const currentPos = cameraState[`${axis}Position`];
    const limits = cameraState.axisLimits[axis];
    
    // 检查是否会超出限制
    const newPos = currentPos + step;
    if (newPos < limits.min || newPos > limits.max) return;
    
    try {
        const response = await fetch('/jog_axis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                axis: axisId,  // 发送轴ID
                step: step
            })
        });
        const state = await response.json();
        updateStatus(state);
    } catch (error) {
        console.error('点动控制失败:', error);
    }
}

// 更新连接按钮状态
function updateConnectButton() {
    connectBtn.textContent = cameraState.isConnected ? '断开' : '连接';
    connectBtn.className = `connect-button ${cameraState.isConnected ? 'connected' : ''}`;
}

// 更新状态显示
function updateStatus(state) {
    cameraState = { ...cameraState, ...state };
    
    // 更新连接状态
    updateConnectButton();
    
    // 更新轴配置显示
    updateAxisDisplay(cameraState);
    
    // 更新其他状态显示
    if (focusStatusText) {
        focusStatusText.textContent = state.focusStatus || '未连接';
        focusStatusText.className = `status-${state.focusStatus || '未连接'}`;
    }
    
    if (currentZInput) {
        currentZInput.value = state.currentZ ? state.currentZ.toFixed(3) : '--';
    }
    
    if (clarityInput) {
        clarityInput.value = state.clarity ? state.clarity.toFixed(3) : '--';
    }
    
    // 更新按钮状态
    if (startFocusBtn) {
        startFocusBtn.disabled = !state.isConnected || state.isFocusing;
    }
    if (stopFocusBtn) {
        stopFocusBtn.disabled = !state.isConnected || !state.isFocusing;
    }
    if (drawRoiFocusBtn) {
        drawRoiFocusBtn.disabled = !state.isConnected || state.isFocusing;
    }
    
    // 更新ROI按钮组状态
    const roiButtons = focusRoiButtonGroup.getElementsByTagName('button');
    for (const btn of roiButtons) {
        btn.disabled = !state.isConnected || state.isFocusing;
    }
    
    // 更新配置文件和保存路径显示
    if (configFileInput && state.configFile) {
        configFileInput.value = state.configFile;
    }
    if (savePathInput && state.savePath) {
        savePathInput.value = state.savePath;
    }
    
    // 更新对焦参数设置按钮状态
    const focusSettingsBtn = document.getElementById('focus-settings-btn');
    if (focusSettingsBtn) {
        focusSettingsBtn.disabled = !state.isConnected || state.isFocusing;
    }

    // 更新校准相关按钮状态
    if (toggleViewBtn) {
        toggleViewBtn.disabled = !state.isConnected || state.isFocusing;
        console.log('toggleViewBtn状态更新:', toggleViewBtn.disabled ? '禁用' : '启用');
    }
    if (calibrateBtn) {
        calibrateBtn.disabled = !state.isConnected || state.isFocusing || !state.isShowingCalibration;
        console.log('calibrateBtn状态更新:', calibrateBtn.disabled ? '禁用' : '启用', 
                   '(isConnected:', state.isConnected, 
                   'isFocusing:', state.isFocusing, 
                   'isShowingCalibration:', state.isShowingCalibration, ')');
    }
    if (calibSquareSize) {
        calibSquareSize.disabled = !state.isConnected;
    }
}

// 定期更新状态
function startStatusPolling() {
    let pollTimeout;
    
    async function poll() {
        if (cameraState.isConnected) {
            try {
                const response = await fetch('/status');
                const state = await response.json();
                updateStatus(state);
                
                // 根据状态设置下次轮询间隔
                const interval = state.isFocusing ? 100 : 500;
                pollTimeout = setTimeout(poll, interval);
        } catch (error) {
                console.error('状态更新失败:', error);
                pollTimeout = setTimeout(poll, 1000); // 出错时降低请求频率
            }
        } else {
            pollTimeout = setTimeout(poll, 500); // 未连接时降低轮询频率
        }
    }

    // 开始轮询
    poll();

    // 清理函数
    return () => {
        if (pollTimeout) {
            clearTimeout(pollTimeout);
        }
    };
}

// 连接/断开相机
async function toggleConnection() {
    try {
        if (!cameraState.isConnected) {
            const response = await fetch('/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serialNumber: serialInput.value })
            });
            const state = await response.json();
            updateStatus(state);
            } else {
            // 断开连接前先停止自动对焦
            if (cameraState.isFocusing) {
                await stopAutoFocus();
            }
            await fetch('/disconnect', { method: 'POST' });
            updateStatus({ 
                isConnected: false, 
                isFocusing: false,
                XPosition: null,
                YPosition: null,
                ZPosition: null,
                UPosition: null,
                isZConfigured: false
            });
        }
        } catch (error) {
        console.error('连接操作失败:', error);
    }
}

// 自动连接相机
async function autoConnect() {
    if (!cameraState.isConnected) {
        await toggleConnection();
    }
}

// 开始自动对焦
async function startAutoFocus() {
    try {
        const response = await fetch('/start_focus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cameraState.focusParams)
        });
        const state = await response.json();
        updateStatus(state);
    } catch (error) {
        console.error('开始自动对焦失败:', error);
    }
}

// 停止自动对焦
async function stopAutoFocus() {
    try {
        const response = await fetch('/stop_focus', { method: 'POST' });
        const state = await response.json();
        updateStatus(state);
        } catch (error) {
        console.error('停止自动对焦失败:', error);
    }
}

// 加载PLC轴列表
async function loadPlcAxes() {
    try {
        const response = await fetch('/api/axes');
        const axes = await response.json();
        cameraState.plcAxes = axes;
        
        // 填充轴选择下拉框
        populateAxisSelect();
        
        console.log('PLC轴列表已加载:', axes);
    } catch (error) {
        console.error('加载PLC轴列表失败:', error);
    }
}

// 填充轴选择下拉框
function populateAxisSelect() {
    const select = document.getElementById('axis-select');
    if (!select) return;
    
    // 清空当前选项
    select.innerHTML = '';
    
    // 添加新选项
    cameraState.plcAxes.forEach(axis => {
        const option = document.createElement('option');
        option.value = axis.id;
        option.textContent = axis.name;
        select.appendChild(option);
    });
}

// 显示轴配置弹窗
function showAxisConfigModal(axis) {
    // 设置当前选中的轴ID
    const axisId = getAxisIdByName(axis);
    if (axisSelect && axisId) {
        axisSelect.value = axisId;
    }
    
    // 获取当前轴的配置
    const config = axisConfigs[axis];
    
    // 设置编码器值（从当前位置获取）
    encoderValue.value = cameraState[`${axis}Position`] || 0;
    
    // 设置其他配置值
    axisRatio.value = config.ratio;
    axisBacklash.value = config.backlash;
    axisSpeed.value = config.speed;
    axisAcc.value = config.acc;
    
    // 设置软限位
    const limits = cameraState.axisLimits[axis];
    softLimitMin.value = limits.min;
    softLimitMax.value = limits.max;
    
    // 显示弹窗
    axisConfigModal.classList.add('show');
}

// 根据轴名称获取对应的PLC轴ID
function getAxisIdByName(axisName) {
    for (const [id, name] of Object.entries(cameraState.axisMapping)) {
        if (name === axisName) {
            return id;
        }
    }
    return null;
}

// 根据轴ID获取轴名称
function getAxisNameById(axisId) {
    return cameraState.axisMapping[axisId] || axisId;
}

// 隐藏轴配置弹窗
function hideAxisConfigModal() {
    axisConfigModal.classList.remove('show');
}

// 保存轴配置
function saveAxisConfig() {
    const axisId = axisSelect.value;
    const axisName = getAxisNameById(axisId);
    const config = {
        ratio: parseFloat(axisRatio.value),
        backlash: parseFloat(axisBacklash.value),
        speed: parseFloat(axisSpeed.value),
        acc: parseFloat(axisAcc.value)
    };
    
    // 更新软限位
    const min = parseFloat(softLimitMin.value);
    const max = parseFloat(softLimitMax.value);
    if (min < max) {
        cameraState.axisLimits[axisName] = { min, max };
    }
    
    // 更新配置
    axisConfigs[axisName] = config;
    
    // 发送到后端
    fetch('/save_axis_config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            axis: axisId,
            config,
            limits: { min, max }
        })
    }).then(response => response.json())
      .then(data => {
          console.log('轴配置已保存:', data);
          hideAxisConfigModal();
      })
      .catch(error => {
          console.error('保存轴配置失败:', error);
      });
}

// 选择配置文件
async function selectConfigFile() {
    try {
        const response = await fetch('/select_config', {
            method: 'POST'
        });
        const result = await response.json();
        if (result.success) {
            configFileInput.value = result.path;
            // 更新相机配置
            await updateCameraConfig(result.path);
        }
    } catch (error) {
        console.error('选择配置文件失败:', error);
    }
}

// 选择保存路径
async function selectSavePath() {
    try {
        const response = await fetch('/select_save_path', {
            method: 'POST'
        });
        const result = await response.json();
        if (result.success) {
            savePathInput.value = result.path;
            // 更新保存路径
            await updateSavePath(result.path);
        }
    } catch (error) {
        console.error('选择保存路径失败:', error);
    }
}

// 更新相机配置
async function updateCameraConfig(configPath) {
    try {
        const response = await fetch('/update_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ configPath })
        });
        const state = await response.json();
        updateStatus(state);
    } catch (error) {
        console.error('更新相机配置失败:', error);
    }
}

// 更新保存路径
async function updateSavePath(savePath) {
    try {
        const response = await fetch('/update_save_path', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ savePath })
        });
        const state = await response.json();
        updateStatus(state);
    } catch (error) {
        console.error('更新保存路径失败:', error);
    }
}

// 显示自动对焦参数设置弹窗
function showFocusParamsModal() {
    if (!cameraState.isConnected) return;
    
    // 设置当前值
    focusRangeUp.value = cameraState.focusParams.rangeUp;
    focusRangeDown.value = cameraState.focusParams.rangeDown;
    focusTimes.value = cameraState.focusParams.times;
    focusSteps.value = cameraState.focusParams.steps;
    focusExposure.value = cameraState.focusParams.exposure;
    focusGain.value = cameraState.focusParams.gain;
    
    focusParamsModal.classList.add('show');
}

// 隐藏自动对焦参数设置弹窗
function hideFocusParamsModal() {
    focusParamsModal.classList.remove('show');
}

// 保存自动对焦参数
async function saveFocusParams() {
    const params = {
        rangeUp: parseFloat(focusRangeUp.value),
        rangeDown: parseFloat(focusRangeDown.value),
        times: parseInt(focusTimes.value),
        steps: parseInt(focusSteps.value),
        exposure: parseInt(focusExposure.value),
        gain: parseFloat(focusGain.value)
    };

    try {
        const response = await fetch('/update_focus_params', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        const result = await response.json();
        if (result.success) {
            cameraState.focusParams = params;
            hideFocusParamsModal();
        }
    } catch (error) {
        console.error('保存对焦参数失败:', error);
    }
}

// ROI绘制相关函数
function toggleRoiDrawing() {
    if (!cameraState.isConnected) return;
    
    cameraState.isDrawingROI = !cameraState.isDrawingROI;
    
    if (cameraState.isDrawingROI) {
        // 开始绘制
        drawRoiFocusBtn.classList.add('active');
        focusRoiButtonGroup.style.display = 'flex';
        // 启用ROI绘制模式
        enableRoiDrawing();
    } else {
        // 取消绘制
        drawRoiFocusBtn.classList.remove('active');
        focusRoiButtonGroup.style.display = 'none';
        // 禁用ROI绘制模式
        disableRoiDrawing();
    }
}

function enableRoiDrawing() {
    const overlay = document.getElementById('focus-roi-overlay');
    if (overlay) {
        overlay.style.display = 'block';
        // 这里添加鼠标事件监听器用于绘制ROI
        // 实现ROI绘制的具体逻辑
    }
}

function disableRoiDrawing() {
    const overlay = document.getElementById('focus-roi-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        // 移除鼠标事件监听器
    }
}

function confirmRoi() {
    if (!cameraState.isDrawingROI) return;
    
    // 确认当前ROI
    cameraState.roiEnabled = true;
    cameraState.isDrawingROI = false;
    drawRoiFocusBtn.classList.remove('active');
    
    // 发送ROI数据到后端
    updateRoiOnServer();
}

function redrawRoi() {
    if (!cameraState.isDrawingROI) return;
    
    // 清除当前ROI
    clearRoi();
    // 重新开始绘制
    enableRoiDrawing();
}

function clearRoi() {
    cameraState.roiEnabled = false;
    cameraState.isDrawingROI = false;
    drawRoiFocusBtn.classList.remove('active');
    
    const overlay = document.getElementById('focus-roi-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
    }
    
    // 通知后端清除ROI
    fetch('/clear_roi', { method: 'POST' })
        .then(response => response.json())
        .catch(error => console.error('清除ROI失败:', error));
}

function toggleRoiVisibility() {
    const overlay = document.getElementById('focus-roi-overlay');
    if (overlay) {
        overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
    }
}

async function updateRoiOnServer() {
    try {
        const response = await fetch('/update_roi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                enabled: cameraState.roiEnabled,
                coords: getRoiCoordinates()
            })
        });
        const result = await response.json();
        if (!result.success) {
            console.error('更新ROI失败:', result.message);
        }
    } catch (error) {
        console.error('更新ROI失败:', error);
    }
}

function getRoiCoordinates() {
    const overlay = document.getElementById('focus-roi-overlay');
    if (!overlay) return null;
    
    // 获取ROI的坐标信息
    // 这里需要根据实际的ROI绘制实现来获取坐标
    return {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
    };
}

// 当量计算相关功能
// 切换显示校准图案/相机图像
async function toggleCalibrationView() {
    if (!cameraState.isConnected) return;

    try {
        if (!cameraState.isShowingCalibration) {
            // 获取当前的方格大小
            const squareSize = parseInt(calibSquareSize.value || 50);
            
            // 获取校准图案
            const response = await fetch(`/generate_calibration_image?square_size=${squareSize}`);
            const result = await response.json();
            
            if (result.success) {
                // 更新状态
                cameraState.isShowingCalibration = true;
                
                // 显示校准图案
                if (simulatedImage) {
                    simulatedImage.style.display = 'none';
                }
                if (calibrationPattern) {
                    calibrationPattern.style.display = 'block';
                    calibrationPattern.innerHTML = `<img src="${result.image}" alt="校准图案" style="width:100%;height:100%;">`;
                }
                toggleViewBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 显示相机图像';
                
                // 启用计算按钮
                if (calibrateBtn) {
                    calibrateBtn.disabled = false;
                }
                
                console.log('已切换到校准图案视图');
            }
        } else {
            // 隐藏校准图案，显示相机图像
            const response = await fetch('/hide_calibration_image', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                // 更新状态
                cameraState.isShowingCalibration = false;
                
                if (simulatedImage) {
                    simulatedImage.style.display = 'block';
                }
                if (calibrationPattern) {
                    calibrationPattern.style.display = 'none';
                    calibrationPattern.innerHTML = '';
                }
                toggleViewBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 显示标定板';
                
                // 禁用计算按钮
                if (calibrateBtn) {
                    calibrateBtn.disabled = true;
                }
                
                console.log('已切换到相机图像视图');
            }
        }
    } catch (error) {
        console.error('切换视图失败:', error);
    }
}

// 计算当量
async function calculateRatio() {
    if (!cameraState.isConnected) {
        alert('请先连接相机');
        return;
    }
    
    try {
        // 获取方格实际尺寸
        const squareSizeMm = parseFloat(calibSquareSize.value || 1.0);
        console.log(`当量计算: 使用方格尺寸 ${squareSizeMm}mm`);
        
        // 获取校准图案
        const response1 = await fetch(`/generate_calibration_image?square_size=50`);
        const result1 = await response1.json();
        
        if (result1.success) {
            // 更新状态
            cameraState.isShowingCalibration = true;
            
            // 显示校准图案
            if (simulatedImage) {
                simulatedImage.style.display = 'none';
            }
            if (calibrationPattern) {
                calibrationPattern.style.display = 'block';
                calibrationPattern.innerHTML = `<img src="${result1.image}" alt="校准图案" style="width:100%;height:100%;">`;
            }
            
            // 给服务器一点时间处理
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 发送计算请求
            const response2 = await fetch('/calculate_ratio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ squareSizeMm })
            });
            const result2 = await response2.json();
            
            if (result2.success) {
                // 更新显示结果
                const ratio = result2.ratio.toFixed(2);
                console.log(`当量计算结果: ${ratio} ${result2.unit}`);
                if (calibResultValue) {
                    calibResultValue.textContent = `${ratio} ${result2.unit}`;
                }
                
                // 可以添加视觉反馈
                calibrateBtn.classList.add('success');
                setTimeout(() => {
                    calibrateBtn.classList.remove('success');
                }, 1000);
                
                // 自动切换回相机视图
                setTimeout(async () => {
                    if (simulatedImage) {
                        simulatedImage.style.display = 'block';
                    }
                    if (calibrationPattern) {
                        calibrationPattern.style.display = 'none';
                        calibrationPattern.innerHTML = '';
                    }
                    cameraState.isShowingCalibration = false;
                }, 2000);
            } else {
                console.error('当量计算失败:', result2.message);
                alert('当量计算失败: ' + (result2.message || '未知错误'));
            }
        } else {
            console.error('获取校准图像失败:', result1.message);
            alert('获取校准图像失败: ' + (result1.message || '未知错误'));
        }
    } catch (error) {
        console.error('计算当量失败:', error);
        alert('当量计算发生错误，请查看控制台日志');
    }
}

// 显示Mark点
function showMarkPoints(points, className = 'detected') {
    // 清除现有的Mark点显示
    document.querySelectorAll('.mark-point').forEach(el => el.remove());
    
    // 显示新的Mark点
    const container = document.getElementById('camera-display-container');
    points.forEach(point => {
        const markEl = document.createElement('div');
        markEl.className = `mark-point ${className}`;
        markEl.style.left = `${point.x}px`;
        markEl.style.top = `${point.y}px`;
        container.appendChild(markEl);
    });
}

// 检测Mark点函数修改，确保没有多余绿点
async function detectMarkPoint() {
    if (!cameraState.isConnected) {
        alert('请先连接相机');
        return;
    }

    try {
        // 确保清除所有已有Mark点
        document.querySelectorAll('.mark-point').forEach(el => el.remove());
        
        // 更新状态显示
        calibrationStatus.textContent = '正在检测Mark点...';
        calibrationStatus.className = 'status-text active';
        
        // 调用后端API
        const response = await fetch('/detect_mark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 更新标定状态
            calibrationState.markDetected = true;
            calibrationState.markPoints = result.markPoints;
            calibrationState.markPosition = result.markPoints[0];
            
            // 获取带有标记点的图像
            const imageResponse = await fetch(`/generate_mark_image?markX=${calibrationState.markPosition.x}&markY=${calibrationState.markPosition.y}&markSize=8`);
            const imageResult = await imageResponse.json();
            
            if (imageResult.success) {
                simulatedImage.src = imageResult.image;
                simulatedImage.style.maxWidth = '640px';
                simulatedImage.style.maxHeight = '480px';
                simulatedImage.style.margin = 'auto';
                simulatedImage.style.border = '1px solid #ccc';
                
                // 显示检测到的Mark点 (红色)
                showMarkPoints(calibrationState.markPoints);
                
                // 启用居中按钮
                centerMarkBtn.disabled = false;
                
                // 更新状态
                calibrationStatus.textContent = result.message;
                calibrationStatus.className = 'status-text active';
                
                // 添加图例
                const container = document.getElementById('camera-display-container');
                const markLegend = document.createElement('div');
                markLegend.className = 'mark-legend';
                markLegend.innerHTML = `
                    <div class="legend-item">
                        <span class="legend-dot red"></span> <span>检测到的Mark点</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-dot green"></span> <span>已对齐的Mark点</span>
                    </div>
                `;
                
                // 移除之前的图例
                const oldLegend = document.querySelector('.mark-legend');
                if (oldLegend) {
                    oldLegend.remove();
                }
                
                container.appendChild(markLegend);
                
                console.log('Mark点检测结果:', calibrationState.markPoints);
            } else {
                console.error('生成标记图像失败:', imageResult.message);
                calibrationStatus.textContent = '检测错误: 无法生成图像';
                calibrationStatus.className = 'status-text error';
            }
        } else {
            console.error('Mark点检测失败:', result.message);
            calibrationStatus.textContent = `检测错误: ${result.message}`;
            calibrationStatus.className = 'status-text error';
        }
    } catch (error) {
        console.error('Mark点检测失败:', error);
        calibrationStatus.textContent = '检测过程出错';
        calibrationStatus.className = 'status-text error';
    }
}

// 居中Mark点
async function centerMarkPoint() {
    if (!calibrationState.markDetected) return;

    try {
        // 清除所有已有Mark点
        document.querySelectorAll('.mark-point').forEach(el => el.remove());
        
        calibrationStatus.textContent = '正在居中Mark点...';
        calibrationStatus.className = 'status-text active';
        
        // 添加移动动画效果
        const markElement = document.querySelector('.mark-point');
        if (markElement) {
            markElement.classList.add('moving');
        }
        
        // 调用后端API
        const response = await fetch('/center_mark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 更新标定状态
            calibrationState.markCentered = true;
            calibrationState.markPosition = result.position;
            
            // 获取更新后的图像
            const imageResponse = await fetch(`/generate_mark_image?markX=${calibrationState.markPosition.x}&markY=${calibrationState.markPosition.y}&markSize=8`);
            const imageResult = await imageResponse.json();
            
            if (imageResult.success) {
                simulatedImage.src = imageResult.image;
                
                // 移除动画
                if (markElement) {
                    markElement.classList.remove('moving');
                }
                
                // 清除旧的点，显示新的居中的Mark点（绿色）
                document.querySelectorAll('.mark-point').forEach(el => el.remove());
                showMarkPoints([calibrationState.markPosition], 'center');
                
                // 启用开始标定按钮
                startCalibBtn.disabled = false;
                
                // 更新状态显示
                calibrationStatus.textContent = result.message;
                calibrationStatus.className = 'status-text active';
                
                console.log('Mark点已居中:', calibrationState.markPosition);
            } else {
                console.error('获取居中图像失败:', imageResult.message);
                calibrationStatus.textContent = '居中错误: 无法获取图像';
                calibrationStatus.className = 'status-text error';
            }
        } else {
            console.error('Mark点居中失败:', result.message);
            calibrationStatus.textContent = `居中错误: ${result.message}`;
            calibrationStatus.className = 'status-text error';
        }
    } catch (error) {
        console.error('Mark点居中失败:', error);
        calibrationStatus.textContent = '居中过程出错';
        calibrationStatus.className = 'status-text error';
    }
}

// 开始标定
async function startCalibration() {
    if (!calibrationState.markCentered) return;

    try {
        // 获取标定矩阵参数
        const size = parseInt(matrixSize.value);
        const offset = parseFloat(pointOffset.value);
        
        // 创建矩阵显示
        createMatrixDisplay(size);
        
        // 更新UI状态
        updateCalibrationUI(true);
        
        // 调用后端API开始标定
        const response = await fetch('/start_calibration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ size, offset })
        });
        
        const result = await response.json();
        
        if (result.success) {
            calibrationState.isCalibrating = true;
            calibrationState.totalPoints = result.totalPoints;
            calibrationState.completedPoints = 0;
            
            // 开始轮询状态
            await pollCalibrationStatus();
        } else {
            console.error('开始标定失败:', result.message);
            calibrationStatus.textContent = `标定错误: ${result.message}`;
            calibrationStatus.className = 'status-text error';
            updateCalibrationUI(false);
        }
    } catch (error) {
        console.error('标定过程失败:', error);
        calibrationState.isCalibrating = false;
        updateCalibrationUI(false);
        calibrationStatus.textContent = '标定错误';
        calibrationStatus.className = 'status-text error';
    }
}

// 轮询标定状态
async function pollCalibrationStatus() {
    const checkInterval = 500; // 每0.5秒检查一次
    
    while (calibrationState.isCalibrating) {
        try {
            const response = await fetch('/calibration_status');
            const status = await response.json();
            
            // 更新状态
            calibrationState.isCalibrating = status.isCalibrating;
            calibrationState.completedPoints = status.completedPoints;
            calibrationState.totalPoints = status.totalPoints;
            calibrationState.currentPoint = status.currentPoint;
            calibrationState.failedPoints = status.failedPoints;
            
            // 更新UI
            updateProgress();
            
            if (status.currentPoint) {
                const pointIndex = status.currentPoint.index;
                updateMatrixDisplay(pointIndex);
                currentPoint.textContent = `X: ${status.currentPoint.x.toFixed(3)}mm, Y: ${status.currentPoint.y.toFixed(3)}mm (${status.currentPoint.row+1},${status.currentPoint.col+1})`;
            }
            
            // 如果标定完成
            if (!status.isCalibrating && status.calibrationResults) {
                // 显示标定结果
                showCalibrationResults(status.calibrationResults);
                break;
            }
            
            // 如果标定已经停止但没有结果
            if (!status.isCalibrating) {
                calibrationStatus.textContent = '标定已停止';
                calibrationStatus.className = 'status-text warning';
                updateCalibrationUI(false);
                break;
            }
            
            // 等待下一次检查
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        } catch (error) {
            console.error('获取标定状态失败:', error);
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
    }
    
    // 标定结束，更新UI
    updateCalibrationUI(false);
}

// 显示标定结果
function showCalibrationResults(results) {
    const resultsContainer = document.getElementById('calibration-results');
    const resultsContent = document.getElementById('calibration-results-content');
    
    if (!resultsContainer || !resultsContent) return;
    
    // 计算平均重投影误差
    const avgError = results.reprojectionError;
    
    // 创建内参矩阵显示
    const intrinsic = results.intrinsic;
    const matrixHtml = `
        <h5>相机标定矩阵 (${results.completedPoints}/${results.totalPoints}点)</h5>
        <div class="calib-matrix">
            <table>
                <tr><td>${intrinsic[0][0].toFixed(2)}</td><td>${intrinsic[0][1].toFixed(2)}</td><td>${intrinsic[0][2].toFixed(2)}</td><td>0</td></tr>
                <tr><td>${intrinsic[1][0].toFixed(2)}</td><td>${intrinsic[1][1].toFixed(2)}</td><td>${intrinsic[1][2].toFixed(2)}</td><td>0</td></tr>
                <tr><td>${intrinsic[2][0].toFixed(2)}</td><td>${intrinsic[2][1].toFixed(2)}</td><td>${intrinsic[2][2].toFixed(2)}</td><td>0</td></tr>
                <tr><td>0</td><td>0</td><td>0</td><td>1</td></tr>
            </table>
        </div>
        <div class="matrix-info">
            <p>标定精度: ${avgError.toFixed(5)}mm</p>
            <p>像素分辨率: ${results.resolution[0]}×${results.resolution[1]}</p>
            <p>完成点数: ${results.completedPoints}/${results.totalPoints}</p>
        </div>
    `;
    
    // 添加详细结果按钮
    resultsContent.innerHTML = matrixHtml;
    resultsContainer.style.display = 'block';
    
    // 添加按钮事件
    const viewFullResultsBtn = document.createElement('button');
    viewFullResultsBtn.id = 'view-full-results';
    viewFullResultsBtn.className = 'primary-button';
    viewFullResultsBtn.textContent = '查看详细结果';
    viewFullResultsBtn.addEventListener('click', () => {
        resultsContent.innerHTML = `<pre>${JSON.stringify(results, null, 2)}</pre>`;
    });
    
    const exportMatrixBtn = document.createElement('button');
    exportMatrixBtn.id = 'export-matrix';
    exportMatrixBtn.className = 'primary-button';
    exportMatrixBtn.textContent = '导出矩阵';
    exportMatrixBtn.addEventListener('click', () => {
        const matrixText = JSON.stringify(intrinsic, null, 2);
        const blob = new Blob([matrixText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'calibration_matrix.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'matrix-controls';
    buttonContainer.appendChild(viewFullResultsBtn);
    buttonContainer.appendChild(exportMatrixBtn);
    resultsContent.appendChild(buttonContainer);
    
    calibrationStatus.textContent = `标定完成 (精度: ${avgError.toFixed(5)}mm)`;
    calibrationStatus.className = 'status-text active';
}

// 停止标定
async function stopCalibration() {
    if (!calibrationState.isCalibrating) return;
    
    try {
        // 调用后端API停止标定
        const response = await fetch('/stop_calibration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            calibrationState.isCalibrating = false;
            updateCalibrationUI(false);
            calibrationStatus.textContent = '已停止标定';
            calibrationStatus.className = 'status-text warning';
        } else {
            console.error('停止标定失败:', result.message);
            calibrationStatus.textContent = `停止错误: ${result.message}`;
            calibrationStatus.className = 'status-text error';
        }
    } catch (error) {
        console.error('停止标定失败:', error);
        calibrationStatus.textContent = '停止过程出错';
        calibrationStatus.className = 'status-text error';
    }
}

// 更新标定进度
function updateProgress() {
    const progress = (calibrationState.completedPoints / calibrationState.totalPoints * 100).toFixed(1);
    const progressBar = document.getElementById('calibration-progress');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `${progress}%`;
    }
}

// 更新标定UI状态
function updateCalibrationUI(isCalibrating) {
    detectMarkBtn.disabled = isCalibrating;
    centerMarkBtn.disabled = isCalibrating;
    startCalibBtn.disabled = isCalibrating;
    stopCalibBtn.disabled = !isCalibrating;
    matrixSize.disabled = isCalibrating;
    pointOffset.disabled = isCalibrating;
    markSize.disabled = isCalibrating;
    
    if (isCalibrating) {
        calibrationStatus.textContent = '标定中...';
        calibrationStatus.className = 'status-text active';
    }
}

// 为标定功能添加生成模拟图像的函数
function generateCalibrationImage(markX, markY, markSize) {
    const canvas = document.createElement('canvas');
    // 减小图像大小，不铺满整个界面
    canvas.width = 640;  // 原来是1920
    canvas.height = 480; // 原来是1080
    const ctx = canvas.getContext('2d');
    
    // 图像中心点
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // 绘制白色背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制红色十字线标记中心点
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    
    // 水平中心线
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
    
    // 垂直中心线
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();
    
    // 添加水平与垂直网格线
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 0.5;
    
    // 水平网格线
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // 垂直网格线
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // 绘制黑色Mark点
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(markX, markY, markSize, 0, Math.PI * 2);
    ctx.fill();
    
    // 添加十字线辅助
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    
    // 水平线
    ctx.beginPath();
    ctx.moveTo(0, markY);
    ctx.lineTo(canvas.width, markY);
    ctx.stroke();
    
    // 垂直线
    ctx.beginPath();
    ctx.moveTo(markX, 0);
    ctx.lineTo(markX, canvas.height);
    ctx.stroke();
    
    return canvas.toDataURL('image/png');
}

// 创建标定矩阵点位显示
function createMatrixDisplay(size) {
    const matrixDisplay = document.getElementById('calibration-matrix-display');
    const matrixGrid = document.getElementById('matrix-grid');
    
    // 清空现有内容
    matrixGrid.innerHTML = '';
    
    // 设置网格大小
    matrixGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    matrixGrid.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    
    // 创建单元格
    calibrationState.matrixCells = [];
    for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        cell.dataset.index = i;
        matrixGrid.appendChild(cell);
        calibrationState.matrixCells.push(cell);
    }
    
    // 显示矩阵
    matrixDisplay.style.display = 'block';
}

// 更新矩阵显示
function updateMatrixDisplay(currentIndex) {
    calibrationState.matrixCells.forEach((cell, index) => {
        // 移除当前点位标记
        cell.classList.remove('current');
        
        // 标记已访问的点位
        if (index < calibrationState.completedPoints) {
            cell.classList.add('visited');
        }
        
        // 标记失败的点位
        if (calibrationState.failedPoints.includes(index)) {
            cell.classList.add('failed');
        }
    });
    
    // 标记当前点位
    if (currentIndex >= 0 && currentIndex < calibrationState.matrixCells.length) {
        calibrationState.matrixCells[currentIndex].classList.add('current');
    }
}

// 当量校准功能
async function calibrateRatio() {
    if (!cameraState.isConnected) {
        alert('请先连接相机');
        return;
    }
    
    try {
        console.log('当量校准: 当前状态', cameraState);
        
        // 1. 获取校准图像
        console.log('当量校准: 发送获取校准图像请求...');
        const response1 = await fetch('/generate_calibration_image?square_size=50');
        const result1 = await response1.json();
        console.log('当量校准: 校准图像响应', result1);
        
        if (result1.success) {
            // 显示校准图案
            console.log('当量校准: 更新状态和显示');
            cameraState.isShowingCalibration = true;
            
            if (simulatedImage) {
                simulatedImage.style.display = 'none';
            }
            if (calibrationPattern) {
                calibrationPattern.style.display = 'block';
                calibrationPattern.innerHTML = `<img src="${result1.image}" alt="校准图案" style="width:100%;height:100%;">`;
            }
            
            // 2. 计算当量
            console.log('当量校准: 发送计算当量请求...');
            const squareSizeMm = parseFloat(calibSquareSize.value || 1.0);
            const response2 = await fetch('/calculate_ratio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ squareSizeMm })
            });
            const result2 = await response2.json();
            console.log('当量校准: 当量计算响应', result2);
            
            if (result2.success) {
                const ratio = result2.ratio.toFixed(2);
                if (calibResultValue) {
                    calibResultValue.textContent = `${ratio} ${result2.unit}`;
                }
                
                // 自动切换回相机视图
                setTimeout(async () => {
                    if (simulatedImage) {
                        simulatedImage.style.display = 'block';
                    }
                    if (calibrationPattern) {
                        calibrationPattern.style.display = 'none';
                        calibrationPattern.innerHTML = '';
                    }
                    cameraState.isShowingCalibration = false;
                }, 2000);
            } else {
                console.error('当量计算失败:', result2.message);
                alert('当量计算失败: ' + (result2.message || '未知错误'));
            }
        } else {
            console.error('获取校准图像失败:', result1.message);
            alert('获取校准图像失败: ' + (result1.message || '未知错误'));
        }
    } catch (error) {
        console.error('当量校准失败:', error);
        alert('当量校准过程发生错误，请查看控制台日志');
    }
}

// 生成标定矩阵点位
function generateCalibrationMatrix(size, offset) {
    const matrix = [];
    const center = Math.floor(size / 2);
    
    // 确保网格是按照顺序生成的，以便于在点阵显示中正确显示
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const xPos = (x - center) * offset;
            const yPos = (y - center) * offset;
            const pointIndex = y * size + x;
            
            matrix.push({ 
                x: xPos, 
                y: yPos,
                index: pointIndex,
                row: y,
                col: x
            });
        }
    }
    
    console.log(`生成了${size}×${size}的标定矩阵，共${matrix.length}个点`);
    return matrix;
}

// 事件监听器
document.addEventListener('DOMContentLoaded', () => {
    // 初始化所有DOM引用
    initializeDOMReferences();
    
    // 更新连接按钮初始状态
    updateConnectButton();
    
    // 启动状态轮询
    startStatusPolling();
    
    // 连接按钮点击事件
    if (connectBtn) {
        connectBtn.addEventListener('click', toggleConnection);
    }

    // 自动对焦按钮点击事件
    if (startFocusBtn) {
        startFocusBtn.addEventListener('click', startAutoFocus);
    }
    if (stopFocusBtn) {
        stopFocusBtn.addEventListener('click', stopAutoFocus);
    }
    
    // 添加当量校准按钮事件监听
    const debugCalibBtn = document.getElementById('debug-calib-btn');
    if (debugCalibBtn) {
        debugCalibBtn.addEventListener('click', calibrateRatio);
    }
    
    // 添加标定按钮事件监听
    if (detectMarkBtn) {
        detectMarkBtn.addEventListener('click', detectMarkPoint);
    }
    if (centerMarkBtn) {
        centerMarkBtn.addEventListener('click', centerMarkPoint);
    }
    if (startCalibBtn) {
        startCalibBtn.addEventListener('click', startCalibration);
    }
    if (stopCalibBtn) {
        stopCalibBtn.addEventListener('click', stopCalibration);
    }

    // 点动按钮点击事件
    jogBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const axis = btn.dataset.axis;
            const direction = btn.classList.contains('plus') ? 1 : -1;
            jogAxis(axis, direction);
        });
    });

    // 配置按钮点击事件
    document.querySelectorAll('.config-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // 阻止默认行为
            const axis = e.currentTarget.dataset.axis;
            if (axis && cameraState.isConnected) {
                showAxisConfigModal(axis);
            }
        });
    });
    
    // 关闭按钮点击事件
    const closeBtn = document.querySelector('.close-button');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideAxisConfigModal);
    }
    
    // 取消按钮点击事件
    const cancelBtn = document.getElementById('cancel-axis-config');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideAxisConfigModal);
    }
    
    // 保存按钮点击事件
    const saveBtn = document.getElementById('save-axis-config');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAxisConfig);
    }
    
    // 点击弹窗外部关闭
    const modal = document.getElementById('axis-config-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideAxisConfigModal();
            }
        });
    }
    
    // 轴选择改变事件
    const axisSelect = document.getElementById('axis-select');
    if (axisSelect) {
        axisSelect.addEventListener('change', (e) => {
            const axisId = e.target.value;
            if (!axisId) return;
            
            // 获取轴名称
            const axisName = getAxisNameById(axisId);
            if (!axisName) return;
            
            if (axisConfigs[axisName] && cameraState.axisLimits && cameraState.axisLimits[axisName]) {
                const config = axisConfigs[axisName];
                const limits = cameraState.axisLimits[axisName];
                
                document.getElementById('axis-ratio').value = config.ratio;
                document.getElementById('axis-backlash').value = config.backlash;
                document.getElementById('axis-speed').value = config.speed;
                document.getElementById('axis-acc').value = config.acc;
                document.getElementById('soft-limit-min').value = limits.min;
                document.getElementById('soft-limit-max').value = limits.max;
                document.getElementById('encoder-value').value = cameraState[`${axisName}Position`] || 0;
            }
        });
    }

    // 加载PLC轴数据
    loadPlcAxes();

    // 自动连接
    setTimeout(autoConnect, 500); // 延迟500ms后自动连接
});