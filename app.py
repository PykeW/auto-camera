from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import time
import random
import io
import base64
from PIL import Image, ImageDraw
from math import ceil
import os
import json
from threading import Thread, Event
import logging

app = Flask(__name__)
CORS(app)  # 允许所有来源的跨域请求

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    # 忽略Chrome DevTools相关请求
    if path.startswith('.well-known'):
        return '', 404  # 返回404状态码
    
    # 让Flask的路由系统先处理API路径
    if path in ['connect', 'disconnect', 'status', 'start_focus', 'stop_focus'] or path.startswith('api/'):
        # 这里不处理API路径，让Flask路由系统来处理
        return '', 404
    
    try:
        return send_file(path)
    except FileNotFoundError:
        # 文件不存在时返回404而不是500错误
        return '', 404

# --- 模拟状态 ---
camera_state = {
    "isConnected": False,
    "isFocusing": False,
    "isCapturing": False,
    "isRecording": False,
    "roiEnabled": False,
    "currentZ": 10.0,
    "currentZEncoder": 10000,  # 添加编码器值
    "bestZ": 15.5, # 模拟最佳对焦点
    "bestZEncoder": 15500,  # 添加编码器值
    "zRange": {"min": 5.0, "max": 25.0},
    "zRangeEncoder": {"min": 5000, "max": 25000},  # 添加编码器值范围
    "clarity": 0.0,
    "focusStatus": "空闲",  # 简化为"空闲"和"对焦中"两种状态
    "serialNumber": None,
    "configFile": None,
    "savePath": None,
    "cameraName": None,
    "cameraModel": None,
    "properties": {},
    "roiCoords": {"l": 150, "t": 100, "r": 450, "b": 400},
    "selectedAxisId": None,
    "XPosition": 0.0,
    "YPosition": 0.0,
    "ZPosition": 0.0,
    "UPosition": 0.0,
    "XPositionEncoder": 0,  # 添加编码器值
    "YPositionEncoder": 0,  # 添加编码器值
    "ZPositionEncoder": 0,  # 添加编码器值
    "UPositionEncoder": 0,  # 添加编码器值
    "axisLimits": {
        "X": {"min": -100.0, "max": 100.0},
        "Y": {"min": -100.0, "max": 100.0},
        "Z": {"min": 0.0, "max": 50.0},
        "U": {"min": -180.0, "max": 180.0}
    },
    "axisLimitsEncoder": {  # 添加编码器值范围
        "X": {"min": -100000, "max": 100000},
        "Y": {"min": -100000, "max": 100000},
        "Z": {"min": 0, "max": 50000},
        "U": {"min": -180000, "max": 180000}
    },
    # 添加自动对焦参数 - 统一使用编码器值
    "focusParams": {
        "range": 5000,       # 搜索范围(编码器值)
        "step": 500,         # 对焦步进(编码器值)
        "exposure": 5000,
        "gain": 1.0,
        "times": 1,
        "isEncoder": True    # 默认使用编码器值
    },
    # 添加校准相关状态
    "isShowingCalibration": False,
    "calibrationResult": None,
    # 添加标定相关状态
    "isCalibrating": False,
    "markDetected": False,
    "markCentered": False,
    "markPoints": [],
    "lastCapturePosition": None,  # 添加上次拍照位置记录
    "manualFocusPosition": None,
    "manualFocusPositionEncoder": None
}

# --- 标定相关变量 ---
calibration_state = {
    "isCalibrating": False,
    "markDetected": False,
    "markCentered": False,
    "currentPoint": None,
    "totalPoints": 0,
    "completedPoints": 0,
    "markPoints": [],
    "calibrationMatrix": [],
    "failedPoints": [],
    "imageWidth": 640,
    "imageHeight": 480,
    "centerX": 320,
    "centerY": 240
}

# 新增标定用的线程
calibration_thread = None
stop_calibration_flag = Event()

focus_thread = None
stop_focus_flag = Event()

# --- 模拟 PLC 提供的轴数据 ---
simulated_plc_axes = [
    {"id": "1", "name": "轴1", "range_min": -100.0, "range_max": 100.0},
    {"id": "2", "name": "轴2", "range_min": -100.0, "range_max": 100.0},
    {"id": "3", "name": "轴3", "range_min": 0.0, "range_max": 50.0},
    {"id": "4", "name": "轴4", "range_min": -180.0, "range_max": 180.0}
]

# --- 轴ID映射到原始轴名称 ---
axis_id_mapping = {
    "1": "X",
    "2": "Y",
    "3": "Z",
    "4": "U"
}

# --- 辅助函数 ---
def calculate_clarity(z, is_encoder=False):
    """计算清晰度，支持编码器值"""
    if is_encoder:
        z_mm = z / 1000.0  # 将编码器值转换为毫米
        best_z_mm = camera_state["bestZ"]
        diff = z_mm - best_z_mm
        range_mm = camera_state["zRange"]["max"] - camera_state["zRange"]["min"]
    else:
        diff = z - camera_state["bestZ"]
        range_mm = camera_state["zRange"]["max"] - camera_state["zRange"]["min"]
        
    clarity = max(0.0, min(1.0, random.gauss(1.0, 0.05) * (1 - abs(diff) / range_mm * 1.5)))
    return round(clarity, 3)

