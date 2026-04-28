# Lightbulb AI 开发者手册

> **版本**: 1.0 | **更新日期**: 2026-04-28  
> 本文档面向开发者，提供项目的完整技术说明、架构解析和扩展指南。

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈与架构总览](#2-技术栈与架构总览)
3. [目录结构详解](#3-目录结构详解)
4. [后端架构详解](#4-后端架构详解)
5. [前端架构详解](#5-前端架构详解)
6. [模型连接机制](#6-模型连接机制)
7. [数据库表结构说明](#7-数据库表结构说明)
8. [API 接口文档](#8-api-接口文档)
9. [核心业务流程](#9-核心业务流程)
10. [开发指南](#10-开发指南)

---

## 1. 项目概述

**Lightbulb AI** 是一个**本地部署的 AI 创作辅助网站**，提供以下核心功能：

| 功能 | 说明 | 路由标识 |
|------|------|----------|
| 灵感提示 | 上传图片获取创作灵感/画风分析 | `inspiration` |
| 角色生图 | 根据文字/图片描述生成角色图 | `character` |
| 角色三视图 | 生成角色的正/侧/背面三视图 | `threeview` |
| 海报生成 | 组合 Vision 分析 + 图片生成制作海报 | `poster` |
| CG 生成 | （预留功能） | `cg` |

### 运行方式

- **一键启动**: 双击 `start.bat` 同时启动后端(3001)和前端(5173)服务
- **数据库**: SQLite 文件存储在 `data/lightbulb.db`
- **无外部依赖**: 所有数据本地存储，无需云服务器

---

## 2. 技术栈与架构总览

```
┌─────────────────────────────────────────────────────────┐
│                     前端 (Frontend)                       │
│  React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui │
│  状态管理: React Context + localStorage                  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (Vite Proxy /api → :3001)
┌──────────────────────▼──────────────────────────────────┐
│                     后端 (Backend)                        │
│           Node.js + Express + TypeScript                 │
│              数据库: SQLite (sql.js)                      │
│            AI 调用: OpenAI SDK (多服务商适配)             │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (OpenAI Compatible API)
┌──────────────────────▼──────────────────────────────────┐
│                   外部 AI 服务                            │
│  OpenAI / Google Gemini / DeepSeek / 讯飞星火 / 通义千问 │
│       字节豆包 / 百度文心 / 自定义兼容 API               │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 目录结构详解

```
lightbulb-AI/
├── backend/                          # 后端代码
│   ├── src/
│   │   ├── index.ts                  # 入口：启动 Express 服务器 (端口 3001)
│   │   ├── app.ts                    # Express 应用配置、路由注册、中间件挂载
│   │   ├── database.ts               # 数据库初始化 + CRUD 操作封装
│   │   ├── routes/                   # API 路由层
│   │   │   ├── generate.ts           # Vision分析 / 图片生成 / 海报生成
│   │   │   ├── records.ts            # 生成记录 CRUD
│   │   │   └── modelConfigs.ts       # 模型配置管理 + 连接测试 + 能力检测
│   │   ├── services/                 # 业务逻辑层（核心 AI 调用）
│   │   │   ├── visionService.ts      # Vision 图像理解服务
│   │   │   ├── imageGenService.ts    # 图片生成服务
│   │   │   └── posterService.ts      # 海报组合服务
│   │   ├── middleware/               # 中间件
│   │   │   ├── validateRequest.ts    # Zod 请求验证
│   │   │   └── errorHandler.ts       # 全局错误处理中间件
│   │   └── types/
│   │       └── index.ts              # 后端 TypeScript 类型定义
│   ├── package.json                  # 后端依赖
│   └── tsconfig.json
│
├── frontend/                         # 前端代码
│   ├── src/
│   │   ├── App.tsx                   # 根组件：Tab 页面切换
│   │   ├── main.tsx                  # React 入口
│   │   ├── components/               # UI 组件
│   │   │   ├── Layout.tsx            # 主布局（Header + Main + Footer）
│   │   │   ├── Header.tsx            # 顶部导航栏
│   │   │   ├── AvatarMenu.tsx        # 头像菜单（含模型管理入口）
│   │   │   ├── ModelManagerContent.tsx # 模型管理面板组件
│   │   │   ├── ModelDropdown.tsx     # 页面内嵌模型选择器
│   │   │   ├── ModelSelector.tsx     # 独立模型选择弹窗组件
│   │   │   ├── ImageUploadZone.tsx   # 拖拽上传区域
│   │   │   ├── RecordDetailDialog.tsx # 记录详情查看弹窗
│   │   │   ├── ThemeToggle.tsx       # 明暗主题切换
│   │   │   └── ui/                   # shadcn/ui 基础组件库
│   │   ├── pages/                    # 功能页面
│   │   │   ├── InspirationPage.tsx   # 灵感提示页
│   │   │   ├── CharacterGenPage.tsx  # 角色生图页
│   │   │   ├── ThreeViewPage.tsx     # 三视图页
│   │   │   ├── PosterGenPage.tsx     # 海报生成页
│   │   │   ├── CgGenPage.tsx         # CG 生成页（占位）
│   │   │   └── RecordsPage.tsx       # 历史记录列表页
│   │   ├── hooks/                    # 自定义 Hooks
│   │   │   ├── useApiConfig.ts       # API 配置状态 Hook（Context）
│   │   │   ├── useGeneration.ts      # 生成逻辑通用 Hook
│   │   │   └── useTheme.ts           # 主题切换 Hook
│   │   ├── services/                 # 前端服务层
│   │   │   ├── api.ts                # Axios 封装的 API 客户端
│   │   │   └── storage.ts            # localStorage 与后端同步存储
│   │   ├── types/                    # 前端类型定义
│   │   │   ├── index.ts              # 核心数据类型
│   │   │   └── api.ts                # API 请求/响应类型
│   │   └── lib/utils.ts              # 工具函数（cn 等）
│   ├── vite.config.ts               # Vite 构建配置（含代理规则）
│   ├── package.json
│   └── tailwind.config.js
│
├── data/
│   └── lightbulb.db                 # SQLite 数据库文件
│
├── start.bat                        # Windows 一键启动脚本
├── README.md                        # 用户使用手册
└── DEVELOPER.md                     # 本开发者手册
```

---

## 4. 后端架构详解

### 4.1 入口文件 — `backend/src/index.ts`

```typescript
// 核心职责：
// 1. 导入 app 实例
// 2. 在端口 3001 上启动 Express 服务器
// 3. 输出启动日志
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => { ... });
```

### 4.2 应用配置 — `backend/src/app.ts`

```typescript
// 核心职责：
// 1. 创建 Express 应用实例
// 2. 挂载 JSON 解析中间件 (express.json())
// 3. 挂载静态文件服务 (/uploads → uploads 目录)
// 4. 注册所有 API 路由
// 5. 注册全局错误处理中间件 errorHandler

// 路由映射：
app.use('/api/vision', visionRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/poster', posterRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/model-configs', modelConfigRoutes);
```

### 4.3 数据库层 — `backend/src/database.ts`

这是整个后端的**数据访问核心**，负责：

- **初始化 SQLite 数据库连接**
- **自动建表**（首次运行时）
- **封装所有 CRUD 操作**

**关键函数一览：**

| 函数名 | 操作 | 表 | 说明 |
|--------|------|-----|------|
| `initDatabase()` | 初始化 | 全部 | 创建全部三张表 |
| `getAllRecords()` | 查询 | generation_records | 获取所有生成记录 |
| `getRecordById(id)` | 查询单条 | generation_records | 按 ID 获取记录 |
| `insertRecord(record)` | 插入 | generation_records | 新增生成记录 |
| `updateRecord(id, data)` | 更新 | generation_records | 更新记录（如保存生成的图片） |
| `deleteRecord(id)` | 删除 | generation_records | 删除记录 |
| `clearAllRecords()` | 清空 | generation_records | 清空全部记录 |
| `getAllModelConfigs()` | 查询 | model_configs | 获取所有模型配置 |
| `getActiveModelConfig(category)` | 查询 | model_configs | 按 category 获取激活的模型 |
| `getModelConfigById(id)` | 查询单条 | model_configs | 按 ID 获取模型配置 |
| `createModelConfig(config)` | 插入 | model_configs | 新增模型配置 |
| `updateModelConfig(id, data)` | 更新 | model_configs | 更新模型配置 |
| `deleteModelConfig(id)` | 删除 | model_configs | 删除模型配置 |
| `setActiveModelConfig(id)` | 更新 | model_configs | 设置某模型为激活状态 |
| `getSetting(key)` / `setSetting(key,value)` | 读/写 | app_settings | 应用设置存取 |

### 4.4 服务层 — `backend/src/services/`

#### 4.4.1 visionService.ts — Vision 图像理解

**核心职责**: 接收用户上传的图片，调用 AI 模型进行图像分析。

**关键实现细节**:

```typescript
// 固定使用的模型：阿里云 qwen-vl-plus（DashScope 端点）
const VISION_MODEL = 'qwen-vl-plus';
const DASHSCOPE_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

// 构建 OpenAI 兼容客户端
const client = new OpenAI({
  apiKey: apiKey,
  baseURL: endpoint || DASHSCOPE_ENDPOINT,  // 默认走 DashScope
});

// 发送请求时构建消息格式（支持多张图片）
const content = [
  { type: 'text', text: prompt },
  ...images.map(img => ({
    type: 'image_url',
    image_url: { url: `data:image/jpeg;base64,${img}` }
  }))
];
```

**重要字段说明**:
- `prompt`: 用户输入的分析指令（如"分析这张图的画风"、"提取角色特征"）
- `images`: base64 编码的图片数组（前端传入）
- `apiKey` / `endpoint`: 从 app_settings 中读取或从请求中指定

#### 4.4.2 imageGenService.ts — 图片生成

**核心职责**: 根据 text prompt 生成图片。

**双模式支持**:

| 模式 | 判断条件 | 实现 |
|------|---------|------|
| **OpenAI DALL-E** | provider 为 `openai` 或模型包含 `dall-e` / `gpt-image` | 使用 `client.images.generate()` |
| **阿里通义千问** | provider 为 `aliyun` 或模型包含 `wanx` / `qwen-image` | 使用 Chat Completions 接口（特殊 prompt 包装） |

**DALL-E 模式调用示例**:
```typescript
const response = await client.images.generate({
  model: modelName,
  prompt: finalPrompt,          // 用户 prompt
  n: size === '1024x1792' ? 1 : n, // 数量
  size: size,                   // 尺寸选项
  quality: 'hd',                // 固定 HD 质量
});
```

**通义千问模式调用示例**:
```typescript
// 使用 chat completions 格式，prompt 需要包装为特定指令
const wrappedPrompt = `请根据以下描述生成一张图片：${prompt}`;
const response = await client.chat.completions.create({
  model: modelName,
  messages: [{ role: 'user', content: wrappedPrompt }],
});
```

#### 4.4.3 posterService.ts — 海报生成

**核心职责**: **两阶段流水线** — 先用 Vision 分析画风/元素，再用图片生成产出最终海报。

```
用户上传参考图 + Prompt
        ↓
[阶段一] visionService.analyze() → 获取画风/构图/色彩分析结果
        ↓
[阶段二] imageService.generateImage() → 将分析结果融合进最终 prompt → 生成海报
        ↓
返回: 生成的海报图片 (base64)
```

### 4.5 中间件 — `backend/src/middleware/`

#### validateRequest.ts
- 使用 **Zod** schema 定义进行请求体验证
- 自动校验必填字段、字段类型、枚举值范围
- 校验失败返回 400 错误及详细错误信息

#### errorHandler.ts
- 全局异常捕获 `(err, req, res, next)`
- 统一错误响应格式: `{ success: false, error: { code, message } }`
- 处理 ZodValidationError、已知业务错误、未知错误的分类输出

### 4.6 后端类型定义 — `backend/src/types/index.ts`

```typescript
// 核心类型：

interface ModelConfig {
  id?: number;
  name: string;              // 配置显示名称
  provider: string;          // 服务商标识
  model: string;             // 模型 ID（如 gpt-image-1, wanx-v1）
  apiKey: string;            // API 密钥
  endpoint: string;          // 自定义端点 URL
  useProxy: number;          // 是否启用代理 (0/1)
  proxyEndpoint: string;     // 代理地址
  category: string;          // 模型类别（vision/text-to-image/image-to-image/text）
  capabilities: string[];    // 能力标签列表
  isActive: number;          // 是否为当前激活模型 (0/1)
}

interface GenerationRecord {
  id?: number;
  featureType: string;       // 功能类型标识
  prompt: string;            // 用户输入
  uploadImages?: string[];   // 上传图片 base64 数组
  generatedImages?: string[];// 生成图片 base64 数组
  modelProvider: string;     // 使用的是哪个服务商
  modelName: string;         // 使用的是哪个模型
  tokenUsage: number;        // Token 消耗统计
}
```

---

## 5. 前端架构详解

### 5.1 组件树

```
App.tsx (根组件 - Tab 切换)
├── Layout.tsx (主布局)
│   ├── Header.tsx (顶部导航)
│   │   └── AvatarMenu.tsx (头像下拉菜单 → 模型管理入口)
│   ├── <FeaturePage> (当前选中的功能页面)
│   │   ├── ModelDropdown.tsx (页面内模型选择器)
│   │   ├── ImageUploadZone.tsx (图片拖拽上传区)
│   │   └── [页面特有 UI]
│   ├── RecordDetailDialog.tsx (记录详情弹窗)
│   └── Footer.tsx
├── ModelSelector.tsx (独立模型选择弹窗 - 全局覆盖)
└── ThemeToggle.tsx (主题切换按钮)
```

### 5.2 页面路由（Tab 切换）

前端**不使用 React Router**，而是通过 `App.tsx` 中的 Tab state 切换页面：

```typescript
// App.tsx 中的 tab 映射
const tabs = [
  { id: 'inspiration', label: '灵感提示', component: InspirationPage },
  { id: 'character', label: '角色生图', component: CharacterGenPage },
  { id: 'threeview', label: '角色三视图', component: ThreeViewPage },
  { id: 'poster', label: '海报生成', component: PosterGenPage },
  { id: 'cg', label: 'CG生成', component: CgGenPage },
  { id: 'records', label: '历史记录', component: RecordsPage },
];
```

### 5.3 状态管理

采用 **React Context + localStorage** 的轻量方案：

| Context/Hook | 管理 | 存储位置 |
|-------------|------|---------|
| `ApiConfigContext` (`useApiConfig`) | API 地址配置（baseUrl） | localStorage `api-config` |
| `useGeneration()` | 生成状态（loading/result/error） | 组件 local state |
| `useTheme()` | 明暗主题偏好 | localStorage `theme` |
| `storage service` | 模型配置同步 | localStorage + 后端 DB 双写 |

### 5.4 API 客户端 — `frontend/src/services/api.ts`

基于 **Axios** 封装，统一处理后端通信：

```typescript
// 基础配置
const apiClient = axios.create({ baseURL: '/api' });

// 通过 Vite Proxy 转发到 http://localhost:3001/api/*
```

**提供的 API 方法**:

| 方法 | HTTP | 路径 | 用途 |
|------|------|------|------|
| `analyzeVision(image, prompt)` | POST | `/vision/analyze` | Vision 分析 |
| `generateImage(params)` | POST | `/image/generate` | 图片生成 |
| `generatePoster(data)` | POST | `/poster/generate` | 海报生成 |
| `getRecords()` | GET | `/records` | 获取记录列表 |
| `createRecord(data)` | POST | `/records` | 新建记录 |
| `updateRecord(id, data)` | PUT | `/records/:id` | 更新记录 |
| `deleteRecord(id)` | DELETE | `/records/:id` | 删除记录 |
| `getModelConfigs()` | GET | `/model-configs` | 获取模型配置 |
| `createModelConfig(data)` | POST | `/model-configs` | 新建模型配置 |
| `updateModelConfig(id, data)` | PUT | `/model-configs/:id` | 更新模型配置 |
| `deleteModelConfig(id)` | DELETE | `/model-configs/:id` | 删除模型配置 |
| `testConnection(data)` | POST | `/model-configs/test-connection` | 测试连接 |
| `detectCapabilities(data)` | POST | `/model-configs/detect-capabilities` | 检测能力 |
| `setActiveModel(id)` | PUT | `/model-configs/:id/active` | 设为激活 |

### 5.5 Vite 代理配置 — `frontend/vite.config.ts`

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',  // 转发到后端
      changeOrigin: true,
    }
  }
}
```

前端开发服务器在 `5173`，所有 `/api/*` 请求自动转发到后端 `3001` 端口，解决跨域问题。

### 5.6 前端核心类型 — `frontend/src/types/index.ts`

```typescript
type FeatureType = 'inspiration' | 'character' | 'threeview' | 'poster' | 'cg';

type ModelProvider = 
  | 'openai'      // OpenAI (GPT/DALL-E)
  | 'google'      // Google Gemini
  | 'deepseek'    // DeepSeek
  | 'xfyun'       // 讯飞星火
  | 'aliyun'      // 阿里云通义千问
  | 'bytedance'   // 字节豆包
  | 'baidu'       // 百度文心
  | 'custom';     // 自定义兼容 API

type ModelCategory = 'vision' | 'text-to-image' | 'image-to-image' | 'text';

interface ModelConfig {
  id?: number;
  name: string;
  provider: ModelProvider;
  model: string;
  apiKey: string;
  endpoint: string;
  useProxy: boolean;
  proxyEndpoint: string;
  category: ModelCategory;
  capabilities: CapabilityType[];
  isActive: boolean;
}
```

---

## 6. 模型连接机制

### 6.1 支持的服务商

系统通过 **OpenAI SDK** 统一调用各服务商的 API，利用其兼容层特性：

| Provider | 标识符 | 适用场景 | 兼容性说明 |
|----------|--------|---------|-----------|
| OpenAI | `openai` | DALL-E / GPT-image | 原生支持 |
| Google Gemini | `google` | 多模态 | OpenAI 兼容层 |
| DeepSeek | `deepseek` | 文本/视觉 | OpenAI 兼容层 |
| 讯飞星火 | `xfyun` | 文本/视觉 | OpenAI 兼容层 |
| 阿里云通义千问 | `aliyun` | qwen-vl-plus / wanx | DashScope 兼容 |
| 字节豆包 | `bytedance` | 文本/视觉 | OpenAI 兼容层 |
| 百度文心 | `baidu` | 文本/视觉 | OpenAI 兼容层 |
| 自定义 | `custom` | 任意 OpenAI 兼容 API | 用户自填 endpoint |

### 6.2 模型配置关键字段

在 `model_configs` 表中，以下字段决定模型的连接和行为：

#### `provider` — 服务商标识

用于后端判断该走哪个调用分支（特别是 imageGenService 中的 DALL-E vs 通义千问判断）。

#### `endpoint` — API 端点

| 场景 | endpoint 值 |
|------|------------|
| OpenAI 官方 | `https://api.openai.com/v1` |
| 阿里 DashScope | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| 自定义服务 | 用户自行填写完整 URL |

#### `use_proxy` + `proxy_endpoint` — 代理设置

当某些地区无法直接访问 API 时，可启用代理：
- `use_proxy = 1`: 启用代理，请求通过 `proxy_endpoint` 中转
- `use_proxy = 0`: 直连（默认）

#### `category` — 模型类别

决定了该模型可以在哪些功能页面被选中使用：

| category | 可用于 | 说明 |
|----------|-------|------|
| `vision` | 灵感提示、海报分析 | 必须具备图像理解能力 |
| `text-to-image` | 角色生图、三视图、海报 | 文字→图片生成 |
| `image-to-image` | 角色生图（可选） | 图片→图片变换 |
| `text` | —（预留） | 纯文本对话 |

#### `is_active` — 激活标记

每个 `category` 只能有一个 `is_active = 1` 的模型。前端默认使用激活模型，用户也可手动切换。

### 6.3 API 调用流程

以**图片生成**为例，完整的调用链路：

```
用户点击"生成"按钮
    ↓
前端 useGeneration() hook
    ↓
POST /api/image/generate
    { prompt, modelId, size, n, referenceImage? }
    ↓
backend/routes/generate.ts
    ├─ 从 DB 读取 model_config（按 id 或 category 取 active）
    ├─ 如果 use_proxy → 构造代理 URL
    ↓
backend/services/imageGenService.ts
    ├─ 判断 provider/model 名称
    │   ├─ [OpenAI/DALL-E] → client.images.generate()
    │   └─ [阿里通义] → client.chat.completions.create() + 特殊 prompt
    ↓
HTTP 请求 → AI 服务商 API
    ↓
返回 base64 图片数据 → 前端展示
```

### 6.4 连接测试与能力检测

**测试连接** (`POST /api/model-configs/test-connection`):
- 使用配置的 apiKey + endpoint 发送简单的 models 列表请求
- 验证认证是否成功，返回可用模型列表

**能力检测** (`POST /api/model-configs/detect-capabilities`):
- **vision 能力**: 发送带图片的 chat completion 请求，若成功则具备 vision 能力
- **文生图能力**: 检查模型名称是否匹配 `dall-e`、`gpt-image`、`flux`、`wanx` 等关键词
- **图生图能力**: 同上关键词匹配
- 自动填充 `capabilities` 和 `category` 字段

---

## 7. 数据库表结构说明

数据库使用 **SQLite**，文件位于 `data/lightbulb.db`。共 **3 张表**：

### 7.1 `generation_records` — 生成记录表

存储每次 AI 生成的历史记录。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 唯一标识，自增主键 |
| `feature_type` | TEXT | NOT NULL | 功能类型：`inspiration`(灵感) / `character`(角色) / `threeview`(三视图) / `poster`(海报) / `cg` |
| `prompt` | TEXT | | 用户输入的提示词文本 |
| `upload_images` | TEXT | | 用户上传的原始图片，JSON 字符串编码的 base64 数组 `["base64str1", "base64str2"]` |
| `generated_images` | TEXT | | AI 生成的图片，JSON 字符串编码的 base64 数组 |
| `model_provider` | TEXT | | 本次生成使用的服务商标识（如 openai, aliyun） |
| `model_name` | TEXT | | 本次生成使用的具体模型 ID（如 gpt-image-1, wanx-v1） |
| `token_usage` | INTEGER | DEFAULT 0 | 本次请求消耗的 Token 总数（可用于成本追踪） |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 记录创建时间 |

**使用场景**:
- "历史记录"页面展示所有生成记录
- 点击记录可查看详情（原始 prompt、上传图、生成结果对比）
- 支持"重新下载"已生成的图片

### 7.2 `model_configs` — 模型配置表

存储用户配置的所有 AI 模型连接信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 唯一标识 |
| `name` | TEXT | NOT NULL | 配置显示名称（如"我的 GPT-4o"、"通义万相"） |
| `provider` | TEXT | NOT NULL | 服务商标识：`openai`/`google`/`deepseek`/`xfyun`/`aliyun`/`bytedance`/`baidu`/`custom` |
| `model` | TEXT | NOT NULL | 模型 ID（如 `gpt-4o`, `qwen-vl-plus`, `wanx2.1-t2i-turbo`） |
| `api_key` | TEXT | | API 密钥（敏感信息，存储在本地 DB） |
| `endpoint` | TEXT | | API 端点 URL（留空则使用默认值） |
| `use_proxy` | INTEGER | DEFAULT 0 | 是否启用代理转发：`0`=否, `1`=是 |
| `proxy_endpoint` | TEXT | | 代理服务器地址 |
| **`category`** | **TEXT** | **NOT NULL** | **模型类别（核心字段）：`vision`/`text-to-image`/`image-to-image`/`text`** |
| `capabilities` | TEXT | | 能力标签，JSON 字符串数组：`["vision","text-to-image"]` |
| `is_active` | INTEGER | DEFAULT 0 | 是否为当前激活模型：`0`=否, `1`=是 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | | 最后更新时间 |

**业务规则**:
- 每个 `category` 只能有 **1 个** `is_active=1` 的记录
- 新增/编辑时可选择是否设为激活，激活会自动将该 category 其他模型设为非激活
- 删除模型时若为 active 模型，需先选择替代模型

### 7.3 `app_settings` — 应用设置表

KV 形式的全局配置存储。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `key` | TEXT | PRIMARY KEY | 设置项键名 |
| `value` | TEXT | NOT NULL | 设置值（通常为 JSON 字符串） |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 最后更新时间 |

**常见 key 值**:

| key | value 示例 | 说明 |
|-----|-----------|------|
| `vision_api_key` | `"sk-xxxx"` | Vision 服务的 API 密钥 |
| `vision_api_endpoint` | `"https://..."` | Vision 服务的自定义端点 |
| `default_vision_model` | `"qwen-vl-plus"` | 默认 Vision 模型 |

> 注：大部分设置目前通过 `storage` 服务在前端 localStorage 和后端 DB 之间同步。

---

## 8. API 接口文档

### 8.1 Vision 分析

**`POST /api/vision/analyze`**

请求体：
```json
{
  "image": "base64编码的图片字符串",
  "prompt": "分析这张图片的画风和构图特点",
  "apiKey": "可选，指定的API密钥",
  "endpoint": "可选，指定的API端点"
}
```
响应：
```json
{
  "success": true,
  "data": {
    "analysis": "AI 返回的分析结果文本",
    "model": "使用的模型名称",
    "usage": { "prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150 }
  }
}
```

### 8.2 图片生成

**`POST /api/image/generate`**

请求体：
```json
{
  "prompt": "一只可爱的猫咪在水彩风格下",
  "modelId": 3,
  "size": "1024x1024",
  "n": 1,
  "referenceImage": "可选，base64参考图"
}
```
响应：
```json
{
  "success": true,
  "data": {
    "images": ["base64图片字符串"],
    "revised_prompt": "可能被修正后的实际 prompt",
    "provider": "openai",
    "model": "gpt-image-1",
    "usage": { ... }
  }
}
```

**支持的尺寸**: `256x256` | `512x512` | `1024x1024` | `1792x1024` | `1024x1792`

### 8.3 海报生成

**`POST /api/poster/generate`**

请求体：
```json
{
  "images": ["base64参考图1", "base64参考图2"],
  "textPrompt": "赛博朋克风格城市夜景海报",
  "layoutHint": "上下分层构图",
  "modelId": 5
}
```
响应：
```json
{
  "success": true,
  "data": {
    "images": ["base64生成的海报"],
    "analysisResult": "Vision分析的中间结果",
    "finalPrompt": "融合分析后的最终 prompt",
    "provider": "aliyun",
    "model": "wanx-v1"
  }
}
```

### 8.4 生成记录 CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/records` | 获取所有记录 |
| `GET` | `/api/records/:id` | 获取单条记录详情 |
| `POST` | `/api/records` | 创建记录（同时保存 prompt + upload_images） |
| `PUT` | `/api/records/:id` | 更新记录（主要用于保存 generated_images） |
| `DELETE` | `/api/records/:id` | 删除单条记录 |
| `DELETE` | `/api/records` | 清空所有记录 |

### 8.5 模型配置管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/model-configs` | 获取所有模型配置 |
| `GET` | `/api/model-configs/category/:category` | 按类别获取配置 |
| `POST` | `/api/model-configs` | 新建模型配置 |
| `PUT` | `/api/model-configs/:id` | 更新模型配置 |
| `DELETE` | `/api/model-configs/:id` | 删除模型配置 |
| `PUT` | `/api/model-configs/:id/active` | 设为激活 |
| `POST` | `/api/model-configs/test-connection` | 测试连接可用性 |
| `POST` | `/api/model-configs/detect-capabilities` | 自动检测模型能力 |

---

## 9. 核心业务流程

### 9.1 灵感提示流程

```
┌──────────┐     ┌──────────────┐     ┌──────────────────┐     ┌──────────┐
│ 用户上传  │ ──▶ │  选择 Vision │ ──▶ │  输入分析需求    │ ──▶ │ 点击分析 │
│ 参考图片  │     │  模型        │     │  (prompt)        │     │          │
└──────────┘     └──────────────┘     └──────────────────┘     └────┬─────┘
                                                                    │
                              ┌─────────────────────────────────────┘
                              ▼
                     ┌────────────────────┐
                     │ visionService       │
                     │ .analyze()         │
                     │  → qwen-vl-plus    │
                     └────────┬───────────┘
                              ▼
                     ┌────────────────────┐
                     │ 展示分析结果        │
                     │ 可保存到历史记录    │
                     └────────────────────┘
```

### 9.2 角色生图流程

```
┌──────────┐     ┌──────────────┐     ┌──────────────────┐     ┌──────────┐
│ 可选上传  │ ──▶ │ 选择图片生成  │ ──▶ │ 输入角色描述    │ ──▶ │ 选择尺寸 │
│ 参考图片  │     │ 模型          │     │ (prompt)        │     │ 和数量   │
└──────────┘     └──────────────┘     └──────────────────┘     └────┬─────┘
                                                                    │
                              ┌─────────────────────────────────────┘
                              ▼
                     ┌────────────────────┐
                     │ imageGenService    │
                     │ .generateImage()   │
                     │  ├─ DALL-E 分支    │
                     │  └─ Qwen 分支      │
                     └────────┬───────────┘
                              ▼
                     ┌────────────────────┐
                     │ 展示生成图片        │
                     │ 支持下载           │
                     │ 自动保存记录        │
                     └────────────────────┘
```

### 9.3 海报生成流程（最复杂）

```
┌──────────────┐     ┌─────────────────┐
│ 上传参考图片   │     │ 输入文字需求     │
│ (可选,可多张)  │     │ (主题/风格等)    │
└──────┬───────┘     └────────┬────────┘
       │                      │
       └──────────┬───────────┘
                  ▼
       ┌─────────────────────┐
       │ [阶段一] Vision 分析  │ ◀── 使用 vision 类别模型
       │ 提取: 画风/构图/色彩/ │
       │       关键元素/氛围   │
       └──────────┬──────────┘
                  ▼
       ┌─────────────────────┐
       │ Prompt 融合引擎      │
       │ analysis + userPrompt│
       │ → finalPrompt       │
       └──────────┬──────────┘
                  ▼
       ┌─────────────────────┐
       │ [阶段二] 图片生成     │ ◀── 使用 text-to-image 类别模型
       │ 输入 finalPrompt     │
       └──────────┬──────────┘
                  ▼
       ┌─────────────────────┐
       │ 展示最终海报         │
       │ 可查看中间分析结果    │
       └─────────────────────┘
```

---

## 10. 开发指南

### 10.1 环境搭建

**前置要求**:
- Node.js >= 18
- npm >= 9
- Windows（start.bat 需要）/ Linux / macOS

**步骤**:

```bash
# 1. 克隆项目
git clone <repo-url>
cd lightbulb-AI

# 2. 安装后端依赖
cd backend
npm install

# 3. 安装前端依赖
cd ../frontend
npm install

# 4. 启动开发环境
# 方式一: Windows 一键启动
start.bat

# 方式二: 手动分别启动
# 终端1 - 后端
cd backend && npm run dev
# 终端2 - 前端
cd frontend && npm run dev
```

### 10.2 项目调试

**后端调试**:
- 默认运行在 `http://localhost:3001`
- 使用 `npm run dev` 启动（ts-node --watch 热重载）
- 日志直接输出到终端（console.log）

**前端调试**:
- 默认运行在 `http://localhost:5173`
- Vite HMR 支持热模块替换
- 浏览器 DevTools 直接调试

**数据库查看**:
- 使用任何 SQLite 工具打开 `data/lightbulb.db`
- 推荐: **DB Browser for SQLite** (免费开源)

### 10.3 如何添加新的 AI 服务商

1. **添加 provider 标识** (`frontend/src/types/index.ts`):
```typescript
type ModelProvider = ... | 'new-provider';
```

2. **更新后端服务** (`backend/src/services/imageGenService.ts`):
   - 在 `generateImage()` 函数中添加新的判断分支
   - 根据该服务商的 API 文档调整请求格式

3. **更新前端下拉选项** (`ModelManagerContent.tsx`):
   - 在 provider select options 中添加新选项

4. **测试**: 通过模型管理的「测试连接」验证配置

### 10.4 如何添加新功能页面

1. **创建页面组件**: `frontend/src/pages/NewFeaturePage.tsx`
2. **注册 Tab**: 在 `App.tsx` 的 `tabs` 数组中添加
3. **添加后端路由** (如有需要): 在 `backend/src/routes/` 下新建
4. **注册路由**: 在 `backend/src/app.ts` 中挂载
5. **添加类型**: 更新 `FeatureType` 和相关类型

### 10.5 关键文件速查

| 需求 | 文件路径 |
|------|---------|
| 修改 AI 调用逻辑 | `backend/src/services/*.ts` |
| 添加新 API 端点 | `backend/src/routes/*.ts` + `app.ts` |
| 修改数据库表结构 | `backend/src/database.ts` → `initDatabase()` |
| 修改前端页面 UI | `frontend/src/pages/*.tsx` |
| 修改共享组件 | `frontend/src/components/*.tsx` |
| 修改类型定义 | `frontend/src/types/index.ts` / `backend/src/types/index.ts` |
| 修改 API 请求格式 | `frontend/src/services/api.ts` + `types/api.ts` |
| 修改端口/代理配置 | `frontend/vite.config.ts` / `backend/src/index.ts` |
| 修改启动脚本 | `start.bat` |

### 10.6 注意事项与最佳实践

1. **图片数据量控制**: 所有图片以 base64 存储在 SQLite 中，频繁生成大图会导致 DB 文件膨胀，建议定期清理旧记录
2. **API Key 安全**: 密钥明文存储在本地 SQLite 中，切勿将 `data/lightbulb.db` 文件分享给他人
3. **并发限制**: 当前为单线程 Express 服务器，大量并发请求可能阻塞
4. **模型能力缓存**: `capabilities` 字段在检测时写入，若模型升级了能力需手动重新检测
5. **代理稳定性**: 使用代理时需确保代理服务的稳定性和速度，否则可能导致超时

---

## 附录 A: 错误码对照表

| HTTP Code | Error Code | 含义 |
|-----------|-----------|------|
| 400 | `VALIDATION_ERROR` | 请求参数校验失败（见 details） |
| 401 | `AUTH_FAILED` | API 密钥无效或过期 |
| 404 | `NOT_FOUND` | 资源不存在（记录/模型配置） |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |
| 502 | `UPSTREAM_ERROR` | 上游 AI 服务不可达 |
| 503 | `MODEL_ERROR` | AI 模型返回错误（附原始错误信息） |

---

## 附录 B: 常用模型 ID 参考

| 服务商 | Vision 模型 | 文生图模型 | 图生图模型 |
|--------|------------|-----------|-----------|
| OpenAI | gpt-4o, gpt-4-vision-preview | dall-e-3, gpt-image-1 | dall-e-2 (支持 edit) |
| 阿里云 | qwen-vl-max, qwen-vl-plus | wanx2.1-t2i-turbo, wanx-v1 | — |
| Google | gemini-1.5-pro, gemini-2.0-flash | imagen-3.0-generate-002 | — |
| DeepSeek | deepseek-vl, deepseek-chat | — | — |
| 字节 | doubao-seedance, doubao-vision-seedream | seedream-1.0-t2i-turbo | — |

---

*本文档随项目持续更新，如有疑问请查阅对应源码或提交 Issue。*
