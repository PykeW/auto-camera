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
        start: 5.0,
        end: 15.0,
        step: 0.5,
        rangeUp: 5.0,
        rangeDown: 5.0,
        steps: 10,
        exposure: 5000,
        gain: 1.0,
        times: 1
    },
    // 新增PLC轴数据和映射
    plcAxes: [],
    axisMapping: {
        "1": "X",
        "2": "Y", 
        "3": "Z",
        "4": "U"
    },
    // 添加单位显示设置
    displayUnit: 'mm' // 默认单位为mm
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
let focusParamsModal, focusStart, focusEnd, focusStep;
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

    // 对焦控制
    focusRange = document.getElementById('focus-range');
    focusStep = document.getElementById('focus-step');

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
    
    // Z轴配置相关控件
    focusAxisSelect = document.getElementById('focus-axis-select');
    focusAxisPosition = document.getElementById('focus-axis-position');
    focusJogMinus = document.getElementById('focus-jog-minus');
    focusJogPlus = document.getElementById('focus-jog-plus');
    focusStepSelect = document.getElementById('focus-step-select'); // 新增步进选择引用
    
    // ROI相关按钮
    const confirmRoiBtn = document.getElementById('confirm-roi-focus-btn');
    const editRoiBtn = document.getElementById('edit-roi-focus-btn');
    const clearRoiBtn = document.getElementById('clear-roi-focus-btn');
    const toggleRoiVisibilityBtn = document.getElementById('toggle-focus-roi-visibility-btn');

    // 校准和当量计算相关控件
    toggleViewBtn = document.getElementById('toggle-view-btn');
    calibrateBtn = document.getElementById('debug-calib-btn');
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
    if (editRoiBtn) {
        editRoiBtn.addEventListener('click', editRoi);
    }
    if (clearRoiBtn) {
        clearRoiBtn.addEventListener('click', clearRoi);
    }
    if (toggleRoiVisibilityBtn) {
        toggleRoiVisibilityBtn.addEventListener('click', toggleRoiVisibility);
    }

    // 校准相关的事件监听器
    if (toggleViewBtn) {
        toggleViewBtn.addEventListener('click', toggleCalibrationView);
    }
    if (calibrateBtn) {
        calibrateBtn.addEventListener('click', calculateRatio);
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
    
    // 初始化Z轴控制相关事件监听
    initFocusAxisControls();
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
            input.value = position !== null ? position.toFixed(2) : '';
            
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
    if (currentZInput) {
        // 显示Z轴位置的编码器值
        currentZInput.value = state.currentZEncoder ? state.currentZEncoder : (state.currentZ ? Math.round(state.currentZ * 1000) : '--');
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
    
    // 使用toggleFocusButtons更新按钮显示
    toggleFocusButtons(state.isFocusing);
    
    if (drawRoiFocusBtn) {
        drawRoiFocusBtn.disabled = !state.isConnected || state.isFocusing;
    }
    
    // 更新ROI按钮组状态
    if (focusRoiButtonGroup) {
        const roiButtons = focusRoiButtonGroup.getElementsByTagName('button');
        for (const btn of roiButtons) {
            btn.disabled = !state.isConnected || state.isFocusing;
        }
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
    }
    if (calibrateBtn) {
        calibrateBtn.disabled = !state.isConnected || state.isFocusing || !state.isShowingCalibration;
    }
    if (calibSquareSize) {
        calibSquareSize.disabled = !state.isConnected;
    }
    
    // 如果自动对焦完成并且有对焦图像，显示缩略图区域
    if (state.focusCompleted && Array.isArray(state.focusImages) && state.focusImages.length > 0) {
        loadFocusImages();
    }
    
    // 更新图像左上角的对焦位置和清晰度信息
    const focusPositionDisplay = document.getElementById('focus-position-display');
    const focusClarityDisplay = document.getElementById('focus-clarity-display');
    
    if (focusPositionDisplay) {
        // 根据当前单位设置显示内容
        if (cameraState.isConnected) {
            // 获取当前选中的轴
            const selectedAxisId = document.getElementById('focus-axis-select') ? 
                                  document.getElementById('focus-axis-select').value : '3'; // 默认为Z轴
            const axisName = getAxisNameById(selectedAxisId);
            
            if (axisName) {
                // 根据当前单位设置显示内容
                if (cameraState.displayUnit === 'mm') {
                    // 毫米显示
                    const position = cameraState[`${axisName}Position`] || 0;
                    focusPositionDisplay.textContent = `${position.toFixed(5)} mm`;
                } else {
                    // 微米显示
                    const positionEncoder = cameraState[`${axisName}PositionEncoder`] || 0;
                    focusPositionDisplay.textContent = `${positionEncoder} um`;
                }
            } else {
                focusPositionDisplay.textContent = "--";
            }
        } else {
            focusPositionDisplay.textContent = "--";
        }
    }
    
    if (focusClarityDisplay) {
        focusClarityDisplay.textContent = state.clarity ? state.clarity.toFixed(3) : '--';
    }
    
    // 更新Z轴控制界面
    if (window.updateFocusAxisControls) {
        window.updateFocusAxisControls();
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
        // 使用搜索范围计算起点和终点 - 现在使用编码器值
        const currentZ = Math.round(cameraState.currentZEncoder || cameraState.ZPositionEncoder || cameraState.currentZ * 1000 || cameraState.ZPosition * 1000);
        const range = parseInt(document.getElementById('focus-range').value);
        const step = parseInt(document.getElementById('focus-step').value);
        
        // 计算起点和终点（编码器值）
        const start = Math.max(0, currentZ - range);
        const end = currentZ + range;
        
        // 验证参数
        if (range <= 0) {
            alert('搜索范围必须大于0');
            return;
        }
        
        if (step <= 0) {
            alert('对焦步进必须大于0');
            return;
        }
        
        // 计算总步数
        const steps = Math.ceil((end - start) / step);
        
        const params = {
            start: start,
            end: end,
            step: step,
            steps: steps,
            exposure: cameraState.focusParams.exposure || 5000,
            gain: cameraState.focusParams.gain || 1.0,
            times: 1,
            isEncoder: true // 添加标识，表明使用的是编码器值
        };
        
        // 更新状态
        cameraState.focusParams = params;
        
        // 隐藏缩略图区域（如果之前显示）
        const thumbnailsContainer = document.getElementById('focus-thumbnails-container');
        if (thumbnailsContainer) {
            thumbnailsContainer.style.display = 'none';
        }
        
        const response = await fetch('/start_focus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        const state = await response.json();
        updateStatus(state);
        
        // 切换按钮显示状态
        toggleFocusButtons(true);
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
        
        // 切换按钮显示状态
        toggleFocusButtons(false);
        
        // 对焦结束后，获取对焦图像
        if (state.focusCompleted && Array.isArray(state.focusImages) && state.focusImages.length > 0) {
            loadFocusImages();
        }
    } catch (error) {
        console.error('停止自动对焦失败:', error);
    }
}

// 切换对焦按钮显示状态
function toggleFocusButtons(isFocusing) {
    const startFocusBtn = document.getElementById('start-focus-btn');
    const stopFocusBtn = document.getElementById('stop-focus-btn');
    const saveFocusPositionBtn = document.getElementById('save-focus-position-btn');
    
    if (isFocusing) {
        // 对焦中状态: 隐藏开始按钮，显示停止按钮
        if (startFocusBtn) startFocusBtn.style.display = 'none';
        if (stopFocusBtn) stopFocusBtn.style.display = 'block';
        if (saveFocusPositionBtn) saveFocusPositionBtn.style.display = 'none';
    } else {
        // 非对焦状态: 显示开始按钮，隐藏停止按钮，显示保存位置按钮
        if (startFocusBtn) startFocusBtn.style.display = 'block';
        if (stopFocusBtn) stopFocusBtn.style.display = 'none';
        if (saveFocusPositionBtn) saveFocusPositionBtn.style.display = 'block';
        
        // 如果已经对焦完成，检查是否需要显示缩略图区域
        if (cameraState.focusCompleted && Array.isArray(cameraState.focusImages) && cameraState.focusImages.length > 0) {
            loadFocusImages();
        }
    }
}

// 保存当前对焦位置
async function saveFocusPosition() {
    try {
        // 获取当前选中的轴ID
        const selectedAxisId = document.getElementById('focus-axis-select') ? 
                               document.getElementById('focus-axis-select').value : '3'; // 默认Z轴
        
        const response = await fetch('/save_focus_position', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ axisId: selectedAxisId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 显示保存成功信息
            alert(`保存成功: ${result.message}`);
            
            // 检查是否有缩略图区域，且已完成对焦
            if (cameraState.focusCompleted && Array.isArray(cameraState.focusImages) && cameraState.focusImages.length > 0) {
                // 显示缩略图区域，让用户查看并选择不同位置
                loadFocusImages();
            }
        } else {
            // 显示错误信息
            alert(`保存失败: ${result.message}`);
        }
    } catch (error) {
        console.error('保存对焦位置失败:', error);
        alert('保存对焦位置失败，请查看控制台了解详情');
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
        
        // 填充对焦轴选择下拉框
        populateFocusAxisSelect();
        
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

// 填充对焦轴选择下拉框
function populateFocusAxisSelect() {
    const select = document.getElementById('focus-axis-select');
    if (!select) return;

    // 保存当前选中的值
    const currentValue = select.value;

    // 清空当前选项
    select.innerHTML = '';

    // 用PLC轴列表填充
    cameraState.plcAxes.forEach(axis => {
        const option = document.createElement('option');
        option.value = axis.id;
        option.textContent = axis.name;
        select.appendChild(option);
    });

    // 恢复选中值，如果之前有的话
    if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
        select.value = currentValue;
    } else if (cameraState.plcAxes.length > 0) {
        select.value = cameraState.plcAxes[0].id;
    }
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
    focusStart.value = cameraState.focusParams.start || 5.0;
    focusEnd.value = cameraState.focusParams.end || 15.0;
    focusStep.value = cameraState.focusParams.step || 0.5;
    
    focusParamsModal.classList.add('show');
}

// 隐藏自动对焦参数设置弹窗
function hideFocusParamsModal() {
    focusParamsModal.classList.remove('show');
}

// 保存自动对焦参数
async function saveFocusParams() {
    // 获取并验证参数
    const start = parseFloat(focusStart.value);
    const end = parseFloat(focusEnd.value);
    const step = parseFloat(focusStep.value);
    
    // 确保终点大于起点
    if (end <= start) {
        alert('终点必须大于起点');
        return;
    }
    
    // 确保步进大于0
    if (step <= 0) {
        alert('步进必须大于0');
        return;
    }
    
    // 计算轴范围和总步数
    const range = end - start; 
    const steps = Math.ceil(range / step);
    
    const params = {
        start: start,
        end: end,
        step: step,
        rangeUp: range / 2,    // 向上寻找范围设为范围的一半
        rangeDown: range / 2,  // 向下寻找范围设为范围的一半
        steps: steps,          // 计算总步数
        exposure: cameraState.focusParams.exposure || 5000,
        gain: cameraState.focusParams.gain || 1.0,
        times: 1               // 默认仅执行一轮 
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
    
    // 切换ROI绘制状态
    cameraState.isDrawingROI = !cameraState.isDrawingROI;
    console.log('切换ROI绘制模式:', cameraState.isDrawingROI ? '开启' : '关闭');
    
    // 如果当前是绘制ROI状态
    if (cameraState.isDrawingROI) {
        enableRoiDrawing();
        drawRoiFocusBtn.classList.add('active');
        
        // 显示ROI工具面板
        const roiToolsPanel = document.getElementById('roi-tools-panel');
        if (roiToolsPanel) {
            roiToolsPanel.style.display = 'flex';
            // 确保工具面板位置在相机视图的右上角
            roiToolsPanel.style.top = '10px';
            roiToolsPanel.style.right = '10px';
        }
    } else {
        disableRoiDrawing();
        drawRoiFocusBtn.classList.remove('active');
        
        // 隐藏ROI工具面板
        const roiToolsPanel = document.getElementById('roi-tools-panel');
        if (roiToolsPanel) {
            roiToolsPanel.style.display = 'none';
        }
    }
}

// ROI绘制变量
let isDrawing = false;
let startX = 0;
let startY = 0;
let currentRoiRect = null;
let roiInfoDisplay = null;
let activeShapeTool = 'rect'; // 默认使用矩形工具
let activeDrawMode = 'draw'; // 默认绘制模式

// 多边形绘制点
let polygonPoints = [];

function enableRoiDrawing() {
    const overlay = document.getElementById('focus-roi-overlay');
    if (!overlay) return;
    
    // 先清除现有事件，避免重复绑定
    disableRoiDrawing();
    
    // 清除之前的内容
    overlay.innerHTML = '';
    overlay.style.display = 'block';
    overlay.classList.add('drawing');
    
    // 添加ROI信息显示元素
    roiInfoDisplay = document.createElement('div');
    roiInfoDisplay.className = 'roi-info';
    roiInfoDisplay.style.display = 'none';
    document.getElementById('camera-display-container').appendChild(roiInfoDisplay);
    
    // 添加事件监听器
    overlay.addEventListener('mousedown', startRoiDraw);
    overlay.addEventListener('mousemove', updateRoiDraw);
    overlay.addEventListener('mouseup', endRoiDraw);
    overlay.addEventListener('mouseleave', endRoiDraw);
    
    // 重置状态变量
    currentRoiRect = null;
    isDrawing = false;
    polygonPoints = [];
}

function disableRoiDrawing() {
    const overlay = document.getElementById('focus-roi-overlay');
    if (!overlay) return;
    
    // 移除事件监听器
    overlay.removeEventListener('mousedown', startRoiDraw);
    overlay.removeEventListener('mousemove', updateRoiDraw);
    overlay.removeEventListener('mouseup', endRoiDraw);
    overlay.removeEventListener('mouseleave', endRoiDraw);
    
    overlay.classList.remove('drawing');
    
    // 隐藏ROI信息显示
    if (roiInfoDisplay) {
        roiInfoDisplay.style.display = 'none';
    }
    
    // 重置绘制状态
    isDrawing = false;
}

function startRoiDraw(event) {
    if (isDrawing) return; // 防止重复触发
    
    const overlay = document.getElementById('focus-roi-overlay');
    if (!overlay) return;
    
    const rect = overlay.getBoundingClientRect();
    startX = event.clientX - rect.left;
    startY = event.clientY - rect.top;
    
    // 根据当前工具执行不同的绘制逻辑
    if (activeShapeTool === 'rect') {
        // 矩形绘制
        isDrawing = true;
        
        // 创建ROI矩形元素
        if (!currentRoiRect) {
            currentRoiRect = document.createElement('div');
            currentRoiRect.className = 'roi-rect drawing';
            overlay.appendChild(currentRoiRect);
        }
        
        // 设置初始位置
        currentRoiRect.style.left = `${startX}px`;
        currentRoiRect.style.top = `${startY}px`;
        currentRoiRect.style.width = '0';
        currentRoiRect.style.height = '0';
        
        // 显示ROI信息
        updateRoiInfo(startX, startY, startX, startY);
        roiInfoDisplay.style.display = 'block';
    } 
    else if (activeShapeTool === 'polygon') {
        // 多边形绘制
        if (!currentRoiRect) {
            // 创建一个SVG元素作为多边形容器
            currentRoiRect = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            currentRoiRect.style.position = 'absolute';
            currentRoiRect.style.left = '0';
            currentRoiRect.style.top = '0';
            currentRoiRect.style.width = '100%';
            currentRoiRect.style.height = '100%';
            currentRoiRect.style.pointerEvents = 'none';
            overlay.appendChild(currentRoiRect);
            
            // 创建一个多边形元素
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('fill', 'rgba(255, 87, 34, 0.2)');
            polygon.setAttribute('stroke', '#FF5722');
            polygon.setAttribute('stroke-width', '2');
            polygon.setAttribute('stroke-dasharray', '5,5');
            polygon.id = 'roi-polygon';
            currentRoiRect.appendChild(polygon);
            
            // 重置点数组
            polygonPoints = [];
        }
        
        // 添加新点
        polygonPoints.push({ x: startX, y: startY });
        
        // 更新多边形
        updatePolygon();
        
        // 显示ROI信息
        if (polygonPoints.length > 1) {
            const minX = Math.min(...polygonPoints.map(p => p.x));
            const minY = Math.min(...polygonPoints.map(p => p.y));
            const maxX = Math.max(...polygonPoints.map(p => p.x));
            const maxY = Math.max(...polygonPoints.map(p => p.y));
            updateRoiInfo(minX, minY, maxX, maxY);
            roiInfoDisplay.style.display = 'block';
        }
    }
    else if (activeShapeTool === 'ellipse') {
        // 椭圆绘制
        isDrawing = true;
        
        if (!currentRoiRect) {
            // 创建一个SVG元素作为椭圆容器
            currentRoiRect = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            currentRoiRect.style.position = 'absolute';
            currentRoiRect.style.left = '0';
            currentRoiRect.style.top = '0';
            currentRoiRect.style.width = '100%';
            currentRoiRect.style.height = '100%';
            currentRoiRect.style.pointerEvents = 'none';
            overlay.appendChild(currentRoiRect);
            
            // 创建一个椭圆元素
            const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            ellipse.setAttribute('fill', 'rgba(255, 87, 34, 0.2)');
            ellipse.setAttribute('stroke', '#FF5722');
            ellipse.setAttribute('stroke-width', '2');
            ellipse.id = 'roi-ellipse';
            currentRoiRect.appendChild(ellipse);
        }
        
        // 初始化椭圆
        const ellipse = document.getElementById('roi-ellipse');
        ellipse.setAttribute('cx', startX);
        ellipse.setAttribute('cy', startY);
        ellipse.setAttribute('rx', 0);
        ellipse.setAttribute('ry', 0);
        
        // 显示ROI信息
        updateRoiInfo(startX, startY, startX, startY);
        roiInfoDisplay.style.display = 'block';
    }
}

function updateRoiDraw(event) {
    if (!currentRoiRect) return;
    
    const overlay = document.getElementById('focus-roi-overlay');
    if (!overlay) return;
    
    const rect = overlay.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    
    if (activeShapeTool === 'rect' && isDrawing) {
        // 矩形绘制更新
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        
        currentRoiRect.style.width = `${width}px`;
        currentRoiRect.style.height = `${height}px`;
        currentRoiRect.style.left = `${left}px`;
        currentRoiRect.style.top = `${top}px`;
        
        // 更新ROI坐标信息
        updateRoiInfo(left, top, left + width, top + height);
    }
    else if (activeShapeTool === 'polygon') {
        // 对于多边形，仅在鼠标移动时更新提示
        if (roiInfoDisplay) {
            roiInfoDisplay.style.left = `${currentX + 10}px`;
            roiInfoDisplay.style.top = `${currentY + 10}px`;
        }
    }
    else if (activeShapeTool === 'ellipse' && isDrawing) {
        // 椭圆绘制更新
        const rx = Math.abs(currentX - startX) / 2;
        const ry = Math.abs(currentY - startY) / 2;
        const cx = (startX + currentX) / 2;
        const cy = (startY + currentY) / 2;
        
        const ellipse = document.getElementById('roi-ellipse');
        if (ellipse) {
            ellipse.setAttribute('cx', cx);
            ellipse.setAttribute('cy', cy);
            ellipse.setAttribute('rx', rx);
            ellipse.setAttribute('ry', ry);
            
            // 更新ROI坐标信息
            const left = cx - rx;
            const top = cy - ry;
            const right = cx + rx;
            const bottom = cy + ry;
            updateRoiInfo(left, top, right, bottom);
        }
    }
}

function endRoiDraw(event) {
    if (activeShapeTool === 'rect' && isDrawing) {
        isDrawing = false;
        
        // 移除绘制中的样式
        if (currentRoiRect) {
            currentRoiRect.classList.remove('drawing');
            
            // 获取最终的ROI坐标
            const left = parseInt(currentRoiRect.style.left);
            const top = parseInt(currentRoiRect.style.top);
            const width = parseInt(currentRoiRect.style.width);
            const height = parseInt(currentRoiRect.style.height);
            
            // 保存ROI坐标到状态
            cameraState.roiCoords = {
                l: left,
                t: top,
                r: left + width,
                b: top + height
            };
            
            console.log('保存矩形ROI坐标:', cameraState.roiCoords);
        }
    }
    else if (activeShapeTool === 'ellipse' && isDrawing) {
        isDrawing = false;
        
        const ellipse = document.getElementById('roi-ellipse');
        if (ellipse) {
            const cx = parseFloat(ellipse.getAttribute('cx'));
            const cy = parseFloat(ellipse.getAttribute('cy'));
            const rx = parseFloat(ellipse.getAttribute('rx'));
            const ry = parseFloat(ellipse.getAttribute('ry'));
            
            // 保存椭圆ROI坐标到状态（保存为矩形包围盒）
            cameraState.roiCoords = {
                l: cx - rx,
                t: cy - ry,
                r: cx + rx,
                b: cy + ry,
                type: 'ellipse',
                center: { x: cx, y: cy },
                radius: { x: rx, y: ry }
            };
            
            console.log('保存椭圆ROI坐标:', cameraState.roiCoords);
        }
    }
    // 多边形在点击时不需结束绘制
}

// 更新多边形绘制
function updatePolygon() {
    const polygon = document.getElementById('roi-polygon');
    if (!polygon) return;
    
    // 构建点集合字符串
    const pointsStr = polygonPoints.map(p => `${p.x},${p.y}`).join(' ');
    polygon.setAttribute('points', pointsStr);
    
    // 如果有三个或更多点，则可以完成多边形
    if (polygonPoints.length >= 3) {
        // 计算多边形的边界框
        const minX = Math.min(...polygonPoints.map(p => p.x));
        const minY = Math.min(...polygonPoints.map(p => p.y));
        const maxX = Math.max(...polygonPoints.map(p => p.x));
        const maxY = Math.max(...polygonPoints.map(p => p.y));
        
        // 保存多边形ROI坐标到状态
        cameraState.roiCoords = {
            l: minX,
            t: minY,
            r: maxX,
            b: maxY,
            type: 'polygon',
            points: [...polygonPoints] // 保存所有点
        };
        
        console.log('多边形点数:', polygonPoints.length);
    }
}

// 完成多边形绘制 (双击时调用)
function finishPolygon() {
    if (activeShapeTool === 'polygon' && polygonPoints.length >= 3) {
        const polygon = document.getElementById('roi-polygon');
        if (polygon) {
            // 移除虚线样式，改为实线
            polygon.setAttribute('stroke-dasharray', '');
            
            console.log('完成多边形ROI绘制:', cameraState.roiCoords);
        }
    }
}

// 添加双击事件监听器完成多边形
function setupPolygonEvents() {
    const overlay = document.getElementById('focus-roi-overlay');
    if (overlay) {
        overlay.addEventListener('dblclick', (e) => {
            if (activeShapeTool === 'polygon' && polygonPoints.length >= 3) {
                finishPolygon();
                e.stopPropagation(); // 防止事件冒泡
            }
        });
    }
}

function updateRoiInfo(left, top, right, bottom) {
    if (!roiInfoDisplay) return;
    
    const width = right - left;
    const height = bottom - top;
    
    roiInfoDisplay.textContent = `L:${Math.round(left)} T:${Math.round(top)} W:${Math.round(width)} H:${Math.round(height)}`;
}

function confirmRoi() {
    if (!cameraState.isDrawingROI || !currentRoiRect) return;
    
    // 确认当前ROI
    cameraState.roiEnabled = true;
    
    // 保持绘制模式开启，但更新UI状态
    disableRoiDrawing();
    
    // 显示确认后的ROI
    document.getElementById('focus-roi-overlay').style.display = 'block';
    
    // 更新按钮状态
    document.getElementById('toggle-visibility-roi-btn').innerHTML = '<i class="fas fa-eye"></i> 显示';
    
    // 发送ROI数据到后端
    updateRoiOnServer();
    
    // 显示确认消息
    console.log('ROI已确认');
}

function redrawRoi() {
    if (!cameraState.isDrawingROI) return;
    
    // 清除当前ROI
    const overlay = document.getElementById('focus-roi-overlay');
    if (currentRoiRect && overlay.contains(currentRoiRect)) {
        overlay.removeChild(currentRoiRect);
    }
    currentRoiRect = null;
    
    // 重置绘制状态
    isDrawing = false;
}

function clearRoi() {
    cameraState.roiEnabled = false;
    
    // 清除ROI显示
    const overlay = document.getElementById('focus-roi-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
    }
    
    // 移除ROI信息显示
    if (roiInfoDisplay) {
        roiInfoDisplay.style.display = 'none';
    }
    
    // 重置绘制状态和变量
    isDrawing = false;
    currentRoiRect = null;
    
    // 更新按钮状态
    document.getElementById('toggle-visibility-roi-btn').innerHTML = '<i class="fas fa-eye"></i> 显示';
    
    // 通知后端清除ROI
    fetch('/clear_roi', { method: 'POST' })
        .then(response => response.json())
        .catch(error => console.error('清除ROI失败:', error));
        
    console.log('ROI已删除');
}

// 切换ROI可见性
function toggleRoiVisibility() {
    if (!cameraState.roiCoords) return;
    
    const overlay = document.getElementById('focus-roi-overlay');
    if (overlay) {
        const isVisible = overlay.style.display !== 'none';
        overlay.style.display = isVisible ? 'none' : 'block';
        
        // 更新按钮图标
        const toggleBtn = document.getElementById('toggle-focus-roi-visibility-btn');
        if (toggleBtn) {
            toggleBtn.querySelector('i').className = isVisible ? 
                'fas fa-eye-slash' : 'fas fa-eye';
            toggleBtn.title = isVisible ? '隐藏' : '显示';
        }
    }
}

// 向后端发送ROI坐标
function updateRoiOnServer() {
    if (!cameraState.roiCoords) return;
    
    const coords = cameraState.roiCoords;
    
    fetch('/update_roi', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(coords)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('ROI已更新');
        } else {
            console.error('ROI更新失败:', data.message);
        }
    })
    .catch(error => console.error('ROI更新请求失败:', error));
}

// 更新获取ROI坐标的函数
function getRoiCoordinates() {
    return cameraState.roiCoords || { l: 0, t: 0, r: 0, b: 0 };
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
            console.log("前端: 轮询标定状态...");
            const response = await fetch('/calibration_status');
            const status = await response.json();
            
            console.log("前端: 收到标定状态:", status);
            
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
                console.log("前端: 标定已完成，显示结果");
                // 显示标定结果
                showCalibrationResults(status.calibrationResults);
                break;
            }
            
            // 如果标定已经停止但没有结果
            if (!status.isCalibrating) {
                console.log("前端: 标定已停止，无结果");
                calibrationStatus.textContent = '标定已停止';
                calibrationStatus.className = 'status-text warning';
                updateCalibrationUI(false);
                break;
            }
            
            // 等待下一次检查
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        } catch (error) {
            console.error('前端: 获取标定状态失败:', error);
            // 发生错误时，尝试再次轮询，但增加等待时间
            await new Promise(resolve => setTimeout(resolve, checkInterval * 2));
            
            // 如果连续多次失败，可以考虑中断轮询
            // 这里简化处理，继续尝试
        }
    }
    
    console.log("前端: 轮询结束，更新UI");
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