def simulate_focus_process():
    global camera_state, stop_focus_flag
    try:
        stop_focus_flag.clear()
        camera_state["isFocusing"] = True
        camera_state["focusStatus"] = "对焦中"  # 简化状态显示
        print("后端: 开始自动对焦")
        
        # 应用对焦参数
        focus_params = camera_state["focusParams"]
        
        # 获取当前位置和搜索范围
        current_z_encoder = camera_state["currentZEncoder"] or camera_state["ZPositionEncoder"]
        search_range = focus_params["range"]
        step_size = focus_params["step"]
        
        # 计算起点和终点
        start_z = max(0, current_z_encoder - search_range)
        end_z = current_z_encoder + search_range
        
        print(f"后端: 对焦参数 - 当前Z位置: {current_z_encoder}, 搜索范围: ±{search_range}, 起点: {start_z}, 终点: {end_z}, 对焦步进: {step_size}")
        
        time.sleep(0.2) # 模拟初始化

        if stop_focus_flag.is_set():
            print("后端: 对焦在初始化阶段被停止")
            camera_state["focusStatus"] = "空闲"
            camera_state["isFocusing"] = False
            return

        # 对焦过程 - 简化状态显示
        best_z = start_z
        max_clarity = -1
            
        # 从起点到终点进行线性扫描
        z = start_z
        while z <= end_z:
            if stop_focus_flag.is_set():
                break

            # 更新编码器值和物理值
            camera_state["currentZEncoder"] = round(z)
            camera_state["ZPositionEncoder"] = camera_state["currentZEncoder"]
            camera_state["currentZ"] = round(z / 1000.0, 3)
            camera_state["ZPosition"] = camera_state["currentZ"]
            camera_state["clarity"] = calculate_clarity(z, is_encoder=True)
            
            print(f"后端: 对焦 Z={camera_state['currentZEncoder']}, 清晰度={camera_state['clarity']}")
            
            if camera_state["clarity"] > max_clarity:
                max_clarity = camera_state["clarity"]
                best_z = z
                
            time.sleep(0.1) # 模拟移动和测量时间
            z += step_size
            z = round(z)
        
        if not stop_focus_flag.is_set():
            # 移动到最佳位置
            camera_state["currentZEncoder"] = best_z
            camera_state["ZPositionEncoder"] = best_z
            camera_state["currentZ"] = round(best_z / 1000.0, 3)
            camera_state["ZPosition"] = camera_state["currentZ"]
            camera_state["bestZEncoder"] = best_z
            camera_state["bestZ"] = round(best_z / 1000.0, 3)
            camera_state["clarity"] = calculate_clarity(best_z, is_encoder=True)
            print(f"后端: 自动对焦完成, 最佳 Z = {best_z}(编码器值)")
                
            camera_state["focusStatus"] = "空闲"
        else:
            camera_state["focusStatus"] = "空闲"
        
        camera_state["isFocusing"] = False
        
    except Exception as e:
        print(f"后端: 对焦过程出错: {str(e)}")
        camera_state["focusStatus"] = "空闲"
        camera_state["isFocusing"] = False

def simulate_calibration_process():
    """模拟标定过程"""
    global calibration_state, stop_calibration_flag
    
    try:
        stop_calibration_flag.clear()
        calibration_state["isCalibrating"] = True
        print("后端: 开始标定过程，初始化完成")
        
        # 执行标定过程
        for i in range(calibration_state["totalPoints"]):
            if stop_calibration_flag.is_set():
                print("后端: 标定被中断")
                break
            
            # 获取当前点位
            point = calibration_state["calibrationMatrix"][i]
            calibration_state["currentPoint"] = point
            
            print(f"后端: 标定点位 {i+1}/{calibration_state['totalPoints']} - 坐标: ({point['x']}, {point['y']})")
            
            # 模拟移动到点位
            time.sleep(0.5)
            
            # 模拟拍照和检测过程
            time.sleep(0.2)
            
            # 有95%的成功率
            if random.random() < 0.95:
                calibration_state["completedPoints"] += 1
            else:
                calibration_state["failedPoints"].append(i)
                print(f"后端: 点位 {i+1} 检测失败")
            
            # 更新进度
            print(f"后端: 标定进度 {calibration_state['completedPoints']}/{calibration_state['totalPoints']}")
        
        print(f"后端: 标定点位循环完成，总点数: {calibration_state['totalPoints']}，完成点数: {calibration_state['completedPoints']}")
        
        # 如果未被中断，生成标定结果
        if not stop_calibration_flag.is_set():
            # 模拟计算结果
            print("后端: 开始计算标定结果...")
            time.sleep(1.0)
            
            # 生成随机标定矩阵
            fx = 1200 + random.random() * 100
            fy = 1200 + random.random() * 100
            cx = calibration_state["centerX"] + random.random() * 10 - 5
            cy = calibration_state["centerY"] + random.random() * 10 - 5
            
            k1 = random.random() * 0.1 - 0.05
            k2 = random.random() * 0.05 - 0.025
            p1 = random.random() * 0.01 - 0.005
            p2 = random.random() * 0.01 - 0.005
            k3 = random.random() * 0.01 - 0.005
            
            # 生成标定结果
            calibration_state["calibrationResults"] = {
                "intrinsic": [
                    [fx, 0, cx],
                    [0, fy, cy],
                    [0, 0, 1]
                ],
                "distortion": [k1, k2, p1, p2, k3],
                "reprojectionError": random.random() * 0.5,
                "completedPoints": calibration_state["completedPoints"],
                "totalPoints": calibration_state["totalPoints"],
                "resolution": [calibration_state["imageWidth"], calibration_state["imageHeight"]],
                "timestamp": time.time()
            }
            
            print("后端: 标定完成，结果生成成功")
        else:
            print("后端: 标定被中断，不生成结果")
        
        # 确保标定状态正确更新
        calibration_state["isCalibrating"] = False
        print("后端: 标定过程结束，isCalibrating设置为False")
        
    except Exception as e:
        print(f"后端: 标定过程出错: {str(e)}")
        # 确保出错时也更新状态
        calibration_state["isCalibrating"] = False
        print("后端: 标定出错，isCalibrating设置为False")

