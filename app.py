from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import time
import threading
import random

app = Flask(__name__)
CORS(app)  # 允许所有来源的跨域请求

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_file(path)

# --- 模拟状态 ---
camera_state = {
    "isConnected": False,
    "isFocusing": False,
    "isCapturing": False,
    "isRecording": False,
    "roiEnabled": False,
    "currentZ": 10.0,
    "bestZ": 15.5, # 模拟最佳对焦点
    "zRange": {"min": 5.0, "max": 25.0},
    "clarity": 0.0,
    "focusStatus": "未连接",
    "serialNumber": None,
    "configFile": None,
    "savePath": None,
    "cameraName": None,
    "cameraModel": None,
    "properties": {},
    "roiCoords": {"l": 150, "t": 100, "r": 450, "b": 400},
    "selectedAxisId": None
}

focus_thread = None
stop_focus_flag = threading.Event()

# --- 模拟 PLC 提供的轴数据 ---
simulated_plc_axes = [
    {"id": "Z1", "name": "主Z轴", "range_min": 5.0, "range_max": 25.0},
    {"id": "Z2", "name": "副Z轴-A", "range_min": 0.0, "range_max": 20.0},
    {"id": "Z3", "name": "Z轴-工位2", "range_min": 10.0, "range_max": 30.0},
    {"id": "Z4", "name": "龙门Z轴", "range_min": 0.0, "range_max": 50.0}
]

# --- 辅助函数 ---
def calculate_clarity(z):
    diff = z - camera_state["bestZ"]
    focus_sharpness = 2.0
    clarity = max(0.0, min(1.0, random.gauss(1.0, 0.05) * (1 - abs(diff) / (camera_state["zRange"]["max"] - camera_state["zRange"]["min"]) * 1.5))) # 添加随机性并确保在0-1之间
    # 指数衰减模型 - 可以替代上面的线性衰减
    # clarity = max(0.0, min(1.0, random.gauss(1.0, 0.02) * math.exp(-(diff * diff) / (2 * focus_sharpness * focus_sharpness))))
    return round(clarity, 3)

def simulate_focus_process():
    global camera_state
    stop_focus_flag.clear()
    camera_state["isFocusing"] = True
    camera_state["focusStatus"] = "初始化/检查"
    print("后端: 开始自动对焦")
    time.sleep(0.2) # 模拟初始化

    if stop_focus_flag.is_set():
        print("后端: 对焦在初始化阶段被停止")
        camera_state["focusStatus"] = "已停止"
        camera_state["isFocusing"] = False
        return

    # 模拟粗对焦
    camera_state["focusStatus"] = "粗对焦中"
    best_z_rough = camera_state["zRange"]["min"]
    max_clarity_rough = -1

    z = camera_state["zRange"]["min"]
    while z <= camera_state["zRange"]["max"]:
        if stop_focus_flag.is_set():
             print("后端: 对焦在粗对焦阶段被停止")
             camera_state["focusStatus"] = "已停止"
             camera_state["isFocusing"] = False
             return
        camera_state["currentZ"] = round(z, 2)
        camera_state["clarity"] = calculate_clarity(z)
        print(f"后端: 粗扫 Z={camera_state['currentZ']}, 清晰度={camera_state['clarity']}")
        if camera_state["clarity"] > max_clarity_rough:
            max_clarity_rough = camera_state["clarity"]
            best_z_rough = camera_state["currentZ"]
        time.sleep(0.1) # 模拟移动和测量时间
        z += 1.0 # 粗步进

    print(f"后端: 粗对焦峰值 Z ≈ {best_z_rough}")

    # 模拟精细对焦
    camera_state["focusStatus"] = "精细对焦中"
    best_z_fine = best_z_rough
    max_clarity_fine = -1
    fine_start = max(camera_state["zRange"]["min"], best_z_rough - 1.0)
    fine_end = min(camera_state["zRange"]["max"], best_z_rough + 1.0)
    z = fine_start
    while z <= fine_end:
        if stop_focus_flag.is_set():
             print("后端: 对焦在精细对焦阶段被停止")
             camera_state["focusStatus"] = "已停止"
             camera_state["isFocusing"] = False
             return
        camera_state["currentZ"] = round(z, 2)
        camera_state["clarity"] = calculate_clarity(z)
        print(f"后端: 精扫 Z={camera_state['currentZ']}, 清晰度={camera_state['clarity']}")
        if camera_state["clarity"] > max_clarity_fine:
            max_clarity_fine = camera_state["clarity"]
            best_z_fine = camera_state["currentZ"]
        time.sleep(0.08) # 模拟移动和测量时间
        z += 0.1 # 精步进
        z = round(z, 2) # 避免浮点数累积误差

    camera_state["currentZ"] = best_z_fine
    camera_state["clarity"] = calculate_clarity(best_z_fine)
    camera_state["bestZ"] = best_z_fine # 更新实际的最佳Z点（模拟学习）
    print(f"后端: 精细对焦完成, 最佳 Z = {best_z_fine}")
    
    # 移动到最佳位置并完成
    camera_state["focusStatus"] = "移动到最佳位置"
    time.sleep(0.1)
    camera_state["focusStatus"] = "保存参数中"
    time.sleep(0.1)
    camera_state["focusStatus"] = "已对焦"
    print("后端: 自动对焦完成")
    
    time.sleep(2) # 短暂停留"已对焦"状态
    if not stop_focus_flag.is_set() and camera_state["focusStatus"] == "已对焦":
         camera_state["focusStatus"] = "空闲" # 自动转为空闲

    camera_state["isFocusing"] = False


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
    camera_state["cameraName"] = f"模拟相机 {camera_state['serialNumber']}"
    camera_state["cameraModel"] = "FlaskSim v1.0"
    camera_state["properties"] = {
        '曝光时间(us)': {'type': 'number', 'value': random.randint(5000, 20000), 'min': 10, 'max': 1000000, 'step': 10},
        '增益': {'type': 'number', 'value': round(random.uniform(1.0, 3.0), 1), 'min': 0, 'max': 16, 'step': 0.1},
        '触发模式': {'type': 'select', 'options': ['连续采集', '软件触发'], 'value': '连续采集'},
    }
    camera_state["currentZ"] = round(random.uniform(camera_state["zRange"]["min"], camera_state["zRange"]["max"]), 2) 
    camera_state["clarity"] = calculate_clarity(camera_state["currentZ"])
    camera_state["focusStatus"] = "空闲"
    camera_state["isFocusing"] = False
    camera_state["isCapturing"] = False
    camera_state["isRecording"] = False
    camera_state["roiEnabled"] = False
    camera_state["selectedAxisId"] = None # Reset axis selection on connect
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
        "isConnected": False, "isFocusing": False, "isCapturing": False, "isRecording": False,
        "roiEnabled": False, "currentZ": 10.0, "bestZ": 15.5, # 可以保留上次的最佳Z
        "zRange": {"min": 5.0, "max": 25.0}, "clarity": 0.0, "focusStatus": "未连接",
        "serialNumber": None, "configFile": None, "savePath": None, "cameraName": None,
        "cameraModel": None, "properties": {}, "roiCoords": {"l": 150, "t": 100, "r": 450, "b": 400},
        "selectedAxisId": None
    }
    print("后端: 相机已断开")
    return jsonify(camera_state)