// 初始化Z轴控制相关功能
function initFocusAxisControls() {
    // 获取DOM引用
    focusAxisSelect = document.getElementById('focus-axis-select');
    focusAxisPosition = document.getElementById('focus-axis-position');
    focusJogMinus = document.getElementById('focus-jog-minus');
    focusJogPlus = document.getElementById('focus-jog-plus');
    focusStepSelect = document.getElementById('focus-step-select');
    const unitDisplay = document.getElementById('unit-display');
    
    // 检查元素是否存在
    if (!focusAxisSelect || !focusAxisPosition || !focusJogMinus || !focusJogPlus || !focusStepSelect || !unitDisplay) {
        console.error('缺少必要的DOM元素。');
        return;
    }

    let isJogging = false;
    let jogInterval = null;
    let selectedAxis = 'Z';  // 默认Z轴
    let selectedAxisId = '3'; // 默认Z轴ID
    
    // 初始化单位设置 - 确保默认单位一致
    // 检查当前状态中是否已有设置
    if (!cameraState.displayUnit) {
        cameraState.displayUnit = 'mm'; // 默认使用毫米作为单位
    }
    unitDisplay.textContent = cameraState.displayUnit;
    
    // 填充轴选择下拉列表（调用公共函数）
    populateFocusAxisSelect();
    
    // 更新当前位置显示
    function updatePositionDisplay() {
        if (!cameraState.isConnected) {
            focusAxisPosition.value = '--';
            return;
        }
        // 通过id查找轴名称
        const axisName = getAxisNameById(selectedAxisId || selectedAxis);
        if (!axisName) {
            focusAxisPosition.value = '--';
            return;
        }
        
        // 根据当前显示单位转换值
        if (cameraState.displayUnit === 'mm') {
            // 使用毫米显示，保留3位小数
            const position = cameraState[`${axisName}Position`] || 0;
            focusAxisPosition.value = position.toFixed(3);
        } else {
            // 使用微米显示，整数
            const positionEncoder = cameraState[`${axisName}PositionEncoder`] || 
                                   (cameraState[`${axisName}Position`] * 1000) || 0;
            focusAxisPosition.value = Math.round(positionEncoder);
        }
    }
    
    // 单位切换功能
    unitDisplay.addEventListener('click', () => {
        // 切换单位
        cameraState.displayUnit = cameraState.displayUnit === 'mm' ? 'um' : 'mm';
        
        // 更新显示
        unitDisplay.textContent = cameraState.displayUnit;
        
        // 添加视觉效果
        unitDisplay.classList.add('active');
        setTimeout(() => {
            unitDisplay.classList.remove('active');
        }, 300);
        
        // 更新位置显示和步进值下拉框
        updatePositionDisplay();
        updateStepSelectOptions();
        
        console.log(`单位切换为: ${cameraState.displayUnit}`);
    });
    
    // 更新步进选择下拉框的选项
    function updateStepSelectOptions() {
        // 清空现有选项
        focusStepSelect.innerHTML = '';
        
        // 根据当前单位添加新选项
        if (cameraState.displayUnit === 'mm') {
            // mm模式下的步进值
            addOption(focusStepSelect, '0.001', '0.001');
            addOption(focusStepSelect, '0.01', '0.01');
            addOption(focusStepSelect, '0.1', '0.1', true);
            addOption(focusStepSelect, '0.5', '0.5');
            addOption(focusStepSelect, '1', '1');
        } else {
            // um模式下的步进值
            addOption(focusStepSelect, '1', '1');
            addOption(focusStepSelect, '10', '10');
            addOption(focusStepSelect, '100', '100', true);
            addOption(focusStepSelect, '500', '500');
            addOption(focusStepSelect, '1000', '1000');
        }
        
        // 更新按钮状态
        updateJogButtonState();
    }
    
    // 辅助函数，添加下拉选项
    function addOption(selectElement, value, text, selected = false) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        if (selected) option.selected = true;
        selectElement.appendChild(option);
    }
    
    // 更新点动按钮状态
    function updateJogButtonState() {
        if (!cameraState.isConnected) {
            focusJogMinus.disabled = true;
            focusJogPlus.disabled = true;
            return;
        }
        
        // 使用selectedAxis来获取位置和限制值
        const axisName = getAxisNameById(selectedAxisId || selectedAxis);
        if (!axisName) {
            focusJogMinus.disabled = true;
            focusJogPlus.disabled = true;
            return;
        }
        
        // 获取编码器位置和限制
        const positionEncoder = cameraState[`${axisName}PositionEncoder`];
        if (typeof positionEncoder !== 'number') {
            focusJogMinus.disabled = true;
            focusJogPlus.disabled = true;
            return;
        }
        
        // 从步进选择下拉列表获取步进值
        let step = parseFloat(focusStepSelect.value);
        
        // 如果当前单位是mm，需要将步进值转换为编码器值（微米）
        if (cameraState.displayUnit === 'mm') {
            step = step * 1000; // 转换为微米
        }
        
        const limits = cameraState.axisLimitsEncoder[axisName];
        
        // 检查是否会超出限制
        focusJogMinus.disabled = positionEncoder - step < limits.min;
        focusJogPlus.disabled = positionEncoder + step > limits.max;
    }
    
    // 执行点动操作
    async function performJog(direction) {
        if (!cameraState.isConnected) return;
        
        // 使用selectedAxisId而不是调用getAxisIdByName
        const axisId = selectedAxisId;
        if (!axisId) return;
        
        console.log(`执行点动: 轴=${axisId}, 方向=${direction}, 步进=${focusStepSelect.value}`);
        
        // 从步进选择下拉列表获取步进值
        let stepValue = parseFloat(focusStepSelect.value);
        
        // 如果当前单位是mm，需要将步进值转换为编码器值（微米）
        if (cameraState.displayUnit === 'mm') {
            stepValue = stepValue * 1000; // 转换为微米
        }
        
        const step = stepValue * direction;
        
        try {
            const response = await fetch('/jog_axis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    axis: axisId,
                    step: step,
                    isEncoder: true // 添加标识，表明使用的是编码器值
                })
            });
            const state = await response.json();
            updateStatus(state);
            updatePositionDisplay();
            updateJogButtonState();
        } catch (error) {
            console.error(`${selectedAxis}轴点动失败:`, error);
        }
    }
    
    // 点动按钮事件处理器
    // 移除现有的mousedown事件处理，改为click事件
    focusJogMinus.addEventListener('click', function() {
        if (focusJogMinus.disabled) return;
        performJog(-1);
    });
    
    focusJogPlus.addEventListener('click', function() {
        if (focusJogPlus.disabled) return;
        performJog(1);
    });
    
 
    // 步进下拉列表变化时更新按钮状态
    focusStepSelect.addEventListener('change', updateJogButtonState);
    
    // 处理轴选择变化
    focusAxisSelect.addEventListener('change', () => {
        selectedAxisId = focusAxisSelect.value;
        selectedAxis = getAxisNameById(selectedAxisId) || 'Z'; // 根据ID获取名称，默认Z
        console.log(`选择轴变更: ID=${selectedAxisId}, 名称=${selectedAxis}`);
        updatePositionDisplay();
        updateJogButtonState();
    });
    
    // 初始状态更新
    updateStepSelectOptions(); // 初始化步进选项
    updatePositionDisplay();
    updateJogButtonState();
    
    // 将更新函数添加到全局更新中
    window.updateFocusAxisControls = function() {
        updatePositionDisplay();
        updateJogButtonState();
    };
}

