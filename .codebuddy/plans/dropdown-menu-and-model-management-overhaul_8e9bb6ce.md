---
name: dropdown-menu-and-model-management-overhaul
overview: 重构下拉菜单按功能分类显示模型、扩展服务商、移除Vision检测、优化三视图和海报生成页面
design:
  architecture:
    framework: react
    component: shadcn
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 28px
      weight: 700
    subheading:
      size: 18px
      weight: 600
    body:
      size: 15px
      weight: 400
  colorSystem:
    primary:
      - "#8B5CF6"
      - "#6366F1"
      - "#3B82F6"
    background:
      - "#FFFFFF"
      - "#F9FAFB"
      - "#F3F4F6"
    text:
      - "#111827"
      - "#374151"
      - "#9CA3AF"
    functional:
      - "#10B981"
      - "#EF4444"
      - "#F59E0B"
todos:
  - id: remove-detect-vision
    content: 移除全部 detectVision 功能：ModelSelector.tsx UI/useApiConfig.ts/api.ts/types/api.ts/backend routes/modelConfigs.ts
    status: completed
  - id: enhance-threeview-poster
    content: ThreeViewPage 强制图文双填校验+提升清晰度至2K；PosterGenPage 尺寸改为Select下拉+强制图文双填
    status: completed
    dependencies:
      - remove-detect-vision
  - id: update-model-management
    content: ModelSelector.tsx 扩展PROVIDERS服务商列表 + 自定义模式保存时弹窗模态警告
    status: completed
    dependencies:
      - remove-detect-vision
  - id: polish-dropdown-switching
    content: 验证各页面ModelDropdown切换即时生效，微调ModelDropdown显示体验
    status: completed
    dependencies:
      - enhance-threeview-poster
      - update-model-management
---

这里仅参考修改重构下拉菜单按功能分类显示模型、扩展服务商、移除Vision检测 实现ai切换 模型管理的服务商要新增并且对应调整 自定义模式不变 但要弹窗提醒用户注意模型模态！！！！其他功能不要动。

## 产品概述

重构各功能页面的模型下拉菜单系统、模型管理对话框、以及三视图/海报生成页面的输入校验和尺寸选择逻辑。

## 核心需求

### 1. 各页面功能特性与模型分类映射

- **灵感提示页**：用户上传图片 → AI 生成描述性文字（使用 `vision` 类型的多模态模型）
- **角色生图页**：用户输入文字 → AI 生成图片（使用 `text-to-image` 模型）
- **角色三视图页**：用户上传图片 **+** 输入提示词（图文均必填，缺一不可）→ AI 生图，输出 **3张 16:9 图片，分辨率提升至 1920p（当前仅1080p 太低）**（使用 `image-to-image` 模型）
- **海报生成页**：用户上传角色参考图 **+** 输入提示词（图文均必填）→ AI 生成海报，**尺寸改为下拉菜单选择多种规格**（使用 `image-to-image` 模型）

### 2. 下拉菜单按功能分类过滤

每个页面顶部的 ModelDropdown 已支持 category 过滤，需确保分类正确且切换后立即生效。

### 3. 模型管理改造

- **服务商扩展**：在 PROVIDERS 列表中新增服务商及对应模型定义
- **自定义模式弹窗提醒**：选择"自定义"服务商时，保存前弹出警告提示用户注意模型模态（vision/text-to-image/image-to-image）
- **移除检测 Vision 能力功能**：
- 删除 ModelSelector.tsx 中的"检测Vision能力"按钮、状态变量、处理函数和结果展示
- 删除 useApiConfig.ts 中的 detectVision 方法
- 删除 api.ts 中的 detectVision API 调用和 DetectVisionResponse 类型
- 删除 backend/src/routes/modelConfigs.ts 中的 /detect-vision 路由

### 4. AI 模型切换即时生效

确保在任意页面通过 ModelDropdown 切换模型后，后续操作立即使用新选择的模型配置。

## 技术栈

- 前端：React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Radix UI
- 后端：Node.js + Express + TypeScript + sql.js (SQLite)

## 实现方案

### 架构策略

基于现有代码结构进行增量修改，不改变整体架构。核心改动集中在以下模块：

