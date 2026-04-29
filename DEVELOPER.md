# Lightbulb AI 开发者手册

> **版本**: v2.0 | **更新日期**: 2026-04-28  
> **由**: LightGuide 自动生成 | **基于项目源码全量扫描**

---

## 目录

- [1 项目概述](#1-项目概述)
- [2 技术栈与架构总览](#2-技术栈与架构总览)
- [3 目录结构详解](#3-目录结构详解)
- [4 后端架构详解](#4-后端架构详解)
- [5 前端架构详解](#5-前端架构详解)
- [6 模型连接机制](#6-模型连接机制)
- [7 数据库表结构说明](#7-数据库表结构说明)
  - [7.4 双图存储机制](#74-双图存储机制)
- [8 API 接口文档](#8-api-接口文档)
- [9 核心业务流程](#9-核心业务流程)
- [10 开发指南](#10-开发指南)
- [A 附录: HTTP 错误码对照表](#a-附录http-错误码对照表)
- [B 附录: 常用模型 ID 参考](#b-附录常用模型-id参考)

---

## 1 项目概述

Lightbulb AI（巷子CHARM~）是一个 **AI 驱动的创意辅助工具**，面向设计师和创作者，提供以下核心功能：

| 功能 | 描述 | 页面组件 |
|------|------|---------|
| **灵感提示** | 上传图片 → AI 视觉分析 → 生成中英文提示词 | `InspirationPage` |
| **角色生图** | 输入提示词 → AI 文生图 | `CharacterGenPage` |
| **角色三视图** | 上传参考图 + 提示词 → 生成正面/侧面/背面三张图 | `ThreeViewPage` |
| **海报生成** | 上传角色图 + 描述 → 按选定尺寸生成海报 | `PosterGenPage` |
| **CG 生成** | CG 创作工具（开发中） | `CgGenPage` |

### 运行方式

双击 `start.bat` 一键启动：
- 后端：Express + TypeScript（端口 `3001`）
- 前端：React + Vite（端口 `3000`），自动代理 `/api` 到后端
- 数据库：SQLite（文件 `data/lightbulb.db`）

---

## 2 技术栈与架构总览

### 架构图

```
┌─────────────────────────────────────────────────────┐
│                     用户浏览器                          │
│              (React SPA - localhost:3000)              │
└──────────────────────┬──────────────────────────────┘
                       │ /api (Vite Proxy)
┌──────────────────────▼──────────────────────────────┐
│              Express Server (localhost:3001)           │
│  ┌─────────┬──────────┬──────────────────────────┐   │
│  │ /api    │ /api/    │ /api/model-configs        │   │
│  │ generate │ records  │                         │   │
│  └────┬────┘────────┘──────────────────────────┘   │
│       │                                            │
│  ┌────▼──────────────────────────────────────────┐   │
│  │              Service Layer                    │   │
│  │  visionService  imageGenService  posterService│   │
│  └───────────────────────────────────────────────┘   │
│       │                                            │
│  ┌────▼───────────────────────────────────────────┐   │
│  │            SQLite (sql.js)                      │   │
│  │         data/lightbulb.db                     │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### 技术选型

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | React 18 + TypeScript | ^18.3.1, ^5.6.2 |
| **构建工具** | Vite | ^5.4.10 |
| **CSS 框架** | TailwindCSS | ^3.4.14 |
| **UI 组件库** | Radix UI + shadcn/ui (CVA) | - |
| **动画库** | Framer Motion | ^11.9.0 |
| **图标库** | Lucide React | ^0.454.0 |
| **HTTP 客户端** | Axios | ^1.7.7 |
| **状态管理** | React Hooks (useState/useContext) | - |
| **后端框架** | Express.js + TypeScript | ^4.21.0, ^5.6.2 |
| **数据库** | sql.js (嵌入式 SQLite) | ^1.11.0 |
| **AI SDK** | OpenAI Node.js SDK | ^4.68.2 |
| **请求校验** | Zod | ^3.23.8 |
| **运行时** | tsx (Node.js TypeScript 执行器) | ^4.19.1 |

---

## 3 目录结构详解

```
lightbulb-AI/
├── start.bat                          # 一键启动脚本
├── DEVELOPER.md                       # 本手册 ← 你在这里
│
├── backend/
│   ├── package.json                   # 后端依赖配置
│   ├── tsconfig.json                  # TS 编译配置
│   └── src/
│       ├── index.ts                    # 入口：创建 HTTP 服务
│       ├── app.ts                      # Express 应用工厂函数（中间件+路由注册）
│       ├── database.ts                 # SQLite 数据库操作层（建表/CRUD）
│       ├── types/
│       │   └── index.ts                # 后端类型定义（APIConfig/Request/Response 接口）
│       ├── middleware/
│       │   ├── errorHandler.ts        # 全局错误处理中间件
│       │   └── validateRequest.ts     # Zod 请求校验 schema
│       ├── services/
│       │   ├── visionService.ts        # 视觉分析服务（qwen-vl-plus）
│       │   ├── imageGenService.ts      # 图片生成服务（OpenAI/qwen-image）
│       │   └── posterService.ts        # 海报生成服务（分析+生图组合）
│       └── routes/
│           ├── generate.ts             # API：视觉分析/图片生成/海报生成
│           ├── modelConfigs.ts          # API：模型配置 CRUD + 测试连接 + 能力检测
│           └── records.ts              # API：生成记录查询/创建/删除
│
├── frontend/
│   ├── package.json                   # 前端依赖配置
│   ├── vite.config.ts                 # Vite 配置（路径别名 + API 代理到 3001）
│   ├── index.html                      # HTML 入口
│   └── src/
│       ├── main.tsx                     # ReactDOM 渲染入口
│       ├── App.tsx                      # 根组件（Tab 切换 5 个页面 + 动画）
│       ├── index.css                     # 全局样式（TailwindCSS）
│       │
│       ├── types/
│       │   ├── index.ts                # 前端类型定义（APIConfig/ModelConfig/FeatureType 等）
│       │   └── api.ts                  # 前端 API 请求/响应类型定义
│       │
│       ├── lib/
│       │   └── utils.ts               # 工具函数（cn/imageToBase64/compressImage/formatTokens...）
│       │
│       ├── services/
│       │   ├── api.ts                  # Axios API 客户端（vision/image/poster/records/modelConfigs）
│       │   └── storage.ts             # localStorage 持久化 + 后端 DB 同步封装
│       │
│       ├── hooks/
│       │   ├── useGeneration.ts        # 核心逻辑 Hook（analyze/generate/generateThreeView/generatePoster）
│       │   ├── useApiConfig.ts         # 模型配置管理 Hook（CRUD/测试/检测能力）
│       │   └── useTheme.ts             # 主题切换 Hook（dark/light）
│       │
│       ├── components/
│       │   ├── Layout.tsx               # 布局壳（Header + main + footer + 记录弹窗）
│       │   ├── Header.tsx               # 导航栏（Tab 切换 + Logo + 鼠标跟随效果）
│       │   ├── AvatarMenu.tsx           # 头像菜单（模型管理/记录/主题切换）
│       │   ├── ModelDropdown.tsx        # 页面内模型选择下拉框（按 category 过滤）
│       │   ├── ModelSelector.tsx        # 模型选择弹窗（旧版 UI，完整配置界面）
│       │   ├── ModelManagerContent.tsx  # 模型管理内容（新版，支持编辑/纯文本类别）
│       │   ├── ImageUploadZone.tsx      # 图片上传区域（拖拽+点击+压缩）
│       │   ├── RecordDetailDialog.tsx    # 记录详情弹窗（图片/提示词/元信息）
│       │   ├── ThemeToggle.tsx          # 亮暗模式切换按钮
│       │   └── ui/                     # shadcn/ui 组件
│       │       ├── button.tsx
│       │       ├── card.tsx
│       │       ├── dialog.tsx
│       │       ├── input.tsx
│       │       ├── label.tsx
│       │       ├── select.tsx
│       │       ├── switch.tsx
│       │       ├── tabs.tsx
│       │       └── textarea.tsx
│       │
│       └── pages/
│           ├── InspirationPage.tsx     # 灵感提示页
│           ├── CharacterGenPage.tsx     # 角色生图页
│           ├── ThreeViewPage.tsx       # 角色三视图页
│           ├── PosterGenPage.tsx       # 海报生成页
│           ├── CgGenPage.tsx           # CG 生成页（占位）
│           └── RecordsPage.tsx         # 历史记录页
│
└── .codebuddy/
    ├── agents/                        # CodeBuddy Agent 定义
    └── skills/                        # CodeBuddy Skill 定义
```

---

## 4 后端架构详解

### 4.1 入口 (`index.ts` + `app.ts`)

```typescript
// index.ts: 启动 HTTP 服务，监听端口 3001
// app.ts: createApp() 工厂函数，返回配置好的 Express 应用
```

**中间件链（按顺序）**：
1. 请求日志中间件（记录 method、path、status、耗时）
2. CORS（跨域允许）
3. JSON 解析（限制 50MB）
4. URL-encoded 解析（限制 50MB）

**路由注册**：
| 路由前缀 | 路由模块 | 功能 |
|----------|---------|------|
| `/api` | `routes/generate` | 视觉分析、图片生成、海报生成 |
| `/api/records` | `routes/records` | 生成记录 CRUD |
| `/api/model-configs` | `routes/modelConfigs` | 模型配置管理 + 连接测试 + 能力检测 |

**健康检查**：`GET /health` → `{ status: "ok", timestamp }`

### 4.2 数据库层 (`database.ts`)

使用 **sql.js**（纯 JS/TS 实现的 SQLite）：
- 数据库文件路径：`data/lightbulb.db`（自动创建 data 目录）
- 单例模式：`db` 全局变量 + `getDatabase()` 异步初始化
- 每次**写入操作**后调用 `saveDatabase()` 持久化到磁盘

### 4.3 类型定义 (`types/index.ts`)

```typescript
interface APIConfig {
  provider: 'openai' | 'google' | 'deepseek' | 'xfyun' | 'custom';
  model: string;
  endpoint: string;
  apiKey: string;
  useProxy: boolean;
  proxyEndpoint: string;
}

interface VisionAnalysisResult {
  analysis: { zh: string; en: string };
}

interface GenerationRecord {
  id: number;
  featureType: 'inspiration' | 'character' | 'threeview' | 'poster';
  prompt?: string;
  uploadImages: string;              // base64 缩略图，逗号分隔多图
  generatedImages: string;           // base64 缩略图
  uploadImagesOriginal?: string;     // base64 原图
  generatedImagesOriginal?: string;  // base64 原图
  modelProvider: string;
  modelName: string;
  tokenUsage: number;
  createdAt: string;
}
```

### 4.4 服务层 (`services/`)

#### `visionService.ts` — 视觉分析

- **固定使用** `qwen-vl-plus` 模型（阿里云 DashScope）
- **固定 endpoint**：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- 支持 4 种分析类别（通过 prompt 区分）：
  - `character` — 角色分析（含头身比/三庭五眼等比例分析）
  - `landscape` — 场景/风景分析
  - `object` — 物品/材质分析
  - `other` — 通用分析
- 返回格式：`{ analysis: { zh: "...", en: "..." }, category: "..." }`

#### `imageGenService.ts` — 图片生成

两条路径：

| 条件 | 走向 |
|------|------|
| 模型名以 `qwen-image` 开头 | 阿里云 DashScope 多模态 API（fetch 直接调用）|
| 其他模型 | OpenAI Images API（通过 openai Node SDK）|

**OpenAI 路径**：
- 通过 `createOpenAIClient(config)` 创建客户端
- 支持代理：优先使用 `proxyEndpoint`
- 调用 `client.images.generate({ model, prompt, n: 1, size, response_format: "b64_json" })`

**qwen-image 路径**：
- 尺尺寸映射：`1024x1024 → 2048*2048`, `1792x1024 → 2688*1536`
- 端点：`{endpoint}/services/aigc/multimodal-generation/generation`
- 返回图片 URL → 再 fetch 下载转 base64
- 支持参考图（图生图）：作为消息中的 `image_url` 类型传入

#### `posterService.ts` — 海报生成

组合流程：
1. 对第一张参考图调用 `analyzeImage()` 提取画风特征
2. 合成增强 prompt：`Poster design: {userPrompt}. Style: {analysis.en}`
3. 调用 `generateImage(enhancedPrompt, config, "1792x1024")` 生成海报

### 4.5 路由层 (`routes/`)

#### `generate.ts` — 三合一路由

| 方法 | 路径 | 功能 | Schema 校验 |
|------|------|------|------------|
| POST | `/api/vision/analyze` | 视觉分析 | `analyzeSchema` |
| POST | `/api/image/generate` | 图片生成 | `generateImageSchema`（含 referenceImage 可选字段） |
| POST | `/api/poster/generate` | 海报生成 | `generatePosterSchema` |

错误处理：按错误码分类返回中文友好消息（502 连接失败 / 504 超时 / 401 无效 Key / 429 限流 / 400 校验失败）

#### `modelConfigs.ts` — 模型配置管理

**CRUD 操作**：

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/` | 获取所有配置（按 is_active DESC, updated_at DESC） |
| GET | `/active` | 获取当前激活的配置 |
| GET | `/:id` | 获取单个配置 |
| POST | `/` | 创建配置（如设 isActive 则自动激活） |
| PUT | `/:id` | 更新配置（部分更新，自动 touch updated_at） |
| DELETE | `/:id` | 删除配置 |
| POST | `/:id/activate` | 设为当前激活配置 |
| POST | `/test-connection` | **测试 API 连通性** |
| POST | `/detect-capabilities` | **检测模型能力**（vision/text/image-generation） |

**test-connection 逻辑**：
- Google：GET `{baseUrl}/v1beta/models?key={apiKey}` 
- OpenAI 兼容：图像模型测 `/images/generations`，文本模型测 `/chat/completions`

**detect-capabilities 逻辑**：
1. 发送带 1x1 透明图的 chat completions 请求测试 vision
2. 根据模型名白名单判断是否为图像生成模型（dall-e/gpt-image/imagen/wanx/seedance/ernie-vilg）
3. 输出：`capabilities[]` + `category`（vision / text-to-image / image-to-image）

#### `records.ts` — 生成记录

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/` | 分页查询记录（page/pageSize 参数） |
| POST | `/` | 创建记录 |
| DELETE | `/:id` | 删除记录（先校验存在性） |

### 4.6 中间件 (`middleware/`)

- **errorHandler.ts**：统一捕获错误，返回 `{ error: message }`
- **validateRequest.ts**：Zod schema 定义（analyzeSchema / generateImageSchema / generatePosterSchema / createRecordSchema / modelConfigSchema / testConnectionSchema）

---

## 5 前端架构详解

### 5.1 入口与应用

```
main.tsx → ReactDOM.createRoot → <App />
App.tsx → useState<FeatureType>('inspiration') → switch(activeTab) 渲染对应 Page
         ↓
Layout (Header + main + footer)
```

**FeatureType 类型**：`'inspiration' | 'character' | 'threeview' | 'poster' | 'cg'`

**动画**：framer-motion 的 AnimatePresence 做 Tab 切换淡入淡出（opacity + y 位移动画，200ms）

### 5.2 状态管理

**无全局状态库**，采用 React Hooks + Context 轻量方案：

| Hook | 职责 | 数据来源 |
|------|------|---------|
| `useGeneration` | 分析/生图/三视图/海报的核心业务逻辑 | services/api + services/storage |
| `useApiConfig` | 模型配置 CRUD / 测试连接 / 能力检测 / 类别过滤 | services/storage + api |
| `useTheme` | 主题切换 (dark/light) | localStorage |

### 5.3 API 客户端 (`services/api.ts`)

Axios 实例配置：
- baseURL: `/api`（Vite 代理到 3001）
- timeout: **120000ms**（2 分钟，适应慢速图像生成）
- Response interceptor：统一提取 `error.response.data.error` 作为错误消息

**API 分组**：

| 导出对象 | 方法 |
|---------|------|
| `visionApi` | `.analyze(data)` |
| `imageApi` | `.generate(data)` |
| `posterApi` | `.generate(data)` |
| `recordsApi` | `.getAll(page, pageSize)` / `.create(data)` / `.delete(id)` |
| `modelConfigsApi` | `.getAll()` / `.getById(id)` / `.getActive()` / `.create(data)` / `.update(id, data)` / `.delete(id)` / `.activate(id)` / `.testConnection(data)` / `.detectCapabilities(data)` |

### 5.4 本地存储与服务同步 (`services/storage.ts`)

**双层存储策略**：

| 层 | 存储 | 用途 |
|-----|------|------|
| Legacy | localStorage（key 前缀 `charaforge_api_`） | 向后兼容旧版配置 |
| Primary | Backend Database（通过 API） | 新版模型管理系统 |

暴露函数：
- Legacy：`getConfig()` / `saveConfig()` / `getCurrentProvider()` / `setCurrentProvider()`
- New：`getModelConfigs()` / `getActiveModelConfig()` / `saveModelConfig()` / ... / `activateModelConfig()`
- Theme：`getTheme()` / `setTheme()`

### 5.5 Vite 配置

```typescript
// vite.config.ts
{
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 3000,
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } }
  }
}
```

`@` → `src/` 路径别名。

### 5.6 组件树

```
<App>
  <Layout>
    <Header> (Tabs + Logo + AvatarMenu)
    <main>
      <AnimatePresence> → <Page/> (按 activeTab 切换)
    <footer> © 2026 Lightbulb AI
    <Dialog> (RecordsPage embedded)
```

**核心组件职责**：

| 组件 | 职责 |
|------|------|
| `ModelDropdown` | 页面内的模型选择下拉框，按 category（vision/text-to-image/image-to-image）过滤可用模型 |
| `ModelSelector` | 完整的模型配置弹窗（旧版，保留兼容） |
| `ModelManagerContent` | 新版模型管理面板（支持编辑名称/模型/类别、含 text 类别、8 大服务商完整模型列表） |
| `ImageUploadZone` | 拖拽/点击上传，自动压缩（默认 1024px / quality 0.85） |
| `RecordDetailDialog` | 记录详情弹窗（图片展示 + 提示词 + 元信息 + 下载） |

### 5.7 UI 组件库

全部基于 **Radix UI Primitives** + **CVA (class-variance-authority)** 封装：
- Button（default/destructive/outline/secondary/ghost/link × sm/default/lg/icon）
- Card（Card/CardHeader/CardContent/CardTitle）
- Dialog / Input / Label / Select / Switch / Tabs / Textarea

---

## 6 模型连接机制

### 6.1 支持的服务商（8 家）

| Provider ID | 名称 | 模型示例 | 特殊处理 |
|-----------|------|---------|---------|
| `openai` | OpenAI | GPT-4o, DALL-E 3, GPT Image 1 | 标准 OpenAI API |
| `google` | Google Gemini | Gemini 2.5 Flash/Pro, Imagen 3/4 | GET /v1beta/models 鉴权 |
| `deepseek` | DeepSeek | DeepSeek V3/R1, Janus-Pro | Bearer Token |
| `aliyun` | 阿里云 通义千问 | Qwen-VL-Max/Plus, Wanx v1/2.1 | qwen-image 自定义 API |
| `bytedance` | 字节跳动 豆包 | Doubao Pro/Vision, Seedance | Bearer Token |
| `baidu` | 百度 文心一言 | Ernie 4.0, Ernie-VILG | Bearer Token |
| `xfyun` | 讯飞星火 | Spark 4.0 Ultra/Vision | APIKey:APISecret 格式 |
| `custom` | 自定义 | 用户自填 | 手动输入 endpoint + model |

### 6.2 模型配置关键字段

`model_configs` 表结构：

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | TEXT | 配置显示名称（如"我的 GPT-4o"） |
| `provider` | TEXT | 服务商 ID（见上表） |
| `model` | TEXT | 模型 ID（如 `gpt-4o`、`qwen-vl-plus`） |
| `api_key` | TEXT | API 密钥（加密存储） |
| `endpoint` TEXT | API 端点 URL（自定义服务商必填） |
| `use_proxy` | INTEGER (0/1) | 是否启用代理 |
| `proxy_endpoint` | TEXT | 代理地址 |
| `category` | TEXT | 模型能力类别（见下） |
| `capabilities` | TEXT | 能力标签 JSON 数组（如 `["vision","text"]`） |
| `is_active` | INTEGER (0/1) | 是否为当前激活配置 |

### 6.3 Category（模型能力类别）

| Category | 含义 | 使用场景 |
|----------|------|---------|
| `vision` | 多模态（图片理解 + 文本） | 灵感提示 |
| `text-to-image` | 文生图 | 角色生图 |
| `image-to-image` | 图生图 | 三视图、海报生成 |
| `text` | 纯文本 | （扩展预留） |

### 6.4 调用流程

**以「角色生图」为例**：

```
用户点击"生成图片"
    ↓
CharacterGenPage → useGeneration().generate(prompt)
    ↓
[Hook 内部]
1. useApiConfig → getCurrentProvider() + getConfig(provider) → 获取 APIConfig
2. imageApi.generate({ prompt, config, size })
    ↓
[API 调用]
POST /api/image/generate
    ↓
[后端 routes/generate.ts]
generateImageSchema 校验 → imageGenService.generate(prompt, config, size)
    ↓
[imageGenService]
config.model === 'qwen-*' ? 调用阿里云 DashScope API : 调用 OpenAI Images API
    ↓
返回 { imageBase64, tokenUsage }
    ↓
[Hook 后续]
compressImage(200px 缩略图) → recordsApi.create(record) → 返回 base64 给页面
```

### 6.5 能力检测逻辑 (`detect-capabilities`)

保存模型配置时**自动触发**（非 custom 商家）：

1. **Vision 测试**：发送带 1px 透明图片的 chat completions 请求
   - 成功 → 标记 `['vision', 'text']`，category = `'vision'`
   - 失败（vision 相关错误）→ 继续
2. **文生图推断**：检查模型名是否在已知图像生成模型列表中
   - 匹配 → 添加 `image-generation` 能力
3. **图生图推断**：检查是否为 gpt-image-1 或 wanx-v1
   - 匹配 → 添加 `image-editing` 能力
4. **兜底**：以上都不匹配 → 仅标记 `['text']`

---

## 7 数据库表结构说明

### 7.1 `generation_records` — 生成记录

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK AUTOINCREMENT | 记录 ID |
| `feature_type` | TEXT | NOT NULL | 功能类型：`inspiration` / `character` / `threeview` / `poster` |
| `prompt` | TEXT | - | 提示词或 JSON 格式的分析结果 |
| `upload_images` | TEXT | - | 上传图片 base64 缩略图（200px，逗号分隔多图） |
| `generated_images` | TEXT | - | 生成图片 base64 缩略图（200px，逗号分隔多图） |
| `upload_images_original` | TEXT | - | 上传图片原始 base64（原图，可选字段） |
| `generated_images_original` | TEXT | - | 生成图片原始 base64（原图，可选字段） |
| `model_provider` | TEXT | - | 使用的服务商 |
| `model_name` | TEXT | - | 使用的模型名 |
| `token_usage` | INTEGER | DEFAULT 0 | Token 消耗量 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间戳 |

### 7.2 `model_configs` — 模型配置

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK AUTOINCREMENT | 配置 ID |
| `name` | TEXT | NOT NULL | 显示名称 |
| `provider` | TEXT | NOT NULL | 服务商 ID |
| `model` | TEXT | NOT NULL | 模型 ID |
| `api_key` | TEXT | - | API 密钥 |
| `endpoint` | TEXT | - | 自定义端点 |
| `use_proxy` | INTEGER | DEFAULT 0 | 是否启用代理 |
| `proxy_endpoint` | TEXT | - | 代理地址 |
| `category` | TEXT | NOT NULL | 能力类别 |
| `capabilities` | TEXT | - | 能力标签 JSON 数组 |
| `is_active` | INTEGER | DEFAULT 0 | 是否激活（同一时间只有一个 active） |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

### 7.3 `app_settings` — 应用设置

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `key` | TEXT | **PRIMARY KEY** | 设置键名 |
| `value` | TEXT | NOT NULL | 设置值 |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

用途：存储应用级偏好（主题等）。

### 7.4 双图存储机制

为了平衡存储空间和图片质量，系统采用**原图 + 缩略图**双存储策略：

#### 存储规格

| 图片类型 | 规格 | 大小 | 用途 |
|---------|------|------|------|
| 缩略图（`*_images`） | 200px 宽度，JPEG quality=0.7 | ~10-30KB | 历史记录列表快速加载 |
| 原图（`*_images_original`） | 原始分辨率，PNG/base64 | ~500KB-3MB | 查看高清原图、下载 |

#### 字段对应关系

| 缩略图字段 | 原图字段 |
|-----------|---------|
| `upload_images` | `upload_images_original` |
| `generated_images` | `generated_images_original` |

#### 前端展示策略

- **历史记录列表**：展示缩略图（200px），实现快速加载
- **记录详情弹窗**：
  - 默认显示缩略图
  - 点击"查看原图"按钮切换到高清原图
  - 独立提供"下载原图"按钮

#### 技术实现

1. **生图时**：
   - `useGeneration.ts` 中 `generate()` 函数同时返回 `imageBase64`（缩略图）和原图
   - 调用 `compressImageAsBase64()` 生成 200px 缩略图
   - 创建记录时同时传入缩略图和原图

2. **存储时**：
   - 后端 `routes/records.ts` 的 POST 路由同时写入缩略图和原图字段
   - 数据库使用 `ALTER TABLE` 兼容旧数据库（可选字段）

3. **读取时**：
   - GET /records 返回所有字段，包括 Original 字段
   - 前端根据需要展示缩略图或原图

#### 注意事项

- **存储空间**：原图会显著增加 SQLite 数据库体积，建议定期清理旧记录
- **向后兼容**：`*_images_original` 字段为可选，旧记录此字段为空
- **传输优化**：列表接口仍返回缩略图，详情弹窗才展示原图，避免列表加载卡顿

---

## 8 API 接口文档

### 8.1 视觉分析

**POST** `/api/vision/analyze`

**请求体**：
```json
{
  "imageBase64": "<base64编码的图片>",
  "config": {
    "provider": "aliyun",
    "model": "qwen-vl-plus",
    "endpoint": "https://dashscope.aliyuncs.com/...",
    "apiKey": "sk-xxx",
    "useProxy": false,
    "proxyEndpoint": ""
  },
  "category": "character"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "analysis": {
      "zh": "详细的中文分析结果...",
      "en": "Detailed English analysis..."
    }
  },
  "tokenUsage": 1500
}
```

### 8.2 图片生成

**POST** `/api/image/generate`

**请求体**：
```json
{
  "prompt": "一个银发红瞳的女战士",
  "config": { /* 同上 */ },
  "size": "1024x1024",
  "referenceImage": "<可选：参考图base64>"
}
```

**响应**：
```json
{
  "success": true,
  "data": { "imageBase64": "<base64>" },
  "tokenUsage": 250
}
```

支持的 `size` 值：`1024x1024` | `1024x1792` | `1792x1024`

### 8.3 海报生成

**POST** `/api/poster/generate`

**请求体**：
```json
{
  "images": ["<角色图base64>", "<海报参考图base64>"],
  "prompt": "赛博朋克风格海报，城市背景",
  "config": { /* 同上 */ }
}
```

响应格式同 8.2。

### 8.4 模型配置 CRUD

**GET** `/api/model-configs` → 所有配置列表
**GET** `/api/model-configs/active` → 当前激活配置
**GET** `/api/model-configs/:id` → 单个配置详情
**POST** `/api/model-configs` → 创建配置
**PUT** `/api/model-configs/:id` → 更新配置（部分字段）
**DELETE** `/api/model-configs/:id` → 删除配置
**POST** `/api/model-configs/:id/activate` → 激活配置

**POST** `/api/model-configs/test-connection` — 测试连通性

请求：
```json
{ "provider": "openai", "apiKey": "sk-...", "model": "gpt-4o", "endpoint": "...", "useProxy": false }
```
响应：`{ "success": true/false, "message": "API 连接成功/失败原因" }`

**POST** `/api/model-configs/detect-capabilities` — 检测模型能力

请求同 test-connection。
响应：`{ "success": true, "data": { "capabilities": ["vision","text"], "category": "vision" } }`

### 8.5 生成记录

**GET** `/api/records?page=1&pageSize=20` → 分页列表
**POST** `/api/records` → 创建记录
**DELETE** `/api/records/:id` → 删除记录

---

## 9 核心业务流程

### 9.1 灵感提示流程

```
用户上传图片 → 选择分析类型(character/landscape/object/other)
    ↓
[前端] InspirationPage
    ↓
POST /api/vision/analyze (imageBase64 + config + category)
    ↓
[后端] visionService.analyzeImage()
  → 根据 category 生成差异化 prompt（character 含比例分析）
  → 调用 qwen-vl-plus (DashScope compatible-mode/v1)
  → 解析 JSON 响应（去除 markdown 代码块标记）
    ↓
返回 { analysis: { zh, en } }
    ↓
[前端] 显示分析结果
  → 提供 中/英/JSON 三种格式查看
  → 一键复制
  → 自动保存记录到 generation_records
```

### 9.2 角色生图流程

```
用户输入提示词 → 选择 text-to-image 类型的模型
    ↓
[前端] CharacterGenPage
    ↓
POST /api/image/generate (prompt + config + size)
    ↓
[后端] imageGenService.generateImage()
  → config.model === 'qwen-*' ?
    │   YES → 阿里云 DashScope API（支持参考图图生图）
    │   NO  → OpenAI Images API (DALL-E 等)
    ↓
返回 { imageBase64 }
    ↓
[前端] 显示生成的角色图片
  → 下载按钮（PNG）
  → 自动保存记录
```

### 9.3 三视图生成流程

```
上传参考图 + 输入提示词（必填）→ 选择 image-to-image 类型模型
    ↓
[前端] ThreeViewPage
    ↓
[循环 3 次] POST /api/image/generate
  第 1 次: "{prompt}, front view, character design sheet"
  第 2 次: "{prompt}, side view, character design sheet"
  第 3 次: "{prompt}, back view, character design sheet"
  (每次都传入同一张 referenceImage)
    ↓
返回 3 张 base64 图片
    ↓
[前端] 以 16:9 比例显示（正面/侧面/背面标签）
  → 下载单张或全部
  → 自动保存记录（generatedImages 用逗号拼接 3 张图）
```

### 9.4 海报生成流程

```
上传角色参考图（必填，最多 5 张）+ 输入描述（必填）
→ 选择海报尺寸（竖版9:16/横版16:9/正方形1:1 各有 1080p 和 2K 两档）
→ 选择 image-to-image 类型模型
    ↓
POST /api/poster/generate (images[] + prompt + config)
    ↓
[后端] posterService.generatePoster()
   Step 1: analyzeImage(第1张参考图) → 提取画风特征
  Step 2: 组合 prompt = "Poster design: {userPrompt}. Style: {analysis.en}"
  Step 3: generateImage(enhancedPrompt, config, "1792x1024")
    ↓
返回海报 base64
    ↓
[前端] 按所选尺寸比例展示
  → 下载
  → 自动保存记录
```

---

## 10 开发指南

### 10.1 环境搭建

**前提条件**：
- Node.js >= 18
- npm >= 9

**步骤**：
```bash
# 1. 克隆项目
git clone <repo-url>
cd lightbulb-AI

# 2. 安装后端依赖
cd backend && npm install

# 3. 安装前端依赖
cd ../frontend && npm install

# 4. 双击 start.bat 启动（或手动分两个终端）
# 终端1: cd backend && npm run dev
# 终端2: cd frontend && npm run dev
```

### 10.2 调试方法

- **后端日志**：console 输出每个 API 请求的方法、路径、耗时、状态码
- **服务层详细日志**：visionService/imageGenService/posterService 都有完整的请求/响应日志输出
- **浏览器 DevTools**：Network 面板可查看所有 API 调用
- **Vite HMR**：前端修改热更新

### 10.3 扩展新服务商

1. 在 `ModelSelector.tsx` 的 `PROVIDERS[]` 数组中添加新条目：
   ```typescript
   { id: 'new-provider', name: '新服务商', models: [
     { id: 'model-id', name: '显示名', category: 'vision', capabilities: ['vision','text'], description: '描述' },
   ]}
   ```
2. 在 `types/index.ts` 的 `APIConfig.provider` 联合类型中添加新值
3. 在 `modelConfigs.ts` 路由的 test-connection/detect-capabilities 中添加特殊鉴权逻辑（如有需要）

### 10.4 扩展新功能页面

1. 在 `App.tsx` 的 FeatureType 和 renderPage() switch 中添加新 case
2. 创建 `pages/NewPage.tsx` 组件
3. 在 `Layout.tsx` Header 的 TABS 数组中添加导航项
4. 如需新的 API，在 `services/` 添加 API 函数，在 `routes/` 添加路由，在 `services/` 添加 hook

### 10.5 注意事项

- **图片体积**：所有图片以 base64 传输，采用双图存储（缩略图 + 原图），注意前端压缩（200px 缩略图存 DB）和后端 50MB body limit。详见 [7.4 双图存储机制](#74-双图存储机制)
- **并发安全**：sqlite.js 是单线程写入，高并发时注意 saveDatabase() 时序
- **API Key 安全**：数据库明文存储 API Key（本地应用可接受），生产环境应加密
- **代理配置**：国内访问 OpenAI/Google API 时需配置代理

---

## A 附录：HTTP 错误码对照表

| 错误码 | 含义 | 用户提示文案 |
|--------|------|-------------|
| 200 | 成功 | - |
| 400 | 请求参数校验失败 | "请求参数有误，请检查输入" |
| 401 | API Key 无效或过期 | "API Key 无效，请检查配置" |
| 404 | 资源不存在 | "未找到该资源" |
| 429 | 请求频率超限 | "API 请求过于频繁，请稍后重试" |
| 500 | 服务器内部错误 | "服务器内部错误，请重试" |
| 502 | 无法连接到 API 服务 | "无法连接到 API 服务，请检查代理设置" |
| 504 | API 请求超时 | "API 请求超时，请检查网络连接" |

---

## B 附录：常用模型 ID 参考

### OpenAI

| 模型 ID | 类别 | 说明 |
|---------|------|------|
| `gpt-4o` | vision | 最新多模态，支持图片分析 |
| `gpt-4o-mini` | vision | 轻量多模态 |
| `gpt-4.1` | vision | 最新 GPT-4 系列 |
| `dall-e-3` | text-to-image | OpenAI 图像生成 |
| `gpt-image-1` | image-to-image | 图像生成/编辑 |

### Google Gemini

| 模型 ID | 类别 | 说明 |
|---------|------|------|
| `gemini-2.5-flash` | vision | 高速多模态 |
| `gemini-2.5-pro` | vision | 高性能多模态 |
| `gemini-2.0-flash` | vision | 快速推理 |
| `imagen-3` | text-to-image | Google 图像生成 |
| `imagen-4` | text-to-image | 最新图像生成 |

### 阿里云

| 模型 ID | 类别 | 说明 |
|---------|------|------|
| `qwen-vl-max` | vision | 通义千问视觉大模型 |
| `qwen-vl-plus` | vision | 轻量视觉模型（**视觉分析固定使用此模型**） |
| `wanx-v1` | image-to-image | 通义万相图生图 |
| `wanx2.1` | text-to-image | 新一代图像生成 |

### 字节跳动

| 模型 ID | 类别 | 说明 |
|---------|------|------|
| `doubao-pro-32k` | text | 长文本处理 |
| `doubao-vision` | vision | 多模态理解 |
| `seedance` | text-to-image | 视频/图像生成 |

### 百度

| 模型 ID | 类别 | 说明 |
|---------|------|------|
| `ernie-4.0` | text | 文心大模型 |
| `ernie-4-vision` | vision | 文心多模态 |
| `ernie-vilg` | text-to-image | 文心一格 AI 画 |

### 讯飞星火

| 模型 ID | 类别 | 说明 |
|---------|------|------|
| `xunfeispark-4.0-ultra` | text | 讯飞旗舰 |
| `spark4-vision` | vision | 讯飞多模态 |

### DeepSeek

| 模型 ID | 类别 | 说明 |
|---------|------|------|
| `deepseek-chat` | text | 通用文本 V3 |
| `deepseek-r1` | text | 推理增强 |
| `janus-pro` | vision | 原生多模态 |

---

> **Changelog (v2.0 | 2026-04-28)**:
> - 基于 v1 手册全量重写，对齐最新代码
> - 新增：CG 生成页（CgGenPage）、FeatureType 增加 `cg` 类型
> - 新增：`generateImageSchema` 新增 `referenceImage` 可选字段（支持图生图）
> - 新增：`imageGenService` 新增 `qwen-image` 阿里云 DashScope 路径
> - 新增：`visionService` 新增 4 种分析类别（character/landscape/object/other）
> - 新增：`modelConfigs` 新增 `detect-capabilities` 端点（自动检测模型能力）
> - 新增：`ModelManagerContent` 新版模型管理面板（支持编辑、text 类别、8 家服务商完整模型列表）
> - 新增：前端 `APIConfig.provider` 类型新增 `aliyun` / `bytedance` / `baidu`（原仅 5 家）
> - 新增：前端 `ModelCategory` 类型新增 `text`（纯文本模型）
> - 重构：海报生成新增 7 种尺寸选项（竖版/横版/正方形各 1080p 和 2K）
> - 重构：三视图输出锁定 16:9 (2560x1440) 2K 横向宽屏
> - 数据库 schema 无变更（向下兼容）