# --- API Endpoints ---
@app.route('/connect', methods=['POST'])
def connect_camera():
    global camera_state
    # --- Removed the check: --- 
    # if camera_state["isConnected"]:
    #     return jsonify({"status": "error", "message": "相机已连接"}), 400
    # --- Now, always proceed with connection logic --- 

    print("后端: 收到连接请求 (强制刷新状态)")
    # Stop any ongoing focus if backend thinks it's running but frontend refreshed
    global focus_thread
    if camera_state["isFocusing"] and focus_thread and focus_thread.is_alive():
        stop_focus_flag.set()
        # Give it a moment to stop, but don't block excessively
        focus_thread.join(timeout=0.5) 
        print("后端: 停止了上次残留的对焦进程")

    time.sleep(0.5) # 模拟连接耗时
    
    # --- Always Reset/Initialize state on connect request --- 
    camera_state["isConnected"] = True
    camera_state["serialNumber"] = request.json.get('serialNumber', f'SN_Backend_{random.randint(100,999)}') # Add randomness for demo
    camera_state["configFile"] = "C:/CameraConfigs/backend_sim.cfg"
    camera_state["savePath"] = "D:/Captures/BackendSim/"
    camera_state["cameraName"] = "工业相机 MV-CH120-10GM"
    camera_state["cameraModel"] = "MV-CH120-10GM"
    camera_state["properties"] = {
        '曝光时间(us)': {'type': 'number', 'value': random.randint(5000, 20000), 'min': 10, 'max': 1000000, 'step': 10},
        '增益': {'type': 'number', 'value': round(random.uniform(1.0, 3.0), 1), 'min': 0, 'max': 16, 'step': 0.1},
        '触发模式': {'type': 'select', 'options': ['连续采集', '软件触发'], 'value': '连续采集'},
    }
    # 初始化毫米值位置
    camera_state["currentZ"] = round(random.uniform(camera_state["zRange"]["min"], camera_state["zRange"]["max"]), 2) 
    camera_state["clarity"] = calculate_clarity(camera_state["currentZ"])
    camera_state["focusStatus"] = "空闲"
    camera_state["isFocusing"] = False
    camera_state["isCapturing"] = False
    camera_state["isRecording"] = False
    camera_state["roiEnabled"] = False
    camera_state["selectedAxisId"] = None # Reset axis selection on connect
    
    # 初始化轴位置（毫米值）
    camera_state["XPosition"] = round(random.uniform(-100.0, 100.0), 3)
    camera_state["YPosition"] = round(random.uniform(-100.0, 100.0), 3)
    camera_state["ZPosition"] = round(random.uniform(0.0, 50.0), 3)
    camera_state["UPosition"] = round(random.uniform(-180.0, 180.0), 3)
    
    # 初始化轴位置（编码器值）
    camera_state["XPositionEncoder"] = round(camera_state["XPosition"] * 1000)
    camera_state["YPositionEncoder"] = round(camera_state["YPosition"] * 1000)
    camera_state["ZPositionEncoder"] = round(camera_state["ZPosition"] * 1000)
    camera_state["UPositionEncoder"] = round(camera_state["UPosition"] * 1000)
    camera_state["currentZEncoder"] = round(camera_state["currentZ"] * 1000)
    
    # 初始化上次拍照位置为当前Z轴位置
    camera_state["lastCapturePosition"] = camera_state["currentZEncoder"]
    print(f"后端: 初始化上次拍照位置为 {camera_state['lastCapturePosition']}")
    
    # 显式初始化对焦参数
    camera_state["focusParams"] = {
        "range": 5000,       # 搜索范围(编码器值)
        "step": 500,         # 对焦步进(编码器值)
        "exposure": 5000,
        "gain": 1.0,
        "times": 1,
        "isEncoder": True    # 默认使用编码器值
    }
    # --------------------------------------------------------

    print(f"后端: 相机 {camera_state['serialNumber']} 已连接 (状态已刷新)")
    return jsonify(camera_state) # Return the fresh state

@app.route('/disconnect', methods=['POST'])
def disconnect_camera():
    global camera_state, focus_thread
    if not camera_state["isConnected"]:
        return jsonify({"status": "error", "message": "相机未连接"}), 400

    print(f"后端: 收到断开连接请求 ({camera_state.get('serialNumber', 'N/A')})")
    if camera_state["isFocusing"] and focus_thread and focus_thread.is_alive():
        stop_focus_flag.set() # 发送停止信号
        focus_thread.join(timeout=1.0) # 等待线程结束
    
    # 重置状态
    camera_state = {
        "isConnected": False,
        "isFocusing": False,
        "isCapturing": False,
        "isRecording": False,
        "roiEnabled": False,
        "currentZ": 10.0,
        "bestZ": 15.5,
        "zRange": {"min": 5.0, "max": 25.0},
        "clarity": 0.0,
        "focusStatus": "未连接",
        "serialNumber": None,
        "configFile": None,
        "savePath": None,
        "cameraName": "",  # 清空相机名称
        "cameraModel": "",  # 清空相机型号
        "properties": {},
        "roiCoords": {"l": 150, "t": 100, "r": 450, "b": 400},
        "selectedAxisId": None,
        "XPosition": 0.0,
        "YPosition": 0.0,
        "ZPosition": 0.0,
        "UPosition": 0.0,
        "XPositionEncoder": 0,  # 添加编码器值
        "YPositionEncoder": 0,  # 添加编码器值
        "ZPositionEncoder": 0,  # 添加编码器值
        "UPositionEncoder": 0,  # 添加编码器值
        "axisLimits": {
            "X": {"min": -100.0, "max": 100.0},
            "Y": {"min": -100.0, "max": 100.0},
            "Z": {"min": 0.0, "max": 50.0},
            "U": {"min": -180.0, "max": 180.0}
        },
        "axisLimitsEncoder": {  # 添加编码器值范围
            "X": {"min": -100000, "max": 100000},
            "Y": {"min": -100000, "max": 100000},
            "Z": {"min": 0, "max": 50000},
            "U": {"min": -180000, "max": 180000}
        },
        # 添加自动对焦参数
        "focusParams": {
            "range": 5000,       # 搜索范围(编码器值)
            "step": 500,         # 对焦步进(编码器值)
            "exposure": 5000,
            "gain": 1.0,
            "times": 1,
            "isEncoder": True    # 默认使用编码器值
        },
        # 添加校准相关状态
        "isShowingCalibration": False,
        "calibrationResult": None,
        # 添加标定相关状态
        "isCalibrating": False,
        "markDetected": False,
        "markCentered": False,
        "markPoints": [],
        "lastCapturePosition": None,  # 添加上次拍照位置
        "manualFocusPosition": None,
        "manualFocusPositionEncoder": None
    }
    print("后端: 相机已断开")
    return jsonify(camera_state)

