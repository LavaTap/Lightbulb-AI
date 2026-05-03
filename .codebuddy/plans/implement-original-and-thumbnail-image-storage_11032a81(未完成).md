---
name: implement-original-and-thumbnail-image-storage
overview: 实现每次生图时同时保存原图和压缩缩略图：数据库新增 original 字段、后端支持存储/读取、前端类型对齐、记录列表展示缩略图、详情弹窗可查看/下载原图、更新开发者手册说明双图机制。
design:
  architecture:
    framework: react
    component: shadcn
  styleKeywords:
    - Modern Minimalism
    - Clean Interface
    - Smooth Transitions
    - Dual-Mode Toggle
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 18px
      weight: 600
    subheading:
      size: 15px
      weight: 500
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#6366F1"
      - "#818CF8"
      - "#4F46E5"
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
  - id: backend-schema-types
    content: 修改后端数据库表结构和类型定义：database.ts 添加 ALTER TABLE 两列，types/index.ts 和 validateRequest.ts 的 Schema/接口添加 Optional 的 Original 字段
    status: pending
  - id: backend-routes
    content: 修改后端 records 路由：INSERT 和 SELECT 语句包含 upload_images_original 和 generated_images_original 字段
    status: pending
    dependencies:
      - backend-schema-types
  - id: frontend-types
    content: 修改前端类型定义：types/index.ts GenerationRecord 和 types/api.ts CreateRecordRequest 添加 Optional 的 Original 字段
    status: pending
  - id: detail-dialog-ui
    content: 增强 RecordDetailDialog 组件：添加缩略图/原图 Tab 切换、原图预览、独立下载原图按钮，无原图时优雅降级
    status: pending
    dependencies:
      - frontend-types
  - id: update-docs
    content: 更新 DEVELOPER.md 手册：更新表结构说明（7.1节）、调用流程（6.4节）、注意事项（10.5节）、Changelog 版本号及变更说明
    status: pending
    dependencies:
      - backend-schema-types
      - backend-routes
      - frontend-types
      - detail-dialog-ui
---

## Product Overview

为 Lightbulb AI 的图片生成记录功能实现**原图+缩略图双图存储机制**。每次生图时同时保存高清原图和压缩缩略图两种版本，历史记录列表展示缩略图（保持快速加载），点击详情弹窗可查看和下载原图。

## Core Features

- **双图存储**：每次生图（角色/三视图/海报）同时保存原图（原始分辨率 base64）和压缩缩略图（200px JPEG），写入数据库不同字段
- **数据库扩展**：`generation_records` 表新增 `upload_images_original` 和 `generated_images_original` 两个 TEXT 列，通过 ALTER TABLE 兼容已有数据
- **后端完整链路支持**：Schema 校验、路由 INSERT/SELECT 全链路传递 Original 字段
- **前端类型对齐**：前后端类型定义（GenerationRecord / CreateRecordRequest）同步新增 Original 可选字段
- **详情弹窗增强**：RecordDetailDialog 增加原图预览与下载功能，默认展示缩略图，提供"查看原图"切换按钮和"下载原图"独立按钮
- **开发者手册更新**：DEVELOPER.md 更新表结构说明、调用流程、注意事项，注明双图存储机制设计细节

## 视觉效果

- 记录列表：展示 200px 缩略图（当前行为不变）
- 详情弹窗：图片区域增加"缩略图/原图"Tab 切换或"查看原图"按钮，切换时无缝加载高清原图；下载区域区分"下载预览图"与"下载原图"

## Tech Stack

- 后端：Express + TypeScript + sql.js (SQLite)
- 前端：React 18 + TypeScript + TailwindCSS + shadcn/ui (Radix UI)
- 图片压缩：Canvas API (`compressImageAsBase64`, 200px, JPEG quality=0.7)

## Tech Architecture

### 系统架构变更

```
修改前:
useGeneration → compressImage(200px) → saveRecord({generatedImages: compressed}) → DB.generated_images

修改后:
useGeneration → compressImage(200px) → saveRecord({
  generatedImages: compressed,          // 缩略图 (200px JPEG ~10-30KB)
  generatedImagesOriginal: originalBase64,  // 原图 (原始分辨率 PNG/JPEG ~500KB-3MB)
}) → DB.generated_images + DB.generated_images_original
```

### 关键设计决策

1. **列表接口不返回 Original 字段**：GET `/api/records` 分页查询不返回 `*_original` 字段，避免传输大量 base64 数据导致列表加载缓慢；仅在需要时（点击详情）使用已加载的完整数据
2. **ALTER TABLE 兼容升级**：数据库初始化时通过 `ALTER TABLE ADD COLUMN` 添加新列，不影响已有数据
3. **可选链防御**：Original 字段为 optional，旧记录无原图数据时优雅降级为仅显示缩略图
4. **前端 useGeneration 已发送 Original 字段**：只需后端接收并存储即可打通全链路

### 数据流完整路径

