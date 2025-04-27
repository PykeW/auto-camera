import React from 'react';
import { Layout, Card, Slider, Switch, Input, Button, Space, Select, Tabs } from 'antd';
import { CameraOutlined, AimOutlined } from '@ant-design/icons';
import './App.css';

const { Header, Content } = Layout;
const { Option } = Select;
const { TabPane } = Tabs;

function App() {
  return (
    <Layout className="layout">
      <Header className="header">
        <div className="header-controls">
          <Button type="text" icon={<span>«</span>} className="header-button" />
          <Button type="text" icon={<span>⊡</span>} className="header-button" />
          <Button type="text" icon={<span>▶</span>} className="header-button" />
          <Button type="text" icon={<span>▷</span>} className="header-button" />
          <Button type="text" icon={<CameraOutlined />} className="header-button" />
        </div>
        <div className="header-title">相机操作</div>
      </Header>
      <Content className="main-content">
        <div className="camera-view" style={{ flex: 1, background: '#666' }}>
          <div className="focus-overlay"></div>
        </div>
        <div className="control-panel">
          <Tabs defaultActiveKey="1" className="control-tabs">
            <TabPane tab="基本设置" key="1">
              <div className="panel-section">
                <div className="section-header">相机序列号：</div>
                <Button className="connect-button">连接</Button>
              </div>

              <div className="panel-section">
                <div className="section-header">配置文件：</div>
                <Button className="config-button">选择文件</Button>
              </div>

              <div className="panel-section">
                <div className="section-header">图像保存路径：</div>
                <Space>
                  <Input value="D:/AD1线下方验证" readOnly />
                  <Button>选择文件夹</Button>
                </Space>
              </div>

              <div className="panel-section">
                <div className="section-header">相机名称：</div>
                <Input value="新建相机1" />
              </div>

              <div className="panel-section">
                <div className="section-header">相机型号：</div>
                <Input value="海康（面阵）" />
              </div>
            </TabPane>
            
            <TabPane tab="相机属性" key="2">
              <div className="panel-section">
                <table className="property-table">
                  <tbody>
                    <tr>
                      <td>属性名称</td>
                      <td>属性值</td>
                    </tr>
                    <tr>
                      <td>Y反转</td>
                      <td><Select defaultValue="否" style={{ width: '100%' }}>
                        <Option value="是">是</Option>
                        <Option value="否">否</Option>
                      </Select></td>
                    </tr>
                    <tr>
                      <td>X反转</td>
                      <td><Select defaultValue="否" style={{ width: '100%' }}>
                        <Option value="是">是</Option>
                        <Option value="否">否</Option>
                      </Select></td>
                    </tr>
                    <tr>
                      <td>触发模式</td>
                      <td><Select defaultValue="连续采集" style={{ width: '100%' }}>
                        <Option value="连续采集">连续采集</Option>
                        <Option value="外部触发">外部触发</Option>
                      </Select></td>
                    </tr>
                    <tr>
                      <td>触发信号</td>
                      <td><Select defaultValue="上升" style={{ width: '100%' }}>
                        <Option value="上升">上升</Option>
                        <Option value="下降">下降</Option>
                      </Select></td>
                    </tr>
                    <tr>
                      <td>触发源</td>
                      <td><Select defaultValue="通道0" style={{ width: '100%' }}>
                        <Option value="通道0">通道0</Option>
                        <Option value="通道1">通道1</Option>
                      </Select></td>
                    </tr>
                    <tr>
                      <td>图像格式</td>
                      <td><Select defaultValue="MONO8" style={{ width: '100%' }}>
                        <Option value="MONO8">MONO8</Option>
                        <Option value="RGB8">RGB8</Option>
                      </Select></td>
                    </tr>
                    <tr>
                      <td>曝光时间(微秒/us)</td>
                      <td><Input value="-1" /></td>
                    </tr>
                    <tr>
                      <td>增益</td>
                      <td><Input value="-1" /></td>
                    </tr>
                    <tr>
                      <td>使能</td>
                      <td><Input value="使能" /></td>
                    </tr>
                    <tr>
                      <td>伽马指数</td>
                      <td><Input value="-1" /></td>
                    </tr>
                    <tr>
                      <td>白平衡</td>
                      <td><Input value="自动" /></td>
                    </tr>
                    <tr>
                      <td>红(0)</td>
                      <td><Slider defaultValue={50} /></td>
                    </tr>
                    <tr>
                      <td>绿(0)</td>
                      <td><Slider defaultValue={50} /></td>
                    </tr>
                    <tr>
                      <td>蓝(0)</td>
                      <td><Slider defaultValue={50} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </TabPane>

            <TabPane tab="自动对焦" key="3">
              <div className="panel-section">
                <div className="section-header">对焦控制</div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Select defaultValue="manual" style={{ width: '100%' }}>
                    <Option value="manual">手动对焦</Option>
                    <Option value="auto">自动对焦</Option>
                    <Option value="semi">半自动对焦</Option>
                  </Select>
                  
                  <div className="focus-params">
                    <div className="param-item">
                      <div>对焦步长</div>
                      <Input defaultValue="0.1" />
                    </div>
                    <div className="param-item">
                      <div>扫描范围(mm)</div>
                      <Space>
                        <Input placeholder="最小" style={{ width: 100 }} />
                        <Input placeholder="最大" style={{ width: 100 }} />
                      </Space>
                    </div>
                    <div className="param-item">
                      <div>当前位置(mm)</div>
                      <Input readOnly value="10.5" />
                    </div>
                  </div>

                  <div className="focus-controls">
                    <Button type="primary" icon={<AimOutlined />}>开始对焦</Button>
                    <Button danger>停止</Button>
                    <Button>保存参数</Button>
                  </div>

                  <div className="focus-status">
                    <div>对焦状态：<span className="status-text">就绪</span></div>
                    <div>清晰度值：<span className="status-value">0.85</span></div>
                    <div>最佳位置：<span className="status-value">10.5mm</span></div>
                  </div>
                </Space>
              </div>

              <div className="panel-section">
                <div className="section-header">对焦ROI设置</div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button>设置对焦区域</Button>
                  <div className="roi-coords">
                    <Space>
                      <div>左上角：</div>
                      <Input style={{ width: 60 }} value="100" />
                      <Input style={{ width: 60 }} value="100" />
                    </Space>
                    <Space>
                      <div>右下角：</div>
                      <Input style={{ width: 60 }} value="300" />
                      <Input style={{ width: 60 }} value="300" />
                    </Space>
                  </div>
                </Space>
              </div>
            </TabPane>
          </Tabs>

          <div className="panel-section">
            <div className="section-header">ROI区域</div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button>启用</Button>
              <Space>
                <div>左X</div>
                <Input value="0" style={{ width: 80 }} />
                <div>上Y</div>
                <Input value="0" style={{ width: 80 }} />
              </Space>
              <Space>
                <div>右X</div>
                <Input value="100" style={{ width: 80 }} />
                <div>下Y</div>
                <Input value="100" style={{ width: 80 }} />
              </Space>
              <Button>保存ROI</Button>
            </Space>
          </div>

          <div className="panel-section">
            <div className="section-header">曝光时间</div>
            <Space>
              <div>(毫秒/ms)</div>
              <Input value="10000" style={{ width: 120 }} />
            </Space>
          </div>
        </div>
      </Content>
      <div className="status-bar">
        <div>未连接</div>
        <div>帧率: 0 fps</div>
        <div>x=449, y=837</div>
        <div>位置超过图像范围</div>
        <div>图像: Pixmap(100, 100)</div>
        <div>缩放: 100%</div>
      </div>
    </Layout>
  );
}

export default App; 