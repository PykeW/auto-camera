class AxisController {
    constructor(cameraController) {
        this.cameraController = cameraController; // Reference to the main controller

        // --- Axis Configuration Elements ---
        this.configAxisBtn = document.getElementById('config-axis-btn');
        this.clearAxisBtn = document.getElementById('clear-axis-btn');
        this.axisDropdown = document.getElementById('axis-config-dropdown');
        this.axisListUl = document.getElementById('axis-list');
        this.dropdownCameraSN = document.getElementById('dropdown-camera-sn');

        // --- State Variables ---
        this.selectedAxisId = null;
        this.isAxisDropdownVisible = false;
        this.axisFetchProcessId = null; // ID for axis list fetching timer

        this.initializeEventListeners();
        this.updateConfigAxisButtonDisplay(null); // Initial state
    }

    initializeEventListeners() {
        this.configAxisBtn?.addEventListener('click', (e) => {
             e.stopPropagation(); // Prevent body click listener from immediately closing
             this.fetchAndShowAxisDropdown();
         });

        this.clearAxisBtn?.addEventListener('click', () => {
            if (this.clearAxisBtn.disabled) return;
            this.clearAxisConfig();
        });

        // Global listener to close dropdown when clicking outside
        document.body.addEventListener('click', (e) => {
            if (this.isAxisDropdownVisible &&
                this.axisDropdown && !this.axisDropdown.contains(e.target) && // Check if dropdown exists
                e.target !== this.configAxisBtn) { // Check if the click was not on the button itself
                this.hideAxisDropdown();
            }
        });

        // List item click listener is added dynamically in fetchAndShowAxisDropdown
    }

    // --- 获取并显示轴配置下拉列表 ---
    async fetchAndShowAxisDropdown() {
        if (!this.cameraController.isConnected) return; // Check connection via main controller

        if (this.isAxisDropdownVisible) {
            this.hideAxisDropdown();
            return;
        }

        console.log("模拟: 开始获取轴列表...");
        if (!this.axisListUl || !this.dropdownCameraSN || !this.axisDropdown) {
             console.error("轴配置下拉菜单元素缺失!");
             return;
        }

        this.axisListUl.innerHTML = '<li class="axis-list-loading">加载中...</li>';
        this.dropdownCameraSN.textContent = `相机: ${this.cameraController.serialNumberSelect?.value || 'N/A'}`; // Get SN from main controller
        this.axisDropdown.classList.add('show');
        this.isAxisDropdownVisible = true;
        this.cameraController.updateControlStates(); // Disable other controls while dropdown is open? (Optional)

        try {
            // Use shared wait function from main controller
            await this.cameraController.wait(400, 'axisFetchProcessId', this);
            // Simulate fetching axes - replace with actual backend call if needed
            const availableAxes = [
                { id: 'PLC_Axis_Z1', name: '龙门 Z 轴' },
                { id: 'PLC_Axis_Z2', name: '旋转台 Z 轴' },
                { id: 'PLC_Axis_A1', name: '辅助轴 A' },
                { id: 'SimulatedZ', name: '模拟 Z 轴' },
            ];
            console.log("模拟: 获取到轴列表:", availableAxes);

            this.axisListUl.innerHTML = ''; // Clear loading/error message

            if (availableAxes.length > 0) {
                availableAxes.forEach(axis => {
                    const li = document.createElement('li');
                    li.textContent = `${axis.name} (${axis.id})`;
                    li.dataset.axisId = axis.id;
                    // Add click listener to each list item
                    li.addEventListener('click', () => this.selectAxis(axis.id));
                    this.axisListUl.appendChild(li);
                });
            } else {
                this.axisListUl.innerHTML = '<li class="axis-list-empty">未找到可用轴</li>';
            }

        } catch (error) {
            if (error.message.includes('Stopped during wait')) {
                 console.log("模拟: 轴列表获取被取消。"); // e.g., if closed quickly
            } else {
                 console.error("模拟: 获取轴列表时出错:", error);
                 this.axisListUl.innerHTML = '<li class="axis-list-error">加载轴列表失败</li>';
            }
        } finally {
             this.axisFetchProcessId = null; // Clear the process ID
             // Decide if controls should be re-enabled here or upon selection/closing
             // this.cameraController.updateControlStates();
        }
    }

    hideAxisDropdown() {
        // Cancel fetch timer if active
        if (this.axisFetchProcessId) {
             clearTimeout(this.axisFetchProcessId);
             this.axisFetchProcessId = null;
             console.log("取消了正在进行的轴列表获取。");
        }
        if (this.axisDropdown) {
            this.axisDropdown.classList.remove('show');
        }
        this.isAxisDropdownVisible = false;
        this.cameraController.updateControlStates(); // Re-enable controls potentially
    }

    selectAxis(axisId) {
        console.log(`选择了轴: ${axisId}`);
        this.selectedAxisId = axisId;
        this.updateConfigAxisButtonDisplay(axisId);
        this.hideAxisDropdown();
        // Notify the main controller about the change
        this.cameraController.selectedAxisId = axisId; // Update main controller's state
        this.cameraController.updateControlStates(); // Update global controls based on selection
        this.cameraController.saveState(); // Persist the change
        console.log("模拟: 已将选定的轴保存到状态。");
    }

    async clearAxisConfig() {
        if (!this.cameraController.isConnected || !this.selectedAxisId) {
             console.warn("无法清空轴配置：未连接或未选择轴。");
             return;
        }

        console.log("清空轴配置...");
        const oldAxisId = this.selectedAxisId;
        this.selectedAxisId = null;
        this.updateConfigAxisButtonDisplay(null);
        // Notify the main controller
        this.cameraController.selectedAxisId = null;
        this.cameraController.updateControlStates();

        try {
            // Simulate backend communication
            console.log(`模拟: 通知后端清空轴配置 (相机: ${this.cameraController.serialNumberSelect?.value}, 原轴ID: ${oldAxisId})`);
            await this.cameraController.wait(200); // Simulate short delay
            // alert("模拟: 轴配置已清空"); // Maybe use a less intrusive notification
             console.log("模拟: 轴配置已清空确认。")
        } catch (error) {
            console.error("模拟: 清空轴配置时后端通信出错:", error);
            // alert("模拟: 清空轴配置时发生错误");
             // Revert UI if backend failed?
             // this.selectedAxisId = oldAxisId;
             // this.updateConfigAxisButtonDisplay(oldAxisId);
             // this.cameraController.selectedAxisId = oldAxisId;
             // this.cameraController.updateControlStates();
             return; // Stop state saving if backend failed
        }

        this.cameraController.saveState(); // Save the cleared state
    }

    updateConfigAxisButtonDisplay(axisId) {
        if (this.configAxisBtn) {
            if (axisId) {
                this.configAxisBtn.textContent = `轴: ${axisId}`; // Keep it concise
                this.configAxisBtn.title = `当前选择的Z轴: ${axisId} - 点击修改`;
            } else {
                this.configAxisBtn.textContent = '配置轴';
                this.configAxisBtn.title = '配置相机Z轴 (必需)';
            }
        } else {
            console.warn("无法找到 configAxisBtn 元素进行更新。");
        }
    }

    // --- State Management ---
    saveAxisState() {
        return {
            selectedAxisId: this.selectedAxisId,
            // No need to save isAxisDropdownVisible or axisFetchProcessId
        };
    }

    loadAxisState(savedState) {
        if (!savedState) return;

        if (savedState.hasOwnProperty('selectedAxisId')) {
            this.selectedAxisId = savedState.selectedAxisId;
            // Also update the main controller's state directly upon load
            this.cameraController.selectedAxisId = this.selectedAxisId;
        } else {
             this.selectedAxisId = null;
             this.cameraController.selectedAxisId = null;
        }
        // Update the button display based on loaded state
        this.updateConfigAxisButtonDisplay(this.selectedAxisId);
    }

    resetAxisState() {
         this.selectedAxisId = null;
         // Also update the main controller's state
         this.cameraController.selectedAxisId = null;
         this.hideAxisDropdown(); // Ensure dropdown is closed
         this.updateConfigAxisButtonDisplay(null);
         // No need to save state here, usually called during disconnect
     }
} 