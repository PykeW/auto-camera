import '../css/main.css'; // Added for Vite

// main.js - 主文件，用于初始化和组织其他模块
import { CameraController } from './controllers/CameraController.js';

document.addEventListener('DOMContentLoaded', () => {
    // 初始化相机控制器
    const cameraController = new CameraController();
    
    // 将控制器实例暴露给全局，方便调试
    window.cameraController = cameraController;
}); 