// 初始化事件监听器
function initializeEventListeners() {
    // ROI绘制相关事件
    document.getElementById('draw-roi-focus-btn').addEventListener('click', toggleRoiDrawing);
    document.getElementById('edit-roi-focus-btn').addEventListener('click', editRoi);
    document.getElementById('clear-roi-focus-btn').addEventListener('click', clearRoi);
    document.getElementById('toggle-focus-roi-visibility-btn').addEventListener('click', toggleRoiVisibility);
    
    // 初始化ROI工具相关事件
    initializeRoiTools();
    
    // ... existing code ...
}

// 在初始化DOM引用中添加工具面板的引用
function initializeRoiTools() {
    // 首先初始化选项卡切换
    document.getElementById('rect-roi-tool').addEventListener('click', () => switchRoiTool('rect'));
    document.getElementById('polygon-roi-tool').addEventListener('click', () => switchRoiTool('polygon'));
    document.getElementById('ellipse-roi-tool').addEventListener('click', () => switchRoiTool('ellipse'));
    
    // 改为使用新的单选按钮容器
    document.getElementById('draw-mode-container').addEventListener('click', () => switchDrawMode('draw'));
    document.getElementById('edit-mode-container').addEventListener('click', () => switchDrawMode('edit'));
    
    // 移除对已删除按钮的事件监听
    // document.getElementById('confirm-roi-tool-btn').addEventListener('click', confirmRoi);
    // document.getElementById('cancel-roi-tool-btn').addEventListener('click', cancelRoi);
    // document.getElementById('toggle-visibility-roi-btn').addEventListener('click', toggleRoiVisibility);
    // document.getElementById('delete-roi-btn').addEventListener('click', clearRoi);
    
    document.getElementById('close-roi-tools').addEventListener('click', closeRoiTools);
}