```
[前端 useGeneration Hook]
  generate() / generateThreeView() / generatePoster()
    ├─ 接收 API 返回的 imageBase64 (原图)
    ├─ compressImageAsBase64(imageBase64, 200, 0.7) → compressedImage
    └─ recordsApi.create({
         generatedImages: compressedImage,           // 缩略图
         generatedImagesOriginal: response.data.imageBase64,  // 原图
         uploadImages: compressedUpload,
         uploadImagesOriginal: originalUpload,
         ...
       })
        ↓ POST /api/records (body 含 Original 字段)
[后端 routes/records.ts]
  createRecordSchema.parse(req.body)   ← 校验 Original 字段
  INSERT INTO generation_records (..., upload_images_original, generated_images_original)
        ↓
[后端 database.ts]
  ALTER TABLE generation_records ADD COLUMN upload_images_original TEXT
  ALTER TABLE generation_records ADD COLUMN generated_images_original TEXT
        ↓
[前端 RecordsPage.tsx] → RecordDetailDialog.tsx]
  列表：显示 generatedImages (缩略图) ← GET /api/records 返回
  详情弹窗：
    ├─ 默认显示 generatedImages (缩略图)
    ├─ [查看原图] → 显示 generatedImagesOriginal (原图)
    └─ [下载原图] → 下载 generatedImagesOriginal (原图)
```

## Implementation Notes

1. **性能**：列表页不加 original 字段，避免分页请求返回数 MB 数据。前端 RecordDetailDialog 从 records 列表项获取完整的 record 对象（含 original 字段），无需额外请求
2. **向后兼容**：ALTER TABLE 使用 `IF NOT EXISTS` 模式（sql.js 不原生支持，需 try-catch 包裹或先查列是否存在）；旧记录的 original 字段为 NULL，前端用可选链 `record.generatedImagesOriginal` 安全访问
3. **Blast radius**：仅影响数据库表结构、记录 CRUD 链路、详情弹窗 UI，不涉及其他模块
4. **存储空间**：原图 base64 较大，SQLite 文件会增长明显，但这是用户需求明确要求的

## Directory Structure

```
lightbulb-AI/
├── backend/
│   ├── src/
│   │   ├── database.ts              # [MODIFY] initDatabase() 新增 ALTER TABLE 添加两列
│   │   ├── types/
│   │   │   └── index.ts             # [MODIFY] GenerationRecord/CreateRecordRequest 加 Optional 字段
│   │   ├── middleware/
│   │   │   └── validateRequest.ts   # [MODIFY] createRecordSchema 加两个 optional string 字段
│   │   └── routes/
│   │       └── records.ts           # [MODIFY] INSERT/SELECT 增加 original 字段
├── frontend/
│   └── src/
│       ├── types/
│       │   ├── index.ts             # [MODIFY] GenerationRecord 接口加 Optional 字段
│       │   └── api.ts               # [MODIFY] CreateRecordRequest 加 Optional 字段
│       ├── components/
│       │   └── RecordDetailDialog.tsx # [MODIFY] 增加原图预览/下载/TAB切换UI
│       └── pages/
│           └── RecordsPage.tsx      # [MINOR MODIFY] 确保 record 对象透传完整字段
└── DEVELOPER.md                      # [MODIFY] 更新表结构/流程/Changelog 说明双图机制
```

## 设计概述

### 页面范围

仅需修改 **记录详情弹窗 (RecordDetailDialog)** 的内部 UI，增加原图查看能力。

### 设计风格

沿用项目现有的 shadcn/ui 组件风格（圆角卡片、柔和阴影、灰白配色），在现有弹窗基础上增强图片区域的交互体验。

### 页面：记录详情弹窗 (RecordDetailDialog)

#### Block 1: 图片区域头部（改造）

- 标题行右侧增加 **[缩略图] [原图]** Tab 切换按钮组（小尺寸胶囊样式）
- 当前模式高亮显示（primary 色背景）
- 当没有原图数据时隐藏"原图"Tab 或置灰不可点

#### Block 2: 图片展示区（改造）

- 默认显示压缩缩略图（200px）
- 切换到"原图"Tab 时无缝替换为高清原图 base64
- 图片加载时显示轻量骨架屏/模糊占位
- 三视图仍保持网格布局，每张图都跟随 Tab 切换

#### Block 3: 下载操作区（改造）

- 原"下载"按钮拆分为两个：
- **"下载预览图"** (次要按钮, outline)：下载当前正在查看的版本
- **"下载原图"** (主要按钮, primary)：始终下载高清原图（有原图时才显示）
- 单张图直接下载，多张图批量下载均提供两种选项

#### Block 4: 参考图区域（改造）

- 参考图同样支持缩略图/原图切换（如果有 uploadImagesOriginal 数据）

#### Block 5: 提示词 & 元信息区（不变）

- 保持现有布局不变

## Agent Extensions

- **code-explorer**
- 用途：在实现过程中验证各文件间的引用关系和类型一致性
- 预期结果：确保后端路由、Schema、数据库三层对 Original 字段的处理逻辑一致