@app.route('/status', methods=['GET'])
def get_status():
    global camera_state
    # 只在对焦过程中更新清晰度
    if camera_state["isConnected"]:
        if camera_state["isFocusing"]:
            camera_state["clarity"] = calculate_clarity(camera_state["currentZ"])
        
        # 模拟轴位置的微小随机变化，但排除Z轴
        if random.random() < 0.1:  # 10%的概率发生变化
            axis = random.choice(['X', 'Y', 'U'])  # 移除Z轴，避免影响清晰度
            current_pos = camera_state[f"{axis}Position"]
            delta = random.uniform(-0.001, 0.001)  # 非常小的随机变化
            
            # 根据不同轴的范围限制位置
            if axis == 'X' or axis == 'Y':
                new_pos = max(-100.0, min(100.0, current_pos + delta))
            else:  # U轴
                new_pos = max(-180.0, min(180.0, current_pos + delta))
            
            camera_state[f"{axis}Position"] = round(new_pos, 3)
    
    return jsonify(camera_state)

@app.route('/start_focus', methods=['POST'])
def start_focus():
    """开始自动对焦"""
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    if camera_state["isFocusing"]:
        return jsonify({"success": False, "message": "已经在对焦中"}), 400
    
    data = request.json
    
    try:
        # 更新对焦参数
        camera_state["focusParams"]["range"] = int(data.get('range', 5000))
        camera_state["focusParams"]["step"] = int(data.get('step', 500))
        camera_state["focusParams"]["exposure"] = int(data.get('exposure', 5000))
        camera_state["focusParams"]["gain"] = float(data.get('gain', 1.0))
        camera_state["focusParams"]["times"] = int(data.get('times', 1))
        camera_state["focusParams"]["isEncoder"] = True  # 始终使用编码器值
        
        # 启动自动对焦线程
        Thread(target=simulate_focus_process).start()
        
        return jsonify({"success": True, "status": camera_state})
    except Exception as e:
        print(f"启动自动对焦出错: {str(e)}")
        return jsonify({"success": False, "message": f"启动自动对焦出错: {str(e)}"}), 500

@app.route('/stop_focus', methods=['POST'])
def stop_focus():
    global camera_state, focus_thread, stop_focus_flag
    if not camera_state["isFocusing"]:
        return jsonify({"status": "error", "message": "不在对焦中"}), 400

    print("后端: 收到停止对焦请求")
    stop_focus_flag.set()
    if focus_thread and focus_thread.is_alive():
        focus_thread.join(timeout=1.0)  # 等待线程结束，但最多等待1秒
    
    # 强制更新状态
    camera_state["isFocusing"] = False
    if camera_state["focusStatus"] not in ["已对焦", "空闲", "错误", "未连接"]:
        camera_state["focusStatus"] = "已停止"
    
    return jsonify(camera_state)  # 返回完整状态

# --- 简单的采集/录制等动作模拟 ---
@app.route('/start_capture', methods=['POST'])
def start_capture():
    if not camera_state["isConnected"] or camera_state["isFocusing"]: return jsonify({"status": "error"}), 400
    camera_state["isCapturing"] = True
    camera_state["isRecording"] = False # 假设采集和录制互斥
    print("后端: 开始连续采集")
    return jsonify({"status": "ok"})

@app.route('/stop_capture', methods=['POST'])
def stop_capture():
    if not camera_state["isConnected"]: return jsonify({"status": "error"}), 400
    camera_state["isCapturing"] = False
    camera_state["isRecording"] = False
    print("后端: 停止采集/录制")
    return jsonify({"status": "ok"})

@app.route('/single_shot', methods=['POST'])
def single_shot():
    if not camera_state["isConnected"] or camera_state["isFocusing"] or camera_state["isCapturing"] or camera_state["isRecording"]: return jsonify({"status": "error"}), 400
    print("后端: 执行单张拍照")
    
    # 记录当前Z轴位置作为上次拍照位置
    camera_state["lastCapturePosition"] = camera_state["currentZEncoder"]
    print(f"后端: 更新上次拍照位置为 {camera_state['lastCapturePosition']}")
    
    # 可以在这里模拟保存文件等
    time.sleep(0.1) # 模拟耗时
    return jsonify({"status": "ok"})

@app.route('/start_recording', methods=['POST'])
def start_recording():
    if not camera_state["isConnected"] or camera_state["isFocusing"]: return jsonify({"status": "error"}), 400
    camera_state["isRecording"] = True
    camera_state["isCapturing"] = False # 假设采集和录制互斥
    print("后端: 开始录制")
    return jsonify({"status": "ok"})

@app.route('/software_trigger', methods=['POST'])
def software_trigger():
     if not camera_state["isConnected"] or camera_state["isFocusing"] or camera_state["isCapturing"] or camera_state["isRecording"]: return jsonify({"status": "error"}), 400
     print("后端: 收到软件触发")
     time.sleep(0.05) # 模拟耗时
     return jsonify({"status": "ok"})

# --- ROI 模拟 ---
@app.route('/toggle_roi', methods=['POST'])
def toggle_roi():
    if not camera_state["isConnected"] or camera_state["isFocusing"]: return jsonify({"status": "error"}), 400
    camera_state["roiEnabled"] = not camera_state["roiEnabled"]
    print(f"后端: ROI 状态切换为: {camera_state['roiEnabled']}")
    # 如果需要，可以接收前端传来的ROI坐标并更新 state['roiCoords']
    # data = request.json
    # if data and 'roiCoords' in data:
    #     camera_state['roiCoords'] = data['roiCoords']
    return jsonify({"status": "ok", "roiEnabled": camera_state["roiEnabled"]})