// 关闭ROI工具面板
function closeRoiTools() {
    cameraState.isDrawingROI = false;
    drawRoiFocusBtn.classList.remove('active');
    
    // 隐藏工具面板
    const roiToolsPanel = document.getElementById('roi-tools-panel');
    if (roiToolsPanel) {
        roiToolsPanel.style.display = 'none';
    }
    
    // 禁用ROI绘制模式
    disableRoiDrawing();
}

// 切换ROI形状工具
function switchRoiTool(tool) {
    activeShapeTool = tool;
    
    // 更新按钮状态
    document.getElementById('rect-roi-tool').classList.toggle('active', tool === 'rect');
    document.getElementById('polygon-roi-tool').classList.toggle('active', tool === 'polygon');
    document.getElementById('ellipse-roi-tool').classList.toggle('active', tool === 'ellipse');
    
    console.log(`已切换到${tool}工具`);
}

// 切换绘制/编辑模式
function switchDrawMode(mode) {
    activeDrawMode = mode;
    
    // 更新单选按钮状态
    document.getElementById('draw-mode-container').classList.toggle('active', mode === 'draw');
    document.getElementById('edit-mode-container').classList.toggle('active', mode === 'edit');
    
    console.log(`已切换到${mode === 'draw' ? '绘制' : '编辑'}模式`);
}

