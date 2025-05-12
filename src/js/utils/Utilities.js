/**
 * 通用工具函数类
 * 包含通知系统、格式化和辅助功能
 */
export class Utilities {
    constructor() {
        this.notificationContainer = null;
        this.initNotificationSystem();
    }

    /**
     * 初始化通知系统
     */
    initNotificationSystem() {
        // 检查通知容器是否已存在
        let container = document.querySelector('.notifications-container');
        
        if (!container) {
            // 创建通知容器
            container = document.createElement('div');
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
        
        this.notificationContainer = container;
    }

    /**
     * 显示通知消息
     * @param {string} type - 通知类型：'info', 'success', 'warning', 'error'
     * @param {string} title - 通知标题
     * @param {string} message - 通知内容
     * @param {number} duration - 显示时长（毫秒），0表示不自动关闭
     * @returns {HTMLElement} 创建的通知元素
     */
    showNotification(type = 'info', title = '', message = '', duration = 5000) {
        // 确保通知容器已初始化
        if (!this.notificationContainer) {
            this.initNotificationSystem();
        }
        
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // 添加通知图标
        const iconElement = document.createElement('div');
        iconElement.className = 'notification-icon';
        
        // 根据类型设置不同图标
        let iconSvg = '';
        switch (type) {
            case 'success':
                iconSvg = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                break;
            case 'error':
                iconSvg = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                break;
            case 'warning':
                iconSvg = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                break;
            default: // info
                iconSvg = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                break;
        }
        
        iconElement.innerHTML = iconSvg;
        notification.appendChild(iconElement);
        
        // 添加内容
        const contentElement = document.createElement('div');
        contentElement.className = 'notification-content';
        
        // 标题和关闭按钮
        const titleElement = document.createElement('div');
        titleElement.className = 'notification-title';
        titleElement.textContent = title;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => this.closeNotification(notification));
        
        titleElement.appendChild(closeButton);
        contentElement.appendChild(titleElement);
        
        // 消息内容
        if (message) {
            const messageElement = document.createElement('p');
            messageElement.className = 'notification-message';
            messageElement.textContent = message;
            contentElement.appendChild(messageElement);
        }
        
        notification.appendChild(contentElement);
        
        // 添加进度条
        const progressElement = document.createElement('div');
        progressElement.className = 'notification-progress';
        
        const progressInner = document.createElement('div');
        progressInner.className = 'notification-progress-inner';
        progressElement.appendChild(progressInner);
        
        notification.appendChild(progressElement);
        
        // 添加到容器
        this.notificationContainer.appendChild(notification);
        
        // 显示通知（使用setTimeout使CSS过渡生效）
        setTimeout(() => {
            notification.classList.add('visible');
        }, 10);
        
        // 设置自动关闭
        if (duration > 0) {
            progressInner.style.transition = `width ${duration}ms linear`;
            progressInner.style.width = '0%';
            
            setTimeout(() => {
                this.closeNotification(notification);
            }, duration);
        }
        
        return notification;
    }

    /**
     * 关闭通知
     * @param {HTMLElement} notification - 要关闭的通知元素
     */
    closeNotification(notification) {
        if (!notification) return;
        
        // 添加关闭状态
        notification.classList.remove('visible');
        
        // 等待过渡效果完成后移除元素
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * 格式化数字为固定小数位
     * @param {number} num - 要格式化的数字
     * @param {number} digits - 小数位数
     * @returns {string} 格式化后的数字字符串
     */
    formatNumber(num, digits = 2) {
        if (num === undefined || num === null) return '--';
        return num.toFixed(digits);
    }

    /**
     * 检查值是否在有效范围内
     * @param {number} value - 要检查的值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {boolean} 值是否在范围内
     */
    isInRange(value, min, max) {
        return value >= min && value <= max;
    }

    /**
     * 随机整数生成器（用于模拟）
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 随机整数
     */
    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 根据比例计算实际尺寸
     * @param {number} pixelValue - 像素值
     * @param {number} ratio - 像素/毫米比例
     * @returns {number} 实际尺寸（毫米）
     */
    calculateRealSize(pixelValue, ratio) {
        if (!ratio || ratio <= 0) return 0;
        return pixelValue / ratio;
    }
} 