@app.route('/update_roi', methods=['POST'])
def update_roi():
    """更新ROI设置"""
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    data = request.json
    if not data:
        return jsonify({"success": False, "message": "无效的ROI数据"}), 400
    
    # 直接接收ROI坐标(l, t, r, b格式)
    if isinstance(data, dict) and all(k in data for k in ['l', 't', 'r', 'b']):
        camera_state["roiCoords"] = data
        camera_state["roiEnabled"] = True
        print(f"后端: ROI已更新 - 坐标: {camera_state['roiCoords']}")
        return jsonify({"success": True})
    else:
        # 向后兼容的处理方式
        camera_state["roiEnabled"] = data.get('enabled', False)
        if 'coords' in data and data['coords']:
            camera_state["roiCoords"] = data['coords']
        
        print(f"后端: ROI已更新(兼容模式) - 启用状态: {camera_state['roiEnabled']}, 坐标: {camera_state['roiCoords']}")
        return jsonify({"success": True})

@app.route('/clear_roi', methods=['POST'])
def clear_roi():
    """清除ROI设置"""
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    camera_state["roiEnabled"] = False
    camera_state["roiCoords"] = {"l": 150, "t": 100, "r": 450, "b": 400}  # 重置为默认值
    
    print("后端: ROI已清除")
    return jsonify({"success": True})

# --- 属性更改模拟 ---
@app.route('/set_property', methods=['POST'])
def set_property():
    if not camera_state["isConnected"] or camera_state["isFocusing"]: return jsonify({"status": "error", "message": "相机未连接或正忙"}), 400
    
    data = request.json
    prop_name = data.get('name')
    prop_value = data.get('value')

    if not prop_name or prop_value is None:
        return jsonify({"status": "error", "message": "缺少属性名称或值"}), 400

    if prop_name in camera_state["properties"]:
        # 这里可以添加类型验证和范围检查
        camera_state["properties"][prop_name]['value'] = prop_value
        print(f"后端: 属性 '{prop_name}' 更新为 {prop_value}")
        return jsonify({"status": "ok", "name": prop_name, "value": prop_value})
    else:
        return jsonify({"status": "error", "message": f"未知属性: {prop_name}"}), 404

@app.route('/api/axes', methods=['GET'])
def get_axes():
    """模拟从 PLC 获取可用轴列表"""
    print("后端: 提供模拟轴列表")
    # 在实际应用中，这里会包含与PLC通信获取数据的逻辑
    return jsonify(simulated_plc_axes)

@app.route('/set_axis_config', methods=['POST'])
def set_axis_config():
    """模拟将选择的轴配置保存到 PLC"""
    if not camera_state["isConnected"]:
        return jsonify({"status": "error", "message": "相机未连接"}), 400

    data = request.json
    axis_id = data.get('axisId')
    camera_sn = data.get('cameraSN') # 获取是哪个相机

    if not axis_id or not camera_sn:
         return jsonify({"status": "error", "message": "缺少 axisId 或 cameraSN"}), 400
    
    # 验证 axis_id 是否在可用列表中
    if not any(axis['id'] == axis_id for axis in simulated_plc_axes):
         return jsonify({"status": "error", "message": f"无效的轴 ID: {axis_id}"}), 400

    # 更新状态 (模拟保存到PLC)
    camera_state['selectedAxisId'] = axis_id
    print(f"后端: 模拟保存相机 '{camera_sn}' 的轴配置为 ID: {axis_id} (轴{axis_id})")
    
    # 返回成功状态和当前配置
    return jsonify({"status": "ok", "selectedAxisId": axis_id})

@app.route('/jog_axis', methods=['POST'])
def jog_axis():
    global camera_state
    if not camera_state["isConnected"]:
        return jsonify({"status": "error", "message": "相机未连接"}), 400
    
    data = request.json
    axis_id = data.get('axis')
    step = data.get('step')
    is_encoder = data.get('isEncoder', False)  # 确认是否使用编码器值
    
    if not axis_id or step is None:
        return jsonify({"status": "error", "message": "缺少必要参数"}), 400
    
    # 如果是数字ID，转换为原始轴名称
    axis_name = axis_id_mapping.get(axis_id, axis_id)
    
    # 获取当前位置
    if is_encoder:
        current_pos = camera_state[f"{axis_name}PositionEncoder"]
        
        # 根据不同轴确定限制范围
        if axis_name in ['X', 'Y']:
            min_limit = -100000
            max_limit = 100000
        elif axis_name == 'Z':
            min_limit = 0
            max_limit = 50000
        else:  # U轴
            min_limit = -180000
            max_limit = 180000
    else:
        current_pos = camera_state[f"{axis_name}Position"]
        
        # 根据不同轴确定限制范围
        if axis_name in ['X', 'Y']:
            min_limit = -100.0
            max_limit = 100.0
        elif axis_name == 'Z':
            min_limit = 0.0
            max_limit = 50.0
        else:  # U轴
            min_limit = -180.0
            max_limit = 180.0
    
    # 计算新位置
    new_pos = current_pos + step
    
    # 检查限制
    if new_pos < min_limit or new_pos > max_limit:
        return jsonify({"status": "error", "message": f"轴{axis_id}超出范围限制"}), 400
    
    # 更新位置
    if is_encoder:
        camera_state[f"{axis_name}PositionEncoder"] = round(new_pos)
        # 同时更新毫米值
        camera_state[f"{axis_name}Position"] = round(new_pos / 1000.0, 3)
        
        # 如果是Z轴移动，同时更新currentZ和清晰度
        if axis_name == 'Z':
            camera_state["currentZEncoder"] = round(new_pos)
            camera_state["currentZ"] = round(new_pos / 1000.0, 3)
            camera_state["clarity"] = calculate_clarity(new_pos, is_encoder=True)
    else:
        camera_state[f"{axis_name}Position"] = round(new_pos, 3)
        # 同时更新编码器值
        camera_state[f"{axis_name}PositionEncoder"] = round(new_pos * 1000)
        
        # 如果是Z轴移动，同时更新currentZ和清晰度
        if axis_name == 'Z':
            camera_state["currentZ"] = new_pos
            camera_state["currentZEncoder"] = round(new_pos * 1000)
            camera_state["clarity"] = calculate_clarity(new_pos)
    
    # 输出日志，标明是使用编码器值还是毫米值
    if is_encoder:
        print(f"后端: 轴{axis_id}点动 {step:+} 编码器单位, 新位置: {new_pos}(编码器值)")
    else:
        print(f"后端: 轴{axis_id}点动 {step:+.3f}mm, 新位置: {new_pos:.3f}mm")
        
    return jsonify(camera_state)