// 取消当前ROI绘制
function cancelRoi() {
    // 清除当前ROI但不退出绘制模式
    const overlay = document.getElementById('focus-roi-overlay');
    if (currentRoiRect && overlay.contains(currentRoiRect)) {
        overlay.removeChild(currentRoiRect);
    }
    currentRoiRect = null;
    
    // 重置绘制状态
    isDrawing = false;
    
    if (roiInfoDisplay) {
        roiInfoDisplay.style.display = 'none';
    }
}

// 更新编码值显示
function updateEncoderValues() {
    if(focusRange && focusRangeEncoder) {
        // 假设1mm = 1000编码器值，这个比例应该根据实际情况调整
        const rangeValue = parseFloat(focusRange.value);
        const encoderValue = Math.round(rangeValue * 1000);
        focusRangeEncoder.textContent = encoderValue;
    }
    
    if(focusStep && focusStepEncoder) {
        const stepValue = parseFloat(focusStep.value);
        const encoderValue = Math.round(stepValue * 1000);
        focusStepEncoder.textContent = encoderValue;
    }
}

// 事件监听器
document.addEventListener('DOMContentLoaded', () => {
    // 初始化所有DOM引用
    initializeDOMReferences();
    
    // 初始化隐藏ROI按钮组
    if (focusRoiButtonGroup) {
        focusRoiButtonGroup.style.display = 'none';
    }
    
    // 初始化ROI工具面板
    const roiToolsPanel = document.getElementById('roi-tools-panel');
    if (roiToolsPanel) {
        roiToolsPanel.classList.remove('show');
    }
    
    // 设置多边形绘制的双击事件
    setupPolygonEvents();
    
    // 更新连接按钮初始状态
    updateConnectButton();
    
    // 初始化对焦按钮状态
    toggleFocusButtons(false);
    
    // 启动状态轮询
    startStatusPolling();
    
    // 移除不再需要的编码值更新事件
    // if (focusRange) {
    //     focusRange.addEventListener('input', updateEncoderValues);
    // }
    // if (focusStep) {
    //     focusStep.addEventListener('input', updateEncoderValues);
    // }
    
    // 移除初始化更新编码值
    // updateEncoderValues();

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
    
    // 添加保存对焦位置按钮事件监听
    const saveFocusPositionBtn = document.getElementById('save-focus-position-btn');
    if (saveFocusPositionBtn) {
        saveFocusPositionBtn.addEventListener('click', saveFocusPosition);
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

// 编辑ROI函数
function editRoi() {
    if (!cameraState.isConnected || !cameraState.roiCoords) return;
    
    // 启用ROI绘制模式
    cameraState.isDrawingROI = true;
    drawRoiFocusBtn.classList.add('active');
    
    // 显示现有ROI并使其可编辑
    const overlay = document.getElementById('focus-roi-overlay');
    if (overlay) {
        overlay.style.display = 'block';
        overlay.classList.add('drawing');
        
        // 如果有现有的ROI，显示出来供编辑
        if (currentRoiRect) {
            currentRoiRect.classList.add('editing');
        } else {
            // 从状态中恢复ROI
            const coords = cameraState.roiCoords;
            if (coords) {
                currentRoiRect = document.createElement('div');
                currentRoiRect.className = 'roi-rect editing';
                currentRoiRect.style.left = `${coords.l}px`;
                currentRoiRect.style.top = `${coords.t}px`;
                currentRoiRect.style.width = `${coords.r - coords.l}px`;
                currentRoiRect.style.height = `${coords.b - coords.t}px`;
                overlay.appendChild(currentRoiRect);
            }
        }
    }
    
    // 显示ROI工具面板
    const roiToolsPanel = document.getElementById('roi-tools-panel');
    if (roiToolsPanel) {
        roiToolsPanel.style.display = 'flex';
    }
}

// 缩略图相关变量
let selectedThumbnailIndex = -1;
let bestFocusIndex = -1;

// 加载对焦图像缩略图
function loadFocusImages() {
    const thumbnailsContainer = document.querySelector('.focus-thumbnails-container');
    const thumbnailsWrapper = document.querySelector('.focus-thumbnails');
    thumbnailsWrapper.innerHTML = '';
    
    if (!Array.isArray(cameraState.focusImages) || cameraState.focusImages.length === 0) {
        return;
    }
    
    // 找到最佳清晰度的图像
    bestFocusIndex = cameraState.focusImages.reduce((maxIndex, curr, index, arr) => {
        return curr.clarity > arr[maxIndex].clarity ? index : maxIndex;
    }, 0);
    
    // 创建并添加缩略图
    cameraState.focusImages.forEach((image, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = `focus-thumbnail ${index === bestFocusIndex ? 'best' : ''}`;
        thumbnail.dataset.index = index;
        
        const img = document.createElement('img');
        img.src = image.imageData;
        img.alt = `Focus Position ${image.zPosition}`;
        thumbnail.appendChild(img);
        
        const info = document.createElement('div');
        info.className = 'focus-thumbnail-info';
        info.innerHTML = `
            <div>Z: ${image.zPosition.toFixed(3)} mm</div>
            <div>清晰度: ${image.clarity.toFixed(2)}</div>
        `;
        thumbnail.appendChild(info);
        
        // 点击事件：在主视图中显示图像
        thumbnail.addEventListener('click', () => {
            selectThumbnail(index);
            document.getElementById('camera-feed').src = image.imageData;
        });
        
        // 右键菜单
        thumbnail.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showThumbnailMenu(e, index);
        });
        
        thumbnailsWrapper.appendChild(thumbnail);
    });
    
    // 显示缩略图区域
    thumbnailsContainer.style.display = 'flex';
    setTimeout(() => thumbnailsContainer.classList.add('show'), 10);
    
    // 自动选中最佳清晰度的图像
    selectThumbnail(bestFocusIndex);
}

// 选中缩略图
function selectThumbnail(index) {
    const thumbnails = document.querySelectorAll('.focus-thumbnail');
    thumbnails.forEach(thumb => thumb.classList.remove('selected'));
    
    if (index >= 0 && index < thumbnails.length) {
        thumbnails[index].classList.add('selected');
        selectedThumbnailIndex = index;
    }
}

// 显示右键菜单
function showThumbnailMenu(event, index) {
    const menu = document.querySelector('.focus-thumbnail-menu');
    const overlay = document.querySelector('.context-menu-overlay');
    
    // 设置菜单位置
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    
    // 显示菜单和遮罩
    menu.style.display = 'block';
    overlay.style.display = 'block';
    
    // 更新选中的缩略图
    selectThumbnail(index);
    
    // 菜单项点击事件
    const menuItems = menu.querySelectorAll('.focus-thumbnail-menu-item');
    menuItems.forEach(item => {
        item.onclick = () => {
            const action = item.dataset.action;
            handleMenuAction(action, index);
            hideMenu();
        };
    });
}

// 处理右键菜单动作
async function handleMenuAction(action, index) {
    const image = cameraState.focusImages[index];
    if (!image) return;
    
    switch (action) {
        case 'set-focus':
            try {
                const response = await fetch('/set_focus_position', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ zPosition: image.zPosition })
                });
                
                const result = await response.json();
                if (result.success) {
                    showMessage('成功设置对焦位置', 'success');
                } else {
                    showMessage('设置对焦位置失败', 'error');
                }
            } catch (error) {
                console.error('设置对焦位置时出错:', error);
                showMessage('设置对焦位置时发生错误', 'error');
            }
            break;
            
        case 'view-large':
            document.getElementById('camera-feed').src = image.imageData;
            break;
    }
}

