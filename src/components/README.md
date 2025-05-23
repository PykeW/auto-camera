# ROI 组件使用说明

本项目包含两个可复用的ROI（Region of Interest，感兴趣区域）组件，用于在不同模块中实现ROI绘制和控制功能。

## 组件概述

### 1. RoiControlHeader 组件

`src/components/common/RoiControlHeader.vue` 是一个轻量级的ROI控制头部组件，包含标题和基本的按钮组（显示/隐藏、编辑、删除）。

#### 属性 (Props)

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| title | String | 'ROI区域' | 显示的标题文本 |
| purpose | String | 'focus' | ROI的用途，可以是'focus', 'template', 'measurement'等 |
| disabled | Boolean | false | 是否禁用按钮 |

#### 事件 (Events)

| 事件名 | 参数 | 描述 |
|--------|------|------|
| visibility-toggle | isVisible (Boolean) | ROI可见性切换时触发 |
| edit | isDrawing (Boolean) | 编辑ROI时触发 |
| clear | - | 清除ROI时触发 |

#### 使用示例

```vue
<RoiControlHeader 
  title="对焦ROI区域"
  purpose="focus"
  :disabled="!isConnected"
  @visibility-toggle="handleRoiVisibilityToggle"
  @edit="handleRoiEdit"
  @clear="handleRoiClear"
/>
```

### 2. ROIControl 组件

`src/components/ControlPanel/ROIControl.vue` 是一个完整的ROI控制组件，包含头部、形状工具选择和ROI信息显示。

#### 属性 (Props)

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| title | String | 'ROI区域' | 显示的标题文本 |
| purpose | String | 'focus' | ROI的用途，可以是'focus', 'template', 'measurement'等 |
| disabled | Boolean | false | 是否禁用按钮 |
| showShapeTools | Boolean | true | 是否显示形状工具选择器 |
| showInfo | Boolean | true | 是否显示ROI坐标信息 |

#### 事件 (Events)

| 事件名 | 参数 | 描述 |
|--------|------|------|
| visibility-toggle | isVisible (Boolean) | ROI可见性切换时触发 |
| edit | isDrawing (Boolean) | 编辑ROI时触发 |
| clear | - | 清除ROI时触发 |
| shape-change | tool (String) | 形状工具切换时触发 |

#### 使用示例

```vue
<ROIControl 
  title="对焦ROI区域"
  purpose="focus"
  :disabled="!isConnected || isFocusing"
  @visibility-toggle="handleRoiVisibilityToggle"
  @edit="handleRoiEdit"
  @clear="handleRoiClear"
  @shape-change="handleShapeChange"
/>
```

## 状态管理

ROI组件使用`useRoiStore`进行状态管理，包含以下主要状态和方法：

### 状态

- `isDrawingROI` - 是否正在绘制ROI
- `roiEnabled` - ROI是否启用/可见
- `roiCoords` - ROI坐标信息
- `roiType` - ROI类型（'rect', 'ellipse', 'polygon'）
- `polygonPoints` - 多边形点数组
- `activeShapeTool` - 当前活动的形状工具

### 方法

- `startRoiSelection(purpose)` - 开始ROI选择，指定用途
- `stopDrawingROI()` - 停止绘制ROI
- `confirmROI()` - 确认ROI
- `clearROI()` - 清除ROI
- `toggleROIVisibility()` - 切换ROI可见性
- `switchROITool(tool)` - 切换ROI形状工具

## 实际绘制实现

ROI的实际绘制是在`src/components/common/RoiOverlay.vue`组件中实现的，该组件覆盖在相机视图上，处理鼠标事件并绘制ROI形状。 