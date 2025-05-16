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
        X: { min: 0.0, max: 200.0 },
        Y: { min: 0.0, max: 200.0 },
        Z: { min: 0.0, max: 50.0 },
        U: { min: 0.0, max: 360.0 }
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
    displayUnit: 'um', // 默认单位为um
    currentUnitScale: 1, // 1表示um, 1000表示mm
    // 添加相机图像URL
    cameraImageUrl: null,
    viewingThumbnail: false,
    currentDisplayedImageIndex: null,
    cachedImageUrl: null,
    clarity: null,
    cachedTimestamp: null
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
        calibrateBtn.addEventListener('click', calibrateRatio);
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
    
    // 初始化ROI按钮
    initializeRoiButtons();
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
            input.value = position !== null ? Math.abs(position).toFixed(3) : '';
            
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
            
            // 轴配置按钮相关代码已删除
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
    // 保存旧状态的连接状态和清晰度
    const wasConnected = cameraState.isConnected;
    const oldClarity = cameraState.clarity;
    
    // 更新状态
    cameraState = { ...cameraState, ...state };
    
    // 连接状态变化时，清除图片缓存
    if (wasConnected !== cameraState.isConnected) {
        cameraState.cachedImageUrl = null;
        cameraState.cachedTimestamp = null;
    }
    
    // 清晰度变化超过阈值时，更新模糊效果
    if (Math.abs((oldClarity || 0) - (cameraState.clarity || 0)) > 0.05) {
        if (cameraState.cachedImageUrl) {
            applyBlurToImage(cameraState.cachedImageUrl, cameraState.clarity || 0);
        }
    }
    
    // 仅在特定条件下获取相机图像
    const shouldFetchImage = 
        cameraState.isConnected && 
        !cameraState.viewingThumbnail && 
        (!cameraState.cachedTimestamp || 
         Date.now() - cameraState.cachedTimestamp > 2000); // 最多2秒一次
    
    if (shouldFetchImage) {
        fetchCameraImage();
        cameraState.cachedTimestamp = Date.now();
    }
    
    // 保留当前显示的图片索引
    const currentDisplayedImageIndex = cameraState.currentDisplayedImageIndex;
    const viewingThumbnail = cameraState.viewingThumbnail;
    
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
    
    // 更新图像中显示的清晰度值
    const clarityDisplay = document.getElementById('clarity-display');
    if (clarityDisplay) {
        // 添加外部检查，确保state.clarity存在且不为undefined
        clarityDisplay.textContent = (state && state.clarity !== undefined && state.clarity !== null) ? 
            state.clarity.toFixed(3) : '--';
    }
    
    // 更新对焦位置显示
    const cameraFocusPositionDisplay = document.getElementById('focus-position-display');
    if (cameraFocusPositionDisplay && state && state.ZPosition !== null && state.ZPosition !== undefined) {
        cameraFocusPositionDisplay.textContent = Math.abs(state.ZPosition).toFixed(3) + " mm";
    } else if (cameraFocusPositionDisplay) {
        cameraFocusPositionDisplay.textContent = "--";
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
                    // 毫米显示，保留3位小数且为正值
                    const position = cameraState[`${axisName}Position`];
                    focusPositionDisplay.textContent = position !== null && position !== undefined ? 
                        `${Math.abs(position).toFixed(3)} mm` : "--";
                } else {
                    // 微米显示，整数且为正值
                    const positionEncoder = cameraState[`${axisName}PositionEncoder`];
                    focusPositionDisplay.textContent = positionEncoder !== null && positionEncoder !== undefined ? 
                        `${Math.abs(Math.round(positionEncoder))} um` : "--";
                }
            } else {
                focusPositionDisplay.textContent = "--";
            }
        } else {
            focusPositionDisplay.textContent = "--";
        }
    }
    
    if (focusClarityDisplay) {
        focusClarityDisplay.textContent = (state && state.clarity !== undefined && state.clarity !== null) ? 
            state.clarity.toFixed(3) : '--';
    }
    
    // 更新Z轴控制界面
    if (window.updateFocusAxisControls) {
        window.updateFocusAxisControls();
    }
}