// 隐藏右键菜单
function hideMenu() {
    const menu = document.querySelector('.focus-thumbnail-menu');
    const overlay = document.querySelector('.context-menu-overlay');
    menu.style.display = 'none';
    overlay.style.display = 'none';
}

// 初始化事件监听
function initializeFocusThumbnails() {
    // 关闭按钮事件
    const closeBtn = document.querySelector('.thumbnails-close-btn');
    closeBtn.addEventListener('click', () => {
        const container = document.querySelector('.focus-thumbnails-container');
        container.classList.add('hide');
        setTimeout(() => {
            container.style.display = 'none';
            container.classList.remove('hide');
        }, 300);
    });
    
    // 点击遮罩层关闭菜单
    const overlay = document.querySelector('.context-menu-overlay');
    overlay.addEventListener('click', hideMenu);
    
    // 阻止右键菜单冒泡
    const menu = document.querySelector('.focus-thumbnail-menu');
    menu.addEventListener('contextmenu', e => e.preventDefault());
}

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeFocusThumbnails();
});

// 显示消息提示
function showMessage(message, type = 'info') {
    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = `message-toast ${type}`;
    messageEl.textContent = message;
    
    // 添加到页面
    document.body.appendChild(messageEl);
    
    // 动画显示
    setTimeout(() => messageEl.classList.add('show'), 10);
    
    // 3秒后移除
    setTimeout(() => {
        messageEl.classList.remove('show');
        setTimeout(() => messageEl.remove(), 300);
    }, 3000);
}