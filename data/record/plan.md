素材面板四项改进计划                

 Context

 用户对素材面板（PlanningPage）提出4项改进需求：
 1. 图片节点大小应根据实际图片尺寸自适应，而非固定240×180
 2. 框体和图片大小可调整（已有resize手柄，需与自适应尺寸配合）
 3. 连线规则：不能自连接，同一节点的4个Handle之间不能互连
 4. 连线样式选项：连接后弹出选项，可选smoothstep/贝塞尔曲线/直线，可选箭头

 ---
 改动1: ImageNode 自适应图片尺寸

 文件: frontend/src/components/planning/nodes/ImageNode.tsx

 方案: 图片加载后获取 naturalWidth/naturalHeight，按比例缩放到合理范围（最大宽度1500px），设置初始尺寸。

 - 移除固定 useState({ width: 240, height: 180 })
 - 添加 onLoad 回调在 <img> 加载后读取 naturalWidth/naturalHeight
 - 计算缩放：若宽度 > 1500 则等比缩放到 1500，否则用原始尺寸；最小宽度100px
 - 用 useRef 标记是否已初始化尺寸，避免重复计算
 - resize 逻辑不变，仍保持宽高比

 改动2: 调整框和图片大小

 文件: frontend/src/components/planning/nodes/ImageNode.tsx

 已有resize手柄可正常工作，与改动1配合即可。无需额外代码。

 改动3: 连线验证规则

 文件: frontend/src/components/planning/PlanningCanvas.tsx, frontend/src/hooks/usePlanningState.ts

 规则:
 - A: 源节点和目标节点不能是同一个节点（connection.source !== connection.target）
 - B: 同一节点内的Handle不能互连（被规则A覆盖，React Flow默认也阻止）

 实现:
 - 在 PlanningCanvas.tsx 中添加 isValidConnection 回调函数
 - 传递给 <ReactFlow isValidConnection={isValidConnection}>
 - isValidConnection 返回 false 如果 connection.source === connection.target

 const isValidConnection = useCallback((connection: Connection) => {
   return connection.source !== connection.target;
 }, []);

 改动4: 连线样式选项（最复杂）

 4a. 自定义边类型

 新文件: frontend/src/components/planning/edges/PlanningEdge.tsx

 创建3种自定义边组件，均支持可选箭头：

 ┌─────────────────────┬─────────────────────┬──────────────────┐
 │       边类型        │ React Flow path函数 │       说明       │
 ├─────────────────────┼─────────────────────┼──────────────────┤
 │ planning-smoothstep │ getSmoothStepPath   │ 折线（当前默认） │
 ├─────────────────────┼─────────────────────┼──────────────────┤
 │ planning-bezier     │ getBezierPath       │ 弹性曲线         │
 ├─────────────────────┼─────────────────────┼──────────────────┤
 │ planning-straight   │ getStraightPath     │ 直线             │
 └─────────────────────┴─────────────────────┴──────────────────┘

 每个边组件：
 - 从 edge.data 读取 { showArrow: boolean }
 - 使用 BaseEdge + 对应 path 函数渲染
 - showArrow 为 true 时，在 path 末端绘制 SVG 箭头 marker

 4b. 连线后弹出样式面板

 新文件: frontend/src/components/planning/EdgeStylePopup.tsx

 - 浮动面板，定位在新建边的中间点附近
 - 选项：
   - 线型切换：smoothstep / bezier / straight（3个图标按钮）
   - 箭头开关：toggle 按钮
 - 选择后立即更新对应边的 type 和 data.showArrow
 - 点击面板外区域或3秒无操作自动关闭

 4c. 边数据结构扩展

 文件: frontend/src/types/planning.ts

 export type PlanningEdgeData = {
   showArrow?: boolean;
 };

 4d. onConnect 修改

 文件: frontend/src/hooks/usePlanningState.ts

 - onConnect 创建边时设置默认 type: 'planning-smoothstep' 和 data: { showArrow: false }
 - 记录新建边的 ID，通过返回值或回调通知 PlanningPage 显示 EdgeStylePopup

 4e. PlanningPage 集成

 文件: frontend/src/pages/PlanningPage.tsx

 - 注册自定义边类型：const edgeTypes = { 'planning-smoothstep': ..., 'planning-bezier': ..., 'planning-straight': ... }
 - 传递给 <PlanningCanvas edgeTypes={edgeTypes}>
 - 管理 EdgeStylePopup 的显示/隐藏状态
 - 点击边也可重新打开样式面板（通过 onEdgeClick 回调）

 4f. PlanningCanvas 修改

 文件: frontend/src/components/planning/PlanningCanvas.tsx

 - 接收 edgeTypes prop
 - 接收 isValidConnection prop
 - 添加 onEdgeClick 回调
 - 更新 defaultEdgeOptions.type 为 'planning-smoothstep'

 ---
 修改文件清单

 ┌─────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────┐
 │                          文件                           │                         操作                         │
 ├─────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ frontend/src/components/planning/nodes/ImageNode.tsx    │ 修改：自适应图片尺寸                                 │
 ├─────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ frontend/src/components/planning/PlanningCanvas.tsx     │ 修改：添加 isValidConnection、edgeTypes、onEdgeClick │
 ├─────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ frontend/src/hooks/usePlanningState.ts                  │ 修改：onConnect 返回新边ID、updateEdgeStyle 方法     │
 ├─────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ frontend/src/pages/PlanningPage.tsx                     │ 修改：集成 edgeTypes、EdgeStylePopup、边样式更新逻辑 │
 ├─────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ frontend/src/types/planning.ts                          │ 修改：添加 PlanningEdgeData 类型                     │
 ├─────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ frontend/src/components/planning/edges/PlanningEdge.tsx │ 新建：自定义边组件（3种线型+箭头）                   │
 ├─────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
 │ frontend/src/components/planning/EdgeStylePopup.tsx     │ 新建：边样式弹出面板                                 │
 └─────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┘

 ---
 验证方法

 1. 启动前端 cd frontend && npm run dev
 2. 进入素材面板页面
 3. 验证自适应尺寸：添加不同尺寸的图片（宽图/窄图/大图/小图），确认节点大小跟随图片自适应
 4. 验证resize：拖拽图片节点右下角手柄，确认宽高比保持、尺寸可调
 5. 验证连线规则：尝试从同一节点的Handle连到自身，确认被阻止
 6. 验证边样式：
   - 连接两个节点后，确认弹出样式面板
   - 切换线型（smoothstep/bezier/straight），确认线条变化
   - 开启箭头，确认箭头出现
   - 点击已有边，确认可重新编辑样式