// 定期更新状态
function startStatusPolling() {
    let pollTimeout;
    let isPaused = false;
    
    async function poll() {
        if (cameraState.isConnected && !isPaused) {
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

    // 提供暂停和恢复轮询的方法
    window.pauseStatusPolling = function() {
        isPaused = true;
        console.log('状态轮询已暂停');
    };
    
    window.resumeStatusPolling = function() {
        isPaused = false;
        console.log('状态轮询已恢复');
    };

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
            
            // 相机连接后立即获取图像
            if (state.isConnected) {
                fetchCameraImage();
            }
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
        // 重置缩略图查看状态
        cameraState.viewingThumbnail = false;
        cameraState.currentDisplayedImageIndex = null;
        
        // 恢复状态轮询，确保可以实时更新对焦过程
        if (window.resumeStatusPolling) {
            window.resumeStatusPolling();
        }
        
        // 使用搜索范围计算起点和终点 - 现在使用编码器值
        let currentZ = 0; // 默认值
        
        // 按优先级依次尝试获取当前Z轴位置
        if (cameraState.currentZEncoder !== null && cameraState.currentZEncoder !== undefined) {
            currentZ = Math.round(cameraState.currentZEncoder);
        } else if (cameraState.ZPositionEncoder !== null && cameraState.ZPositionEncoder !== undefined) {
            currentZ = Math.round(cameraState.ZPositionEncoder);
        } else if (cameraState.currentZ !== null && cameraState.currentZ !== undefined) {
            currentZ = Math.round(cameraState.currentZ * 1000);
        } else if (cameraState.ZPosition !== null && cameraState.ZPosition !== undefined) {
            currentZ = Math.round(cameraState.ZPosition * 1000);
        }
        
        const range = parseInt(document.getElementById('focus-range').value) || 1000;
        const step = parseInt(document.getElementById('focus-step').value) || 100;
        
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
        
        // 使用固定的API路径而非变量
        const response = await fetch('/start_focus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        
        if (!response.ok) {
            throw new Error(`服务器返回错误: ${response.status}`);
        }
        
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
        let payload = {};
        
        // 检查是否正在查看缩略图，并且有选中的缩略图
        if (cameraState.viewingThumbnail && 
            cameraState.currentDisplayedImageIndex !== undefined && 
            Array.isArray(cameraState.focusImages) && 
            cameraState.focusImages[cameraState.currentDisplayedImageIndex]) {
            
            // 使用选中缩略图的Z位置
            const selectedImage = cameraState.focusImages[cameraState.currentDisplayedImageIndex];
            payload = {
                zPosition: selectedImage.zPosition,
                zPositionEncoder: selectedImage.zPositionEncoder,
                axisId: '3' // 默认为Z轴ID
            };
            
            console.log('使用缩略图位置保存:', payload);
        } else {
            // 使用当前轴位置
            // 获取当前选中的轴ID
            const selectedAxisId = document.getElementById('focus-axis-select') ? 
                                document.getElementById('focus-axis-select').value : '3'; // 默认Z轴
            
            payload = { axisId: selectedAxisId };
            console.log('使用当前轴位置保存:', payload);
        }
        
        const response = await fetch('/save_focus_position', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 显示保存成功信息
            showMessage(`保存成功: ${result.message}`, 'success');
            
            // 检查是否有缩略图区域，且已完成对焦
            if (cameraState.focusCompleted && Array.isArray(cameraState.focusImages) && 
                cameraState.focusImages.length > 0 && !cameraState.viewingThumbnail) {
                // 显示缩略图区域，让用户查看并选择不同位置
                loadFocusImages();
                
                // 暂停状态轮询，防止自动更新覆盖缩略图
                if (window.pauseStatusPolling) {
                    window.pauseStatusPolling();
                }
            }
        } else {
            // 显示错误信息
            showMessage(`保存失败: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('保存对焦位置失败:', error);
        showMessage('保存对焦位置失败，请查看控制台了解详情', 'error');
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

// ROI绘制相关函数 - 重写后的代码
function editRoi() {
    if (!cameraState.isConnected) return;
    
    // 启用绘制模式
    cameraState.isDrawingROI = true;
    
    // 准备绘制区域
    const overlay = document.getElementById('focus-roi-overlay');
    if (!overlay) return;
    
    // 清除之前的内容，准备绘制新的ROI
    overlay.innerHTML = '';
    overlay.style.display = 'block';
    overlay.classList.add('drawing');
    
    // 添加ROI信息显示元素
    if (!roiInfoDisplay) {
        roiInfoDisplay = document.createElement('div');
        roiInfoDisplay.className = 'roi-info';
        document.getElementById('camera-display-container').appendChild(roiInfoDisplay);
    }
    roiInfoDisplay.style.display = 'none';
    
    // 添加绘制事件监听器
    overlay.addEventListener('mousedown', startRoiDraw);
    overlay.addEventListener('mousemove', updateRoiDraw);
    overlay.addEventListener('mouseup', endRoiDraw);
    overlay.addEventListener('mouseleave', endRoiDraw);
    
    // 重置绘制状态变量
    isDrawing = false;
    currentRoiRect = null;
    polygonPoints = [];
    
    // 更新按钮状态
    document.getElementById('edit-roi-focus-btn').classList.add('active');
    
    console.log('已进入ROI绘制模式');
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

// 原来的toggleRoiDrawing和editRoi函数会被替换

// 2. 编辑/绘制ROI
function editRoi() {
    if (!cameraState.isConnected) return;
    
    // 启用绘制模式
    cameraState.isDrawingROI = true;
    
    // 准备绘制区域
    const overlay = document.getElementById('focus-roi-overlay');
    if (!overlay) return;
    
    // 清除之前的内容，准备绘制新的ROI
    overlay.innerHTML = '';
    overlay.style.display = 'block';
    overlay.classList.add('drawing');
    
    // 添加ROI信息显示元素
    if (!roiInfoDisplay) {
        roiInfoDisplay = document.createElement('div');
        roiInfoDisplay.className = 'roi-info';
        document.getElementById('camera-display-container').appendChild(roiInfoDisplay);
    }
    roiInfoDisplay.style.display = 'none';
    
    // 添加绘制事件监听器
    overlay.addEventListener('mousedown', startRoiDraw);
    overlay.addEventListener('mousemove', updateRoiDraw);
    overlay.addEventListener('mouseup', endRoiDraw);
    overlay.addEventListener('mouseleave', endRoiDraw);
    
    // 重置绘制状态变量
    isDrawing = false;
    currentRoiRect = null;
    polygonPoints = [];
    
    // 更新按钮状态
    document.getElementById('edit-roi-focus-btn').classList.add('active');
    
    console.log('已进入ROI绘制模式');
}

// 确认当前绘制的ROI
function confirmRoi() {
    if (!currentRoiRect) return;
    
    // 设置ROI已启用
    cameraState.roiEnabled = true;
    
    // 禁用绘制模式
    cameraState.isDrawingROI = false;
    
    // 移除绘制事件监听器
    const overlay = document.getElementById('focus-roi-overlay');
    if (overlay) {
        overlay.removeEventListener('mousedown', startRoiDraw);
        overlay.removeEventListener('mousemove', updateRoiDraw);
        overlay.removeEventListener('mouseup', endRoiDraw);
        overlay.removeEventListener('mouseleave', endRoiDraw);
        overlay.classList.remove('drawing');
    }
    
    // 隐藏ROI信息显示
    if (roiInfoDisplay) {
        roiInfoDisplay.style.display = 'none';
    }
    
    // 重置按钮状态
    document.getElementById('edit-roi-focus-btn').classList.remove('active');
    
    // 发送ROI数据到后端
    updateRoiOnServer();
    
    // 显示操作成功的消息
    showMessage('ROI区域已确认', 'success');
    
    console.log('ROI已确认');
}

// 支持函数：初始化事件监听器
function initializeRoiButtons() {
    // ROI绘制相关事件
    const editRoiBtn = document.getElementById('edit-roi-focus-btn');
    const clearRoiBtn = document.getElementById('clear-roi-focus-btn');
    const toggleRoiVisibilityBtn = document.getElementById('toggle-focus-roi-visibility-btn');
    
    if (editRoiBtn) {
        editRoiBtn.addEventListener('click', editRoi);
    }
    
    if (clearRoiBtn) {
        clearRoiBtn.addEventListener('click', clearRoi);
    }
    
    if (toggleRoiVisibilityBtn) {
        toggleRoiVisibilityBtn.addEventListener('click', toggleRoiVisibility);
    }
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
    
    // ROI按钮组始终显示
    if (focusRoiButtonGroup) {
        focusRoiButtonGroup.style.display = 'flex';
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

    // 轴配置按钮相关代码已删除
    
    // 轴配置弹窗相关事件监听器已删除
    
    // 轴配置弹窗相关代码已删除

    // 加载PLC轴数据
    loadPlcAxes();

    // 自动连接
    setTimeout(autoConnect, 500); // 延迟500ms后自动连接
});

// 缩略图相关变量
let selectedThumbnailIndex = -1;
let bestFocusIndex = -1;

// 加载对焦图像缩略图
function loadFocusImages() {
    let bestFocusIndex = 0;
    
    const thumbnailsContainer = document.querySelector('.focus-thumbnails-container');
    const thumbnailsWrapper = document.querySelector('.focus-thumbnails');
    thumbnailsWrapper.innerHTML = '';
    
    if (!Array.isArray(cameraState.focusImages) || cameraState.focusImages.length === 0) {
        return;
    }
    
    // 找到最佳清晰度的图像
    bestFocusIndex = 0; // 默认值
    if (cameraState.focusImages.every(img => img && img.clarity !== undefined && img.clarity !== null)) {
        bestFocusIndex = cameraState.focusImages.reduce((maxIndex, curr, index, arr) => {
            return curr.clarity > arr[maxIndex].clarity ? index : maxIndex;
        }, 0);
    }
    
    // 创建并添加缩略图
    cameraState.focusImages.forEach((image, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = `focus-thumbnail ${index === bestFocusIndex ? 'best' : ''}`;
        thumbnail.dataset.index = index;
        
        const img = document.createElement('img');
        // 使用正确的图像数据属性
        img.src = image.imageData || image.image || '';
        img.alt = `Focus Position ${image.zPosition}`;
        thumbnail.appendChild(img);
        
        const info = document.createElement('div');
        info.className = 'focus-thumbnail-info';
        info.innerHTML = `
            <div style="font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;">Z: ${image.zPosition ? image.zPosition.toFixed(3) : '--'} mm</div>
            <div style="font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;">清晰度: ${image.clarity !== undefined && image.clarity !== null ? image.clarity.toFixed(3) : '--'}</div>
        `;
        thumbnail.appendChild(info);
        
        // 点击事件：在主视图中显示图像
        thumbnail.addEventListener('click', () => {
            selectThumbnail(index);
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
    
    // 设置标志，防止实时图像更新
    cameraState.viewingThumbnail = true;
    
    // 暂停状态轮询，防止自动更新覆盖缩略图
    if (window.pauseStatusPolling) {
        window.pauseStatusPolling();
    }
    
    // 自动选中最佳清晰度的图像并在主视图中显示
    selectThumbnail(bestFocusIndex);
}

// 选中缩略图
function selectThumbnail(index) {
    const thumbnails = document.querySelectorAll('.focus-thumbnail');
    thumbnails.forEach(thumb => thumb.classList.remove('selected'));
    
    if (index >= 0 && index < thumbnails.length) {
        thumbnails[index].classList.add('selected');
        selectedThumbnailIndex = index;
        
        // 添加一个标志，表示正在查看缩略图图像
        cameraState.viewingThumbnail = true;
        
        // 暂停状态轮询，避免实时图像更新
        if (window.pauseStatusPolling) {
            window.pauseStatusPolling();
        }
        
        // 显示所选图像
        const image = cameraState.focusImages[index];
        if (image) {
            const cameraFeed = document.getElementById('camera-feed');
            if (cameraFeed) {
                cameraFeed.src = image.imageData || image.image || '';
                
                // 记录当前显示的图像索引，防止被其他操作覆盖
                cameraState.currentDisplayedImageIndex = index;
            }
        }
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
                // 保持查看缩略图状态
                cameraState.viewingThumbnail = true;
                cameraState.currentDisplayedImageIndex = index;
                
                // 确保状态轮询已暂停
                if (window.pauseStatusPolling) {
                    window.pauseStatusPolling();
                }
                
                const response = await fetch('/set_focus_position', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        zPosition: image.zPosition,
                        zPositionEncoder: image.zPositionEncoder,
                        axisId: '3' // 默认为Z轴
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    showMessage('成功设置对焦位置', 'success');
                    
                    // 确保图像保持选中状态
                    selectThumbnail(index);
                    
                    // 重新强制显示该图像，防止被状态更新覆盖
                    const cameraFeed = document.getElementById('camera-feed');
                    if (cameraFeed && image) {
                        cameraFeed.src = image.imageData || image.image || '';
                    }
                } else {
                    showMessage('设置对焦位置失败', 'error');
                }
            } catch (error) {
                console.error('设置对焦位置时出错:', error);
                showMessage('设置对焦位置时发生错误', 'error');
            }
            break;
            
        case 'view-large':
            document.getElementById('camera-feed').src = image.imageData || image.image || '';
            cameraState.viewingThumbnail = true;
            cameraState.currentDisplayedImageIndex = index;
            
            // 确保状态轮询已暂停
            if (window.pauseStatusPolling) {
                window.pauseStatusPolling();
            }
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
            // 重置查看状态，恢复实时图像
            cameraState.viewingThumbnail = false;
            cameraState.currentDisplayedImageIndex = null;
            cameraState.isShowingCalibration = false; // 确保标定视图也被关闭
            
            // 恢复状态轮询
            if (window.resumeStatusPolling) {
                window.resumeStatusPolling();
            }
            
            // 恢复实时图像
            if (cameraState.isConnected) {
                // 确保隐藏校准图案
                if (simulatedImage) {
                    simulatedImage.style.display = 'block';
                }
                if (calibrationPattern) {
                    calibrationPattern.style.display = 'none';
                    calibrationPattern.innerHTML = '';
                }
                
                // 立即强制获取最新相机图像
                fetchCameraImage();
                
                // 延迟一段时间后再次获取图像，确保更新
                setTimeout(() => {
                    if (!cameraState.viewingThumbnail) {
                        fetchCameraImage();
                    }
                }, 500);
            }
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
    setupThumbnailsHorizontalScroll(); // 添加水平滚动支持
});

// 配置缩略图的水平滚动
function setupThumbnailsHorizontalScroll() {
    const thumbnailsWrapper = document.querySelector('.focus-thumbnails');
    if (thumbnailsWrapper) {
        thumbnailsWrapper.addEventListener('wheel', (e) => {
            // 阻止默认的垂直滚动行为
            e.preventDefault();
            // 将垂直滚动转换为水平滚动
            thumbnailsWrapper.scrollLeft += (e.deltaY * 3);
        }, { passive: false });
    }
}

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

// 获取相机实时图像
async function fetchCameraImage() {
    if (!cameraState.isConnected || cameraState.viewingThumbnail) return;
    
    try {
        const response = await fetch('/get_camera_image');
        if (response.ok) {
            const data = await response.json();
            if (data && data.image) {
                if (data.image !== cameraState.cachedImageUrl) {
                    // 只有当图片URL变化时才更新
                    cameraState.cachedImageUrl = data.image;
                    
                    // 应用模糊效果
                    applyBlurToImage(data.image, cameraState.clarity || 0);
                    console.log('更新相机图像');
                }
            }
        }
    } catch (error) {
        console.error('获取相机图像失败:', error);
    }
}

// 应用模糊效果
function applyBlurToImage(imageUrl, clarity) {
    const cameraFeed = document.getElementById('camera-feed');
    if (!cameraFeed) return;
    
    // 设置图片源
    cameraFeed.src = imageUrl;
    
    // 计算模糊程度 (清晰度越低，模糊程度越高)
    // clarity通常在0-1之间，0表示完全不清晰
    let blurAmount = 0;
    
    if (clarity < 0.1) {
        blurAmount = 10; // 最大模糊
    } else if (clarity < 0.3) {
        blurAmount = 6;
    } else if (clarity < 0.5) {
        blurAmount = 3;
    } else if (clarity < 0.7) {
        blurAmount = 1;
    } else {
        blurAmount = 0; // 完全清晰
    }
    
    // 应用CSS滤镜
    cameraFeed.style.filter = `blur(${blurAmount}px)`;
    console.log(`应用图像模糊: ${blurAmount}px (清晰度: ${clarity})`);
}

// 单位显示和切换相关代码
const unitDisplayElement = document.getElementById('unit-display');
const rangeUnitDisplayElement = document.getElementById('range-unit-display');
const stepUnitDisplayElement = document.getElementById('step-unit-display');
const focusRangeInput = document.getElementById('focus-range');
const focusStepInput = document.getElementById('focus-step');

// 更新单位显示
function updateUnitDisplay() {
    const unitText = cameraState.displayUnit;
    if (unitDisplayElement) {
        unitDisplayElement.textContent = unitText;
    }
    if (rangeUnitDisplayElement) {
        rangeUnitDisplayElement.textContent = unitText;
    }
    if (stepUnitDisplayElement) {
        stepUnitDisplayElement.textContent = unitText;
    }
}

// 更新对焦控件单位显示
function updateFocusControlUnits() {
    const unitText = cameraState.currentUnitScale === 1000 ? 'mm' : 'um';
    if (rangeUnitLabel) {
        rangeUnitLabel.textContent = unitText;
    }
    if (stepUnitLabel) {
        stepUnitLabel.textContent = unitText;
    }
    
    // 更新单位标签
    const unitLabels = document.querySelectorAll('.unit-label');
    unitLabels.forEach(label => {
        label.textContent = unitText;
    });
}

// 单位切换函数 - 统一管理所有单位相关功能
function toggleUnit() {
    // 获取当前步进值
    const focusStepSelect = document.getElementById('focus-step-select');
    const currentStepValue = parseFloat(focusStepSelect ? focusStepSelect.value : 1);
    
    // 切换单位前保存当前单位状态
    const previousUnit = cameraState.displayUnit;
    
    // 切换单位
    if (cameraState.displayUnit === 'um') {
        cameraState.displayUnit = 'mm';
        cameraState.currentUnitScale = 1000;
        
        // 从um转换到mm，将步进值除以1000
        if (focusStepSelect) {
            const newStepValue = currentStepValue / 1000;
            focusStepSelect.value = newStepValue.toFixed(3);
            
            // 更新步进下拉列表的选项
            updateStepSelectOptions('mm');
        }
    } else {
        cameraState.displayUnit = 'um';
        cameraState.currentUnitScale = 1;
        
        // 从mm转换到um，将步进值乘以1000
        if (focusStepSelect) {
            const newStepValue = currentStepValue * 1000;
            focusStepSelect.value = Math.round(newStepValue);
            
            // 更新步进下拉列表的选项
            updateStepSelectOptions('um');
        }
    }
    
    // 更新轴位置显示
    updateFocusAxisPosition(); // 使用已经存在的函数
    
    // 更新全局单位显示
    updateUnitDisplay();
    
    // 更新搜索范围和对焦步进输入框
    if (focusRangeInput && focusStepInput) {
        if (cameraState.displayUnit === 'mm') {
            // 从um转到mm
            focusRangeInput.value = (parseFloat(focusRangeInput.value) / 1000).toFixed(3);
            focusStepInput.value = (parseFloat(focusStepInput.value) / 1000).toFixed(3);
            
            // 调整step和min属性
            focusRangeInput.step = '0.1';
            focusRangeInput.min = '0.1';
            focusStepInput.step = '0.01';
            focusStepInput.min = '0.001';
        } else {
            // 从mm转到um
            focusRangeInput.value = Math.round(parseFloat(focusRangeInput.value) * 1000);
            focusStepInput.value = Math.round(parseFloat(focusStepInput.value) * 1000);
            
            // 恢复原始step和min属性
            focusRangeInput.step = '100';
            focusRangeInput.min = '100';
            focusStepInput.step = '10';
            focusStepInput.min = '1';
        }
    }
    
    console.log(`单位已切换为: ${cameraState.displayUnit}`);
    showMessage(`单位已切换为: ${cameraState.displayUnit}`, 'info');
}

// 更新步进选择下拉列表的选项
function updateStepSelectOptions(unit) {
    const focusStepSelect = document.getElementById('focus-step-select');
    if (!focusStepSelect) return;
    
    // 清空当前选项
    focusStepSelect.innerHTML = '';
    
    // 根据当前单位添加适当的选项
    if (unit === 'mm') {
        // 毫米模式选项
        const mmOptions = [0.001, 0.01, 0.1, 0.5, 1.0];
        mmOptions.forEach(value => {
            const option = document.createElement('option');
            option.value = value.toFixed(3);
            option.textContent = value.toFixed(3);
            focusStepSelect.appendChild(option);
        });
        
        // 尝试选中当前值或最接近的值
        const currentValue = parseFloat(focusStepSelect.value);
        selectClosestOption(focusStepSelect, currentValue);
    } else {
        // 微米模式选项
        const umOptions = [1, 10, 100, 500, 1000];
        umOptions.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            focusStepSelect.appendChild(option);
        });
        
        // 尝试选中当前值或最接近的值
        const currentValue = parseFloat(focusStepSelect.value);
        selectClosestOption(focusStepSelect, currentValue);
    }
}

// 选择下拉列表中最接近指定值的选项
function selectClosestOption(selectElement, targetValue) {
    if (!selectElement || isNaN(targetValue)) return;
    
    let closestOption = null;
    let minDiff = Number.MAX_VALUE;
    
    // 查找最接近目标值的选项
    for (let i = 0; i < selectElement.options.length; i++) {
        const optionValue = parseFloat(selectElement.options[i].value);
        const diff = Math.abs(optionValue - targetValue);
        
        if (diff < minDiff) {
            minDiff = diff;
            closestOption = selectElement.options[i];
        }
    }
    
    // 设置选中的选项
    if (closestOption) {
        selectElement.value = closestOption.value;
    }
}

// 清除ROI区域功能
function clearRoi() {
    if (!cameraState.isConnected) return;
    
    // 重置ROI状态
    cameraState.roiEnabled = false;
    cameraState.roiCoords = null;
    cameraState.isDrawingROI = false;
    
    // 清除ROI显示
    const overlay = document.getElementById('focus-roi-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
        overlay.classList.remove('drawing');
    }
    
    // 移除ROI信息显示
    if (roiInfoDisplay) {
        roiInfoDisplay.style.display = 'none';
    }
    
    // 重置绘制状态和变量
    isDrawing = false;
    currentRoiRect = null;
    polygonPoints = [];
    
    // 重置按钮状态
    document.getElementById('edit-roi-focus-btn').classList.remove('active');
    
    // 通知后端清除ROI
    fetch('/clear_roi', { method: 'POST' })
        .then(response => response.json())
        .catch(error => console.error('清除ROI失败:', error));
    
    console.log('ROI已删除');
    
    // 显示操作成功的消息
    showMessage('ROI区域已删除', 'success');
}

// 显示/隐藏ROI区域功能
function toggleRoiVisibility() {
    if (!cameraState.isConnected) return;
    
    const overlay = document.getElementById('focus-roi-overlay');
    if (!overlay) return;
    
    const isVisible = overlay.style.display !== 'none';
    overlay.style.display = isVisible ? 'none' : 'block';
    
    // 更新按钮图标
    const toggleBtn = document.getElementById('toggle-focus-roi-visibility-btn');
    if (toggleBtn) {
        toggleBtn.querySelector('i').className = isVisible ? 'fas fa-eye-slash' : 'fas fa-eye';
        toggleBtn.title = isVisible ? '显示' : '隐藏';
    }
    
    console.log(`ROI区域已${isVisible ? '隐藏' : '显示'}`);
    showMessage(`ROI区域已${isVisible ? '隐藏' : '显示'}`, 'info');
}

// 当量计算功能
function calibrateRatio() {
    if (!cameraState.isConnected) return;
    
    // 获取方格尺寸
    const squareSize = parseFloat(document.getElementById('calib-square-size').value) || 1.0;
    if (squareSize <= 0) {
        showMessage('方格尺寸必须大于0', 'error');
        return;
    }
    
    // 发送请求到后端进行校准
    fetch('/calibrate_ratio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squareSize: squareSize })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 显示校准结果
            const resultValue = document.getElementById('calibration-result-value');
            if (resultValue) {
                resultValue.textContent = `${data.ratio.toFixed(2)} px/mm`;
            }
            showMessage('当量校准成功', 'success');
        } else {
            showMessage('当量校准失败: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('当量校准请求失败:', error);
        showMessage('当量校准请求失败', 'error');
    });
}

// 检测Mark点
function detectMarkPoint() {
    if (!cameraState.isConnected) return;
    
    showMessage('正在检测Mark点...', 'info');
    
    fetch('/detect_mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            exposure: cameraState.focusParams.exposure,
            gain: cameraState.focusParams.gain
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新标定状态
            cameraState.markDetected = true;
            cameraState.markPoints = data.markPoints;
            
            showMessage('Mark点检测成功', 'success');
        } else {
            showMessage('Mark点检测失败: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('检测Mark点请求失败:', error);
        showMessage('检测Mark点请求失败', 'error');
    });
}

// 居中Mark点
function centerMarkPoint() {
    if (!cameraState.isConnected || !cameraState.markDetected) {
        showMessage('请先检测Mark点', 'error');
        return;
    }
    
    showMessage('正在居中Mark点...', 'info');
    
    fetch('/center_mark', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新标定状态
            cameraState.markCentered = true;
            
            showMessage('Mark点已居中', 'success');
        } else {
            showMessage('居中Mark点失败: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('居中Mark点请求失败:', error);
        showMessage('居中Mark点请求失败', 'error');
    });
}

// 开始标定
function startCalibration() {
    if (!cameraState.isConnected) return;
    
    if (!cameraState.markCentered) {
        showMessage('请先检测并居中Mark点', 'error');
        return;
    }
    
    // 获取标定参数
    const matrixSizeSelect = document.getElementById('matrix-size');
    const pointOffsetInput = document.getElementById('point-offset');
    
    const matrixSize = parseInt(matrixSizeSelect.value) || 3;
    const pointOffset = parseFloat(pointOffsetInput.value) || 10.0;
    
    showMessage('开始执行标定...', 'info');
    
    fetch('/start_calibration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            size: matrixSize,
            offset: pointOffset
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新标定状态
            cameraState.isCalibrating = true;
            
            showMessage(`标定开始，共${data.totalPoints}个点`, 'success');
            
            // 轮询标定状态
            pollCalibrationStatus();
        } else {
            showMessage('开始标定失败: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('开始标定请求失败:', error);
        showMessage('开始标定请求失败', 'error');
    });
}

// 停止标定
function stopCalibration() {
    if (!cameraState.isConnected || !cameraState.isCalibrating) {
        return;
    }
    
    showMessage('正在停止标定...', 'info');
    
    fetch('/stop_calibration', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新标定状态
            cameraState.isCalibrating = false;
            
            showMessage('标定已停止', 'warning');
        } else {
            showMessage('停止标定失败: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('停止标定请求失败:', error);
        showMessage('停止标定请求失败', 'error');
    });
}

// 轮询标定状态
function pollCalibrationStatus() {
    if (!cameraState.isCalibrating) return;
    
    fetch('/calibration_status')
        .then(response => response.json())
        .then(data => {
            // 更新界面显示
            const statusElem = document.getElementById('calibration-status');
            const progressElem = document.getElementById('calibration-progress');
            const currentPointElem = document.getElementById('current-point');
            
            if (statusElem) {
                statusElem.textContent = data.isCalibrating ? '标定中' : '已停止';
            }
            
            if (progressElem) {
                const progress = data.totalPoints > 0 ? 
                    Math.round((data.completedPoints / data.totalPoints) * 100) : 0;
                progressElem.textContent = `${progress}% (${data.completedPoints}/${data.totalPoints})`;
            }
            
            if (currentPointElem && data.currentPoint) {
                currentPointElem.textContent = 
                    `当前点: (${data.currentPoint.x.toFixed(2)}, ${data.currentPoint.y.toFixed(2)})`;
            }
            
            // 如果标定仍在进行，继续轮询
            if (data.isCalibrating) {
                setTimeout(pollCalibrationStatus, 500);
            } else if (data.calibrationResults) {
                // 标定结束且有结果
                showMessage('标定完成', 'success');
                displayCalibrationResults(data.calibrationResults);
            }
        })
        .catch(error => {
            console.error('获取标定状态失败:', error);
            // 出错时继续轮询，但降低频率
            setTimeout(pollCalibrationStatus, 2000);
        });
}

// 显示标定结果
function displayCalibrationResults(results) {
    // 在界面上显示标定结果
    const resultsContainer = document.getElementById('calibration-results-container');
    if (!resultsContainer) return;
    
    resultsContainer.style.display = 'block';
    
    // 格式化并显示结果
    let html = '<h4>标定结果</h4>';
    html += `<p>重投影误差: ${results.reprojectionError.toFixed(4)}</p>`;
    html += `<p>成功点数: ${results.completedPoints}/${results.totalPoints}</p>`;
    html += '<p>内参矩阵:</p>';
    html += '<pre>';
    
    // 格式化内参矩阵
    for (const row of results.intrinsic) {
        html += row.map(v => v.toFixed(2).padStart(10)).join(' ') + '\n';
    }
    
    html += '</pre>';
    html += '<p>畸变系数:</p>';
    html += '<pre>';
    html += results.distortion.map(v => v.toFixed(4).padStart(10)).join(' ');
    html += '</pre>';
    
    resultsContainer.innerHTML = html;
}

// 切换校准视图
function toggleCalibrationView() {
    if (!cameraState.isConnected) return;
    
    cameraState.isShowingCalibration = !cameraState.isShowingCalibration;
    
    // 更新显示
    if (simulatedImage && calibrationPattern) {
        if (cameraState.isShowingCalibration) {
            // 显示校准模式
            simulatedImage.style.display = 'none';
            calibrationPattern.style.display = 'block';
            
            // 生成校准图案
            const patternSize = Math.min(calibrationPattern.clientWidth, calibrationPattern.clientHeight);
            const squareSize = patternSize / 10; // 10x10 网格
            
            let patternHtml = '';
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 10; j++) {
                    const isEven = (i + j) % 2 === 0;
                    patternHtml += `<div class="calib-square ${isEven ? 'white' : 'black'}" 
                                    style="width: ${squareSize}px; height: ${squareSize}px;"></div>`;
                }
            }
            
            calibrationPattern.innerHTML = patternHtml;
            toggleViewBtn.querySelector('i').className = 'fas fa-camera';
            toggleViewBtn.title = '返回相机视图';
            
            // 暂停状态轮询
            if (window.pauseStatusPolling) {
                window.pauseStatusPolling();
            }
        } else {
            // 返回相机视图
            simulatedImage.style.display = 'block';
            calibrationPattern.style.display = 'none';
            calibrationPattern.innerHTML = '';
            toggleViewBtn.querySelector('i').className = 'fas fa-th';
            toggleViewBtn.title = '显示校准图案';
            
            // 恢复状态轮询
            if (window.resumeStatusPolling) {
                window.resumeStatusPolling();
            }
            
            // 立即获取相机图像
            fetchCameraImage();
        }
    }
}

// 初始化对焦轴控制
function initFocusAxisControls() {
    // 检查DOM元素是否存在
    if (!focusAxisSelect || !focusJogMinus || !focusJogPlus || !focusStepSelect) {
        console.warn('对焦轴控制元素未找到');
        return;
    }
    
    // 点动控制事件监听器
    focusJogMinus.addEventListener('click', () => performJog(-1));
    focusJogPlus.addEventListener('click', () => performJog(1));
    
    // 轴选择改变事件
    focusAxisSelect.addEventListener('change', () => {
        updateFocusAxisPosition();
    });
    
    // 将updateFocusAxisControls函数添加到window对象，使其全局可访问
    window.updateFocusAxisControls = updateFocusAxisPosition;
    
    console.log('对焦轴控制已初始化');
}

// 执行点动操作
async function performJog(direction) {
    if (!cameraState.isConnected) return;
    
    // 使用轴选择下拉框的值
    const axisId = focusAxisSelect.value;
    if (!axisId) return;
    
    // 获取轴名称
    const axisName = getAxisNameById(axisId);
    if (!axisName) return;
    
    // 从步进选择下拉列表获取步进值
    let stepValue = parseFloat(focusStepSelect.value);
    
    // 确定是否使用编码器值（微米）
    const isUsingMm = cameraState.displayUnit === 'mm';
    
    // 根据单位模式调整步进值
    if (isUsingMm) {
        // 毫米模式下，需要将步进值转换为微米(编码器值)
        stepValue = stepValue * 1000;
    }
    // 微米模式下保持原值
    
    // 获取当前位置（使用绝对值确保正值）
    let currentPosition = 0;
    if (isUsingMm) {
        // 毫米模式
        currentPosition = Math.abs(cameraState[`${axisName}Position`] || 0);
        // 转换为编码器值进行计算
        currentPosition = currentPosition * 1000;
    } else {
        // 微米模式，直接使用编码器值
        currentPosition = Math.abs(cameraState[`${axisName}PositionEncoder`] || 0);
    }
    
    // 计算新位置（在编码器值域中计算）
    let newPosition = currentPosition + (stepValue * direction);
    
    // 检查轴限制（确保在范围内）
    const limits = cameraState.axisLimits[axisName];
    if (limits) {
        // 转换为编码器值进行比较
        const limitMin = limits.min * 1000;
        const limitMax = limits.max * 1000;
        
        if (newPosition < limitMin) {
            newPosition = limitMin;
            showMessage(`已达到${axisName}轴最小限制: ${limits.min}`, 'warning');
        } else if (newPosition > limitMax) {
            newPosition = limitMax;
            showMessage(`已达到${axisName}轴最大限制: ${limits.max}`, 'warning');
        }
    }
    
    console.log(`执行点动: 轴=${axisId}, 方向=${direction}, 步进=${stepValue}, 单位=${cameraState.displayUnit}, 新位置=${newPosition}`);
    
    try {
        const response = await fetch('/jog_axis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                axis: axisId,
                step: stepValue * direction,
                isEncoder: true, // 始终使用编码器值进行计算
                absolutePosition: newPosition
            })
        });
        
        if (!response.ok) {
            throw new Error(`服务器返回错误: ${response.status}`);
        }
        
        const state = await response.json();
        updateStatus(state);
    } catch (error) {
        console.error('点动控制失败:', error);
        showMessage('点动控制失败', 'error');
    }
}

// 更新对焦轴位置显示
function updateFocusAxisPosition() {
    if (!cameraState.isConnected || !focusAxisSelect || !focusAxisPosition) return;
    
    const axisId = focusAxisSelect.value;
    const axisName = getAxisNameById(axisId);
    
    if (!axisName) {
        focusAxisPosition.value = '--';
        return;
    }
    
    // 根据当前显示单位转换值
    if (cameraState.displayUnit === 'mm') {
        // 使用毫米显示，保留3位小数，并确保为正值
        const position = cameraState[`${axisName}Position`] || 0;
        focusAxisPosition.value = Math.abs(position).toFixed(3);
    } else {
        // 使用微米显示，整数，并确保为正值
        const positionEncoder = cameraState[`${axisName}PositionEncoder`] || 
                               (cameraState[`${axisName}Position`] * 1000) || 0;
        focusAxisPosition.value = Math.abs(Math.round(positionEncoder));
    }
    
    // 更新点动按钮的状态
    if (focusJogMinus && focusJogPlus) {
        const position = cameraState[`${axisName}Position`];
        const positionEncoder = cameraState[`${axisName}PositionEncoder`];
        const limits = cameraState.axisLimits[axisName];
        
        if (position !== undefined && limits) {
            const step = parseFloat(focusStepSelect.value);
            // 根据当前单位设置判断是否禁用按钮
            if (cameraState.displayUnit === 'mm') {
                // 毫米模式
                focusJogMinus.disabled = position - step < limits.min;
                focusJogPlus.disabled = position + step > limits.max;
            } else {
                // 微米模式
                const stepEncoder = step; // 微米模式下步进值已经是编码器单位
                focusJogMinus.disabled = positionEncoder - stepEncoder < limits.min * 1000;
                focusJogPlus.disabled = positionEncoder + stepEncoder > limits.max * 1000;
            }
        } else {
            focusJogMinus.disabled = !cameraState.isConnected;
            focusJogPlus.disabled = !cameraState.isConnected;
        }
    }
}

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
        // 使用毫米显示，保留3位小数，并确保为正值
        const position = cameraState[`${axisName}Position`] || 0;
        focusAxisPosition.value = Math.abs(position).toFixed(3);
    } else {
        // 使用微米显示，整数，并确保为正值
        const positionEncoder = cameraState[`${axisName}PositionEncoder`] || 
                               (cameraState[`${axisName}Position`] * 1000) || 0;
        focusAxisPosition.value = Math.abs(Math.round(positionEncoder));
    }
}

// 初始化单位显示
updateUnitDisplay();

// 单位切换事件监听
if (unitDisplayElement) {
    unitDisplayElement.addEventListener('click', toggleUnit);
}

// 初始化后调用一次单位显示更新
document.addEventListener('DOMContentLoaded', function() {
    // 初始化单位显示
    updateUnitDisplay();
    
    // 为所有单位显示元素添加单位切换事件
    if (unitDisplayElement) {
        unitDisplayElement.addEventListener('click', toggleUnit);
    }
    if (rangeUnitDisplayElement) {
        rangeUnitDisplayElement.addEventListener('click', toggleUnit);
    }
    if (stepUnitDisplayElement) {
        stepUnitDisplayElement.addEventListener('click', toggleUnit);
    }
});