@app.route('/status', methods=['GET'])
def get_status():
    global camera_state
    # 如果连接了，可能需要更新一下清晰度（如果Z轴可能被外部改变）
    if camera_state["isConnected"] and not camera_state["isFocusing"]:
         camera_state["clarity"] = calculate_clarity(camera_state["currentZ"])
    return jsonify(camera_state)

@app.route('/start_focus', methods=['POST'])
def start_focus():
    global camera_state, focus_thread
    if not camera_state["isConnected"]:
        return jsonify({"status": "error", "message": "相机未连接"}), 400
    if camera_state["isFocusing"]:
        return jsonify({"status": "error", "message": "已经在对焦中"}), 400

    print("后端: 收到开始对焦请求")
    focus_thread = threading.Thread(target=simulate_focus_process, daemon=True)
    focus_thread.start()
    # 立即返回，让前端知道请求已收到，对焦状态会在 /status 中更新
    return jsonify({"status": "ok", "message": "对焦流程已启动"})

@app.route('/stop_focus', methods=['POST'])
def stop_focus():
    global camera_state, focus_thread
    if not camera_state["isFocusing"]:
        return jsonify({"status": "error", "message": "不在对焦中"}), 400

    print("后端: 收到停止对焦请求")
    stop_focus_flag.set()
    if focus_thread and focus_thread.is_alive():
        # 不需要在这里 join，让 /status 接口反映最终状态
        pass
    else:
        # 如果线程已经结束，手动更新状态
        camera_state["isFocusing"] = False
        if camera_state["focusStatus"] not in ["已对焦", "空闲", "错误", "未连接"]:
             camera_state["focusStatus"] = "已停止"
    
    return jsonify({"status": "ok", "message": "停止信号已发送"})

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
    
    # 验证 axis_id 是否在可用列表中 (可选)
    if not any(axis['id'] == axis_id for axis in simulated_plc_axes):
         return jsonify({"status": "error", "message": f"无效的轴 ID: {axis_id}"}), 400

    # 更新状态 (模拟保存到PLC)
    camera_state['selectedAxisId'] = axis_id
    print(f"后端: 模拟保存相机 '{camera_sn}' 的轴配置为 ID: {axis_id}")
    
    # 返回成功状态和当前配置 (可选)
    return jsonify({"status": "ok", "selectedAxisId": axis_id})

if __name__ == '__main__':
    # 使用 0.0.0.0 允许外部访问，端口可以自定义
    app.run(host='0.0.0.0', port=5000, debug=True) 