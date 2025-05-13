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
    isZConfigured: false, // 新增：Z轴是否已配置标志
    axisLimits: {
        X: { min: -100.0, max: 100.0 },
        Y: { min: -100.0, max: 100.0 },
        Z: { min: 0.0, max: 50.0 },
        U: { min: -180.0, max: 180.0 }
    },
    // 添加自动对焦参数
    focusParams: {
        rangeUp: 5.0,
        rangeDown: 5.0,
        times: 2,
        steps: 10,
        exposure: 5000,
        gain: 1.0
    }
};

// DOM 元素
let connectBtn, serialInput, statusText, focusStatusText, currentZInput, clarityInput;
let startFocusBtn, stopFocusBtn, axisInputs, jogBtns, stepSelects;
let axisConfigModal, axisSelect, encoderValue, axisRatio, axisBacklash, axisSpeed;
let axisAcc, softLimitMin, softLimitMax;
let configFileInput, savePathInput, selectConfigBtn, selectFolderBtn;
let drawRoiFocusBtn, focusRoiButtonGroup;
let focusParamsModal, focusRangeUp, focusRangeDown, focusTimes, focusSteps, focusExposure, focusGain;

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

    // 自动对焦参数设置控件
    focusParamsModal = document.getElementById('focus-params-modal');
    focusRangeUp = document.getElementById('focus-range-up');
    focusRangeDown = document.getElementById('focus-range-down');
    focusTimes = document.getElementById('focus-times');
    focusSteps = document.getElementById('focus-steps');
    focusExposure = document.getElementById('focus-exposure');
    focusGain = document.getElementById('focus-gain');

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
                axis: axis,
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
    
    // 更新配置文件和保存路径显示
    if (configFileInput && state.configFile) {
        configFileInput.value = state.configFile;
    }
    if (savePathInput && state.savePath) {
        savePathInput.value = state.savePath;
    }
    
    // 更新按钮状态
    if (selectConfigBtn) {
        selectConfigBtn.disabled = !state.isConnected;
    }
    if (selectFolderBtn) {
        selectFolderBtn.disabled = !state.isConnected;
    }

    // 更新ROI按钮状态
    if (drawRoiFocusBtn) {
        drawRoiFocusBtn.disabled = !state.isConnected;
    }
    
    // 更新对焦参数设置按钮状态
    const focusSettingsBtn = document.getElementById('focus-settings-btn');
    if (focusSettingsBtn) {
        focusSettingsBtn.disabled = !state.isConnected || state.isFocusing;
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

// 显示轴配置弹窗
function showAxisConfigModal(axis) {
    // 设置当前选中的轴
    axisSelect.value = axis;
    
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

// 隐藏轴配置弹窗
function hideAxisConfigModal() {
    axisConfigModal.classList.remove('show');
}

// 保存轴配置
function saveAxisConfig() {
    const axis = axisSelect.value;
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
        cameraState.axisLimits[axis] = { min, max };
    }
    
    // 更新配置
    axisConfigs[axis] = config;
    
    // 发送到后端（这里需要添加实际的API调用）
    fetch('/save_axis_config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            axis,
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

// ROI绘制相关
function toggleRoiDrawing() {
    if (!cameraState.isConnected) return;
    
    const isDrawing = drawRoiFocusBtn.classList.contains('active');
    if (!isDrawing) {
        // 开始绘制
        drawRoiFocusBtn.classList.add('active');
        focusRoiButtonGroup.style.display = 'flex';
        // 这里添加ROI绘制的具体实现
    } else {
        // 取消绘制
        drawRoiFocusBtn.classList.remove('active');
        focusRoiButtonGroup.style.display = 'none';
    }
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
            const axis = e.target.value;
            if (axis && axisConfigs[axis] && cameraState.axisLimits && cameraState.axisLimits[axis]) {
                const config = axisConfigs[axis];
                const limits = cameraState.axisLimits[axis];
                
                document.getElementById('axis-ratio').value = config.ratio;
                document.getElementById('axis-backlash').value = config.backlash;
                document.getElementById('axis-speed').value = config.speed;
                document.getElementById('axis-acc').value = config.acc;
                document.getElementById('soft-limit-min').value = limits.min;
                document.getElementById('soft-limit-max').value = limits.max;
                document.getElementById('encoder-value').value = cameraState[`${axis}Position`] || 0;
            }
        });
    }

    // 自动连接
    setTimeout(autoConnect, 500); // 延迟500ms后自动连接
});