@app.route('/save_axis_config', methods=['POST'])
def save_axis_config():
    if not camera_state["isConnected"]:
        return jsonify({"status": "error", "message": "相机未连接"}), 400
    
    data = request.json
    axis_id = data.get('axis')
    config = data.get('config')
    limits = data.get('limits')
    
    if not all([axis_id, config, limits]):
        return jsonify({"status": "error", "message": "缺少必要参数"}), 400
    
    # 转换为原始轴名称
    axis_name = axis_id_mapping.get(axis_id, axis_id)
    
    # 验证轴
    if axis_name not in ['X', 'Y', 'Z', 'U']:
        return jsonify({"status": "error", "message": "无效的轴"}), 400
    
    # 验证配置参数
    try:
        ratio = float(config['ratio'])
        backlash = float(config['backlash'])
        speed = float(config['speed'])
        acc = float(config['acc'])
        min_limit = float(limits['min'])
        max_limit = float(limits['max'])
        
        # 验证参数范围
        if ratio <= 0 or backlash < 0 or speed <= 0 or acc <= 0:
            raise ValueError("参数必须为正数")
        if min_limit >= max_limit:
            raise ValueError("最小限位必须小于最大限位")
            
    except (ValueError, KeyError) as e:
        return jsonify({"status": "error", "message": f"参数无效: {str(e)}"}), 400
    
    # 更新轴配置（这里只是模拟，实际应用中需要与运动控制系统交互）
    camera_state["axisLimits"][axis_name] = {"min": min_limit, "max": max_limit}
    
    print(f"后端: 已保存轴{axis_id}配置 - 当量:{ratio}, 间隙:{backlash}, 速度:{speed}, 加速度:{acc}")
    print(f"后端: 轴{axis_id}限位更新为 [{min_limit}, {max_limit}]")
    
    return jsonify({
        "status": "ok",
        "message": f"轴{axis_id}配置已保存",
        "axis": axis_id,
        "config": config,
        "limits": camera_state["axisLimits"][axis_name]
    })

# 添加文件选择和路径相关的API端点
@app.route('/select_config', methods=['POST'])
def select_config():
    """模拟选择配置文件"""
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    # 在实际应用中，这里应该调用系统的文件选择对话框
    # 这里仅作模拟
    config_path = "C:/CameraConfigs/camera_settings.cfg"
    return jsonify({
        "success": True,
        "path": config_path
    })

@app.route('/select_save_path', methods=['POST'])
def select_save_path():
    """模拟选择保存路径"""
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    # 在实际应用中，这里应该调用系统的文件夹选择对话框
    # 这里仅作模拟
    save_path = "D:/CameraCaptures/"
    return jsonify({
        "success": True,
        "path": save_path
    })

@app.route('/update_config', methods=['POST'])
def update_config():
    """更新相机配置"""
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    config_path = request.json.get('configPath')
    if not config_path:
        return jsonify({"success": False, "message": "无效的配置文件路径"}), 400
    
    # 更新相机配置
    camera_state["configFile"] = config_path
    print(f"后端: 已更新相机配置文件路径: {config_path}")
    
    # 模拟加载配置文件后的相机参数变化
    camera_state["properties"].update({
        '曝光时间(us)': {'type': 'number', 'value': 10000, 'min': 10, 'max': 1000000, 'step': 10},
        '增益': {'type': 'number', 'value': 1.0, 'min': 0, 'max': 16, 'step': 0.1},
    })
    
    return jsonify(camera_state)

@app.route('/update_save_path', methods=['POST'])
def update_save_path():
    """更新保存路径"""
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    save_path = request.json.get('savePath')
    if not save_path:
        return jsonify({"success": False, "message": "无效的保存路径"}), 400
    
    # 更新保存路径
    camera_state["savePath"] = save_path
    print(f"后端: 已更新图像保存路径: {save_path}")
    
    return jsonify(camera_state)

@app.route('/update_focus_params', methods=['POST'])
def update_focus_params():
    """更新自动对焦参数"""
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    if camera_state["isFocusing"]:
        return jsonify({"success": False, "message": "正在对焦中，无法更改参数"}), 400
    
    data = request.json
    try:
        # 处理搜索范围和颗粒度参数
        range_value = int(data.get('range', 5000))
        step_value = int(data.get('step', 500))
        
        # 更新相关参数
        camera_state["focusParams"]["range"] = range_value
        camera_state["focusParams"]["step"] = step_value
        camera_state["focusParams"]["exposure"] = int(data.get('exposure', 5000))
        camera_state["focusParams"]["gain"] = float(data.get('gain', 1.0))
        camera_state["focusParams"]["times"] = int(data.get('times', 1))
        camera_state["focusParams"]["isEncoder"] = True  # 始终使用编码器值
        
        return jsonify({"success": True, "focusParams": camera_state["focusParams"]})
    except Exception as e:
        print(f"更新对焦参数出错: {str(e)}")
        return jsonify({"success": False, "message": f"更新对焦参数出错: {str(e)}"}), 500