1. **类型层** (`types/index.ts`, `types/api.ts`) — 清理 Vision 检测相关类型
2. **组件层** (`ModelSelector.tsx`) — 移除检测Vision UI、新增服务商、自定义模式弹窗警告
3. **组件层** (`ModelDropdown.tsx`) — 无需大改，已支持 category 过滤
4. **页面层** (`ThreeViewPage.tsx`, `PosterGenPage.tsx`) — 强化输入校验、改进尺寸/分辨率
5. **Hook 层** (`useApiConfig.ts`) — 移除 detectVision 方法
6. **服务层** (`services/api.ts`) — 清理 detectVision API 调用
7. **后端路由** (`routes/modelConfigs.ts`) — 移除 /detect-vision 端点

### 关键技术决策

#### 三视图清晰度方案

当前代码标注 1920x1080（1080p），用户要求 1920p。将输出尺寸提示改为 **2560x1440 (2K)** 或 **3840x2160 (4K)**，并在后端 imageGenService 中调整实际请求的 size 参数。

#### 海报尺寸下拉菜单方案

将当前的卡片式二选一（竖版/横版）改为 `<Select>` 下拉组件，提供以下选项：

- 竖版 9:16: 1080x1920, 1350x2400(2K), 2160x3840(4K)
- 横版 16:9: 1920x1080, 2560x1440(2K), 3840x2160(4K)
- 正方形 1:1: 1024x1024, 2048x2048(2K)

#### 自定义模式弹窗方案

在 ModelSelector 的 handleSave 函数中，当 `selectedProvider === 'custom'` 时，先弹出 Dialog 确认框提示："自定义模式下请确保所选模型的模态与使用场景匹配（多模态/vision / 文生图/text-to-image / 图生图/image-to-image）"，确认后再执行保存。

### 数据流

```
用户选择模型 → ModelDropdown.onModelChange → 页面 useState 更新 → 
调用 useGeneration() 时传入新 config → 使用选中的 ModelConfig 构建 APIConfig
```

## 目录结构变更摘要

```
frontend/src/
├── components/
│   ├── ModelSelector.tsx        # [MODIFY] 移除detectVision、新增服务商、自定义弹窗警告
│   └── ModelDropdown.tsx        # [MODIFY] 微调UI显示优化
├── pages/
│   ├── ThreeViewPage.tsx        # [MODIFY] 强制图文双填、提高清晰度标注
│   └── PosterGenPage.tsx        # [MODIFY] 尺寸改下拉菜单、强制图文双填
├── hooks/
│   └── useApiConfig.ts          # [MODIFY] 删除detectVision方法
├── services/
│   └── api.ts                   # [MODIFY] 删除detectVision API调用和类型
└── types/
    └── api.ts                   # [MODIFY] 删除DetectVisionResponse
backend/src/routes/
└── modelConfigs.ts              # [MODIFY] 删除/detect-vision路由
```

## 设计说明

本次主要涉及两个页面的表单交互增强和模型管理对话框的改造：

### 三视图页面 (ThreeViewPage)

- 保持现有卡片布局风格
- 在生成按钮区域增加更醒目的提示：当图片或提示词未填写时，按钮置灰并显示原因
- 分辨率提示从 1920x1080 升级到 2560x1440 (2K)，视觉上用绿色高亮标签展示

### 海报生成页面 (PosterGenPage)  

- 将现有的两卡片式尺寸选择替换为 Select 下拉组件
- 下拉菜单包含多个预设尺寸选项（竖版/横版/正方形，含 2K/4K 高清选项）
- 选中项以蓝色高亮边框反馈

### 模型管理对话框 (ModelSelector)

- 移除"检测Vision能力"按钮及其结果展示区
- 新增服务商选项直接出现在 Provider 选择器中
- 自定义模式的警告使用 Dialog 内嵌 Alert 样式的确认框

## SubAgent

- **code-explorer**
- Purpose: 验证后端 imageGenService.ts 中的图片生成参数（size 字段），确认如何将分辨率从 1080p 提升到更高值
- Expected outcome: 确定后端传给 API 的具体 size 参数格式和可接受的值范围

## Skill

- **多模态内容生成**
- Purpose: 本项目涉及文生图、图生图等多模态AI内容生成的功能验证
- Expected outcome: 确保三视图和海报生成的图像质量参数符合用户期望