# --- 校准和当量计算相关 ---
def generate_calibration_pattern(width=600, height=600, square_size=50):
    """生成黑白方格校准图案"""
    # 创建白色背景
    image = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(image)
    
    # 计算行列数
    rows = height // square_size
    cols = width // square_size
    
    # 绘制方格
    for i in range(rows + 1):
        for j in range(cols + 1):
            if (i + j) % 2 == 0:
                x1 = j * square_size
                y1 = i * square_size
                x2 = x1 + square_size
                y2 = y1 + square_size
                draw.rectangle([x1, y1, x2, y2], fill='black')
    
    # 绘制交点标记
    point_radius = 3
    for i in range(1, rows):
        for j in range(1, cols):
            x = j * square_size
            y = i * square_size
            # 在交点绘制红色圆点
            draw.ellipse([x-point_radius, y-point_radius, x+point_radius, y+point_radius], fill='red')
    
    # 转换为二进制数据
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    buffer.seek(0)
    
    # 转换为base64字符串
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

@app.route('/generate_calibration_image', methods=['GET'])
def get_calibration_image():
    """生成并返回校准图像"""
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    # 从查询参数获取方格大小或使用默认值
    square_size = int(request.args.get('square_size', 50))
    width = 600
    height = 600
    
    # 生成黑白方格图像
    image_data = generate_calibration_pattern(width, height, square_size)
    
    # 记录当前显示校准图像状态
    camera_state["isShowingCalibration"] = True
    
    # 返回图像数据
    return jsonify({
        "success": True,
        "image": image_data,
        "width": width,
        "height": height,
        "squareSize": square_size
    })

@app.route('/hide_calibration_image', methods=['POST'])
def hide_calibration_image():
    """隐藏校准图像，返回相机图像"""
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    # 更新状态
    camera_state["isShowingCalibration"] = False
    
    return jsonify({
        "success": True
    })

@app.route('/calculate_ratio', methods=['POST'])
def calculate_ratio():
    """计算像素与物理尺寸的比例（当量）"""
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    data = request.json
    if not data:
        return jsonify({"success": False, "message": "无效的数据"}), 400
    
    # 获取方格实际尺寸（毫米）
    square_size_mm = float(data.get('squareSizeMm', 1.0))
    
    # 从校准ROI获取像素尺寸信息
    # 这里简单模拟一个计算结果
    pixels_per_square = random.randint(40, 60)  # 模拟每个方格的像素数
    ratio = pixels_per_square / square_size_mm
    
    # 更新当量计算结果
    camera_state["calibrationResult"] = {
        "ratio": ratio,
        "pixelsPerSquare": pixels_per_square,
        "squareSizeMm": square_size_mm
    }
    
    print(f"后端: 当量计算完成 - {ratio:.2f} 像素/毫米")
    
    return jsonify({
        "success": True,
        "ratio": ratio,
        "unit": "像素/毫米"
    })

# --- 标定相关API ---
@app.route('/detect_mark', methods=['POST'])
def detect_mark():
    """模拟检测Mark点"""
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    print("后端: 收到检测Mark点请求")
    
    # 生成随机Mark点位置
    offsetX = random.randint(-100, 100)
    offsetY = random.randint(-100, 100)
    markX = calibration_state["centerX"] + offsetX
    markY = calibration_state["centerY"] + offsetY
    confidence = 0.85 + random.random() * 0.14
    
    # 更新标定状态
    calibration_state["markDetected"] = True
    calibration_state["markPoints"] = [{
        "x": markX,
        "y": markY,
        "confidence": confidence
    }]
    calibration_state["markPosition"] = {"x": markX, "y": markY}
    
    print(f"后端: 检测到Mark点 - 位置: ({markX}, {markY}), 置信度: {confidence:.2f}")
    
    return jsonify({
        "success": True,
        "markPoints": calibration_state["markPoints"],
        "message": f"检测成功 (置信度: {confidence:.2f})"
    })

@app.route('/center_mark', methods=['POST'])
def center_mark():
    """模拟居中Mark点"""
    if not camera_state["isConnected"] or not calibration_state["markDetected"]:
        return jsonify({"success": False, "message": "相机未连接或未检测Mark点"}), 400
    
    print("后端: 收到居中Mark点请求")
    
    # 获取当前Mark点
    mark_point = calibration_state["markPoints"][0]
    
    # 计算偏移量
    offsetX = mark_point["x"] - calibration_state["centerX"]
    offsetY = mark_point["y"] - calibration_state["centerY"]
    
    # 模拟移动延迟
    time.sleep(0.5)
    
    # 添加小偏移量模拟实际情况
    smallOffsetX = random.uniform(-5, 5)
    smallOffsetY = random.uniform(-5, 5)
    
    # 更新Mark点位置
    calibration_state["markPosition"] = {
        "x": calibration_state["centerX"] + smallOffsetX,
        "y": calibration_state["centerY"] + smallOffsetY
    }
    calibration_state["markCentered"] = True
    
    print(f"后端: Mark点已居中 - 新位置: ({calibration_state['markPosition']['x']}, {calibration_state['markPosition']['y']})")
    
    return jsonify({
        "success": True,
        "position": calibration_state["markPosition"],
        "message": "居中完成(有小偏移)"
    })

@app.route('/start_calibration', methods=['POST'])
def start_calibration():
    """开始标定"""
    global calibration_state, calibration_thread, stop_calibration_flag
    
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    if not calibration_state["markCentered"]:
        return jsonify({"success": False, "message": "请先检测并居中Mark点"}), 400
    
    if calibration_state["isCalibrating"]:
        return jsonify({"success": False, "message": "标定已在进行中"}), 400
    
    # 获取标定参数
    data = request.json
    size = int(data.get('size', 3))
    offset = float(data.get('offset', 10.0))
    
    print(f"后端: 收到开始标定请求 - 矩阵大小: {size}×{size}, 偏移: {offset}mm")
    
    # 生成标定矩阵
    calibration_state["calibrationMatrix"] = []
    center = size // 2
    
    for y in range(size):
        for x in range(size):
            xPos = (x - center) * offset
            yPos = (y - center) * offset
            pointIndex = y * size + x
            
            calibration_state["calibrationMatrix"].append({
                "x": xPos,
                "y": yPos,
                "index": pointIndex,
                "row": y,
                "col": x
            })
    
    calibration_state["totalPoints"] = size * size
    calibration_state["completedPoints"] = 0
    calibration_state["failedPoints"] = []
    calibration_state["currentPoint"] = None
    calibration_state["calibrationResults"] = None
    
    # 启动标定线程
    stop_calibration_flag.clear()
    calibration_thread = Thread(target=simulate_calibration_process, daemon=True)
    calibration_thread.start()
    
    return jsonify({
        "success": True,
        "message": "标定已开始",
        "totalPoints": calibration_state["totalPoints"]
    })

@app.route('/stop_calibration', methods=['POST'])
def stop_calibration():
    """停止标定"""
    global calibration_state, stop_calibration_flag
    
    if not calibration_state["isCalibrating"]:
        return jsonify({"success": False, "message": "没有正在进行的标定"}), 400
    
    print("后端: 收到停止标定请求")
    
    # 发送停止信号
    stop_calibration_flag.set()
    
    # 等待线程结束
    if calibration_thread and calibration_thread.is_alive():
        calibration_thread.join(timeout=1.0)
    
    # 强制更新状态
    calibration_state["isCalibrating"] = False
    
    return jsonify({
        "success": True,
        "message": "标定已停止",
        "completedPoints": calibration_state["completedPoints"],
        "totalPoints": calibration_state["totalPoints"]
    })

@app.route('/calibration_status', methods=['GET'])
def get_calibration_status():
    """获取标定状态"""
    return jsonify({
        "isCalibrating": calibration_state["isCalibrating"],
        "markDetected": calibration_state["markDetected"],
        "markCentered": calibration_state["markCentered"],
        "currentPoint": calibration_state["currentPoint"],
        "completedPoints": calibration_state["completedPoints"],
        "totalPoints": calibration_state["totalPoints"],
        "failedPoints": calibration_state["failedPoints"],
        "calibrationResults": calibration_state["calibrationResults"]
    })

@app.route('/generate_mark_image', methods=['GET'])
def generate_mark_image():
    """生成带Mark点的图像"""
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    # 获取Mark点位置
    markX = request.args.get('markX', type=float)
    markY = request.args.get('markY', type=float)
    markSize = request.args.get('markSize', 8, type=int)
    
    if markX is None or markY is None:
        # 如果未指定位置，使用当前标定位置或中心点
        if calibration_state["markPosition"]:
            markX = calibration_state["markPosition"]["x"]
            markY = calibration_state["markPosition"]["y"]
        else:
            markX = calibration_state["centerX"]
            markY = calibration_state["centerY"]
    
    # 创建图像
    image = Image.new('RGB', (calibration_state["imageWidth"], calibration_state["imageHeight"]), color='white')
    draw = ImageDraw.Draw(image)
    
    # 添加网格线
    for y in range(0, calibration_state["imageHeight"], 50):
        draw.line([(0, y), (calibration_state["imageWidth"], y)], fill='#DDDDDD')
    
    for x in range(0, calibration_state["imageWidth"], 50):
        draw.line([(x, 0), (x, calibration_state["imageHeight"])], fill='#DDDDDD')
    
    # 添加中心十字线
    draw.line([(0, calibration_state["centerY"]), (calibration_state["imageWidth"], calibration_state["centerY"])], fill='#FFAAAA', width=1)
    draw.line([(calibration_state["centerX"], 0), (calibration_state["centerX"], calibration_state["imageHeight"])], fill='#FFAAAA', width=1)
    
    # 绘制Mark点
    draw.ellipse([markX-markSize, markY-markSize, markX+markSize, markY+markSize], fill='black')
    
    # 在Mark点处添加十字线
    draw.line([(0, markY), (calibration_state["imageWidth"], markY)], fill='#AAAAAA', width=1)
    draw.line([(markX, 0), (markX, calibration_state["imageHeight"])], fill='#AAAAAA', width=1)
    
    # 转换为二进制数据
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    buffer.seek(0)
    
    # 转换为base64字符串
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return jsonify({
        "success": True,
        "image": f"data:image/png;base64,{img_str}",
        "markPosition": {
            "x": markX,
            "y": markY
        }
    })

@app.route('/save_focus_position', methods=['POST'])
def save_focus_position():
    """保存当前Z轴位置作为手动对焦位置"""
    if not camera_state["isConnected"]:
        return jsonify({"success": False, "message": "相机未连接"}), 400
    
    try:
        # 获取当前轴ID
        data = request.json
        axis_id = data.get('axisId', '3')  # 默认Z轴
        axis_name = None
        
        # 查找轴名称
        for key, value in axis_id_mapping.items():
            if key == axis_id:
                axis_name = value
                break
        
        if not axis_name:
            return jsonify({"success": False, "message": "无效的轴ID"}), 400
            
        # 保存当前位置
        position = camera_state[f"{axis_name}Position"]
        position_encoder = camera_state[f"{axis_name}PositionEncoder"]
        
        # 记录为手动对焦位置
        camera_state["manualFocusPosition"] = position
        camera_state["manualFocusPositionEncoder"] = position_encoder
        
        print(f"后端: 保存手动对焦位置 - {axis_name}轴 {position}mm ({position_encoder}编码器值)")
        
        return jsonify({
            "success": True, 
            "message": f"已保存{axis_name}轴位置作为手动对焦位置",
            "position": position,
            "positionEncoder": position_encoder
        })
    except Exception as e:
        print(f"保存对焦位置出错: {str(e)}")
        return jsonify({"success": False, "message": f"保存对焦位置出错: {str(e)}"}), 500

if __name__ == '__main__':
    # 使用 0.0.0.0 允许外部访问，端口可以自定义
    app.run(host='0.0.0.0', port=5000, debug=True) 