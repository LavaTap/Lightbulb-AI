## 产品概述

Lightbulb AI 是一个本地部署的 AI 创作辅助网站，以 `d:/comfyui/win32-x64/lightbulb-AI` 为根目录搭建。前端基于 React + TypeScript，后端基于 Node.js + Express + SQLite。网站提供灵感提示、角色生图、角色三视图、海报生成等 AI 驱动的创作功能，所有生成记录（含 token 消耗量）持久化到 SQLite 数据库，并支持暗色/亮色主题切换，所有 UI 组件自适应主题颜色。

## 核心功能

### 1. 灵感提示

用户通过拖拽或点击上传图片，系统调用 Vision LLM 分析图片，自动生成描述图片色彩风格、表面质感、比例体系等维度的提示词，用户可手动微调后复制使用。

### 2. 角色生图

用户在文本框中输入提示词，选择已配置的 AI 模型，调用 OpenAI DALL-E / GPT-Image 生成图片并直接在页面展示生成结果。

### 3. 角色三视图

用户上传角色参考图，系统参考 CharaForge 逻辑：调用 Vision LLM 分析画风 → 生成三视图提示词 → 调用生图 API 输出角色正面/侧面/背面三张图并展示。

### 4. 海报生成

用户上传一个或多个角色参考图（必填）+ 海报参考图（选填）+ 输入提示词，系统调用 OpenAI API 生成海报并展示结果。

### 5. CG 生成

页面占位栏，暂不实现功能，保留扩展入口。

### 6. 右上角头像下拉菜单

- **模型配置**：管理多个 AI 服务商（OpenAI/Google/DeepSeek/讯飞/自定义）的 API Key、端点、模型选择，各功能页面可主动切换已配置的 AI。
- **生成记录**：查看所有历史生成记录，包括用户提示词、上传图片、生成图片、AI token 消耗量、生成时间。
- **主题切换**：暗色/亮色模式切换，所有 UI 组件自适应主题颜色。

## 技术栈选择

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **后端**：Node.js + Express + TypeScript + SQLite (better-sqlite3)
- **AI 调用**：OpenAI SDK（兼容 OpenAI 格式的多服务商调用，参考 CharaForge 的 vision-analyzer.ts 逻辑）
- **状态管理**：React Context（主题、用户配置）
- **路由**：React Router v6
- **HTTP 客户端**：Axios（前端调用后端 API）

## 实现方案

### 系统架构

前端 React SPA 通过 RESTful API 与后端通信，后端负责 AI 调用代理、生成记录存储。AI API Key 存储于前端 localStorage（沿用 CharaForge 方案），后端不存储密钥，避免泄漏风险。

```
前端（React + Vite）:3000  ──REST API──▶  后端（Express + TS）:3001
                                        │
                    ┌───────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
            Vision LLM 调用       图片生成 API           SQLite 数据库
        （OpenAI/Google/DeepSeek   （DALL-E /           （generation_records
          /讯飞，复用 CharaForge     GPT-Image）             表）
           vision-analyzer 逻辑）
```

### 后端 API 设计

| 接口 | 方法 | 请求体 | 说明 |
| --- | --- | --- | --- |
| `/api/vision/analyze` | POST | `{ imageBase64, config }` | Vision LLM 分析图片返回提示词变量 |
| `/api/image/generate` | POST | `{ prompt, config, size }` | 调用 DALL-E 生成图片，返回 base64 或 URL |
| `/api/poster/generate` | POST | `{ images, prompt, config }` | 调用 AI 生成海报 |
| `/api/records` | GET | `?page=&pageSize=` | 分页查询生成记录 |
| `/api/records` | POST | `{ record }` | 新增生成记录 |
| `/api/records/:id` | DELETE | - | 删除生成记录 |


### 数据库设计

```sql
CREATE TABLE IF NOT EXISTS generation_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feature_type TEXT NOT NULL,
  prompt TEXT,
  upload_images TEXT,
  generated_images TEXT,
  model_provider TEXT,
  model_name TEXT,
  token_usage INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

- `upload_images` 和 `generated_images` 存储为 JSON 字符串（图片路径或 base64 缩略图）
- `token_usage` 记录 AI 调用消耗的 token 数量（从 API 响应中获取 `usage.total_tokens`）

### 主题切换方案

使用 Tailwind CSS `dark:` 变体 + CSS 变量实现双主题。根节点 `<html>` 添加 `class="dark"` 切换暗色模式，所有 shadcn/ui 组件天然支持。主题偏好存入 localStorage，App 启动时读取恢复。

CSS 变量定义（支持动态切换）：

```css
:root {
  --bg-primary: 255 255 255;
  --bg-secondary: 241 245 249;
  --text-primary: 15 23 42;
  --text-secondary: 100 116 139;
}
.dark {
  --bg-primary: 15 23 42;
  --bg-secondary: 30 41 59;
  --text-primary: 248 250 252;
  --text-secondary: 148 163 184;
}
```

### Vision LLM 调用方案（后端重写 CharaForge 逻辑）

将 CharaForge 的 `vision-analyzer.ts` 逻辑移植到 Node.js 后端：

- 支持 OpenAI 兼容格式（GPT-4V、DeepSeek、讯飞）/ Google Gemini 格式
- 接收前端传来的 `APIConfig`（含 apiKey，不存储于后端）
- 返回结构化 JSON：
  ```json
  {
    "analysis": {
      "zh": "AI 分析结果（中文）",
      "en": "AI analysis result (English)"
    }
  }
  ```
  - AI 自由分析图片内容，不限定必须是角色或特定维度
  - 分析内容可包括：画风特征、绘画技法、色彩运用、光影处理、材质质感等
  - 如果是角色：可分析角色形象、服装、姿态等
  - 如果是场景：可分析场景氛围、构图、环境元素等
  - 提示词模板引导 AI 重点分析「画风」特征
- token 用量从响应头/体中提取，存入数据库

### 图片生成方案（DALL-E / GPT-Image）

使用 OpenAI Images API：

- `model: "dall-e-3"` 或 `"gpt-image-1"`
- `response_format: "b64_json"` 直接返回 base64（避免临时 URL 过期问题）
- 前端接收 base64 直接展示，同时将记录存入数据库
- token 用量：DALL-E 不返回 token，但可记录 `b64_json` 大小估算成本

### 前端模型切换方案

- 每个功能页面顶部显示「当前模型：xxx」徽标，点击打开放置模型选择弹窗
- 弹窗读取 localStorage 中已配置的模型列表（复用 CharaForge 的 `charaforge_api_{provider}` 存储格式）
- 用户选择后立即生效，仅影响当前功能调用

### 实施笔记

- **性能**：图片上传使用前端压缩（参考 CharaForge 的 `imageToBase64` 逻辑，压缩至 1024px 以内，JPEG quality 0.85）
- **日志**：后端使用 console.log / winston 分级日志，敏感信息（API Key）不打印
- **影响范围控制**：后端作为纯 API 代理，不存储 API Key，避免密钥泄漏风险；生成记录中的图片存储为缩略图 base64 或本地文件路径
- **向后兼容**：数据库表结构预留扩展字段，后续可扩展多用户、更多功能类型
- **Token 计算**：OpenAI Chat Completions 返回 `usage.total_tokens`；DALL-E 固定成本；需在每次 AI 调用后捕获并存入数据库

## 目录结构

```
d:/comfyui/win32-x64/lightbulb-AI/
├── frontend/                          # [NEW] React 前端项目
│   ├── index.html                     # [NEW] Vite 入口 HTML
│   ├── package.json                   # [NEW] 前端依赖配置
│   ├── vite.config.ts                 # [NEW] Vite 构建配置（代理后端 API）
│   ├── tailwind.config.js             # [NEW] Tailwind CSS 配置（darkMode: 'class'）
│   ├── postcss.config.js              # [NEW] PostCSS 配置
│   ├── tsconfig.json                  # [NEW] TypeScript 配置
│   ├── src/
│   │   ├── main.tsx                   # [NEW] React 入口文件（挂载 App，初始化主题）
│   │   ├── App.tsx                    # [NEW] 根组件，React Router 路由配置
│   │   ├── index.css                  # [NEW] 全局样式，CSS 变量定义，Tailwind 指令
│   │   ├── components/
│   │   │   ├── Layout.tsx             # [NEW] 全局布局（顶栏 + 内容区 + 页脚）
│   │   │   ├── Header.tsx             # [NEW] 顶部导航栏（Logo + 功能导航标签 + 头像按钮）
│   │   │   ├── AvatarMenu.tsx         # [NEW] 右上角头像下拉菜单组件（模型配置/生成记录/主题切换）
│   │   │   ├── ThemeToggle.tsx        # [NEW] 暗色/亮色主题切换按钮（太阳/月亮图标动画）
│   │   │   ├── ModelSelector.tsx      # [NEW] 模型选择弹窗（读取 localStorage 已配置模型）
│   │   │   ├── ImageUploadZone.tsx    # [NEW] 通用图片拖拽上传组件（支持单张/多张，预览缩略图）
│   │   │   └── ui/                   # [NEW] shadcn/ui 组件（button, card, dialog, toast 等）
│   │   ├── pages/
│   │   │   ├── InspirationPage.tsx    # [NEW] 灵感提示页面（上传图片 → AI 分析 → 提示词展示）
│   │   │   ├── CharacterGenPage.tsx   # [NEW] 角色生图页面（输入提示词 → 生成图片展示）
│   │   │   ├── ThreeViewPage.tsx      # [NEW] 角色三视图页面（上传参考图 → 分析 → 生成三视图）
│   │   │   ├── PosterGenPage.tsx      # [NEW] 海报生成页面（上传参考图 → 生成海报）
│   │   │   ├── CgGenPage.tsx         # [NEW] CG 生成页面（占位，显示"功能开发中"）
│   │   │   └── RecordsPage.tsx        # [NEW] 生成记录查看页面（分页列表，显示 token 用量）
│   │   ├── hooks/
│   │   │   ├── useTheme.ts            # [NEW] 主题切换自定义 Hook（读取/写入 localStorage）
│   │   │   ├── useApiConfig.ts        # [NEW] API 配置读写 Hook（localStorage，复用 CharaForge 格式）
│   │   │   └── useGeneration.ts       # [NEW] 生成操作通用 Hook（调用后端 API，处理加载/错误状态）
│   │   ├── services/
│   │   │   ├── api.ts                # [NEW] 后端 API 调用封装（Axios 实例，拦截器）
│   │   │   └── storage.ts            # [NEW] localStorage 操作封装（类型安全）
│   │   ├── types/
│   │   │   ├── index.ts              # [NEW] 全局 TypeScript 类型定义
│   │   │   └── api.ts                # [NEW] 后端 API 请求/响应类型
│   │   └── lib/
│   │       └── utils.ts              # [NEW] 工具函数（图片压缩 base64、token 格式化等）
├── backend/                           # [NEW] Express 后端项目
│   ├── package.json                   # [NEW] 后端依赖配置
│   ├── tsconfig.json                  # [NEW] TypeScript 配置
│   ├── .env.example                  # [NEW] 环境变量示例（端口号等，不含 API Key）
│   └── src/
│       ├── index.ts                   # [NEW] 后端入口，启动 Express，连接数据库
│       ├── app.ts                     # [NEW] Express 应用配置（CORS、JSON 解析、路由挂载）
│       ├── database.ts                # [NEW] SQLite 数据库连接与初始化（创建表）
│       ├── routes/
│       │   ├── generate.ts           # [NEW] 生成相关路由（/api/vision/analyze, /api/image/generate, /api/poster/generate）
│       │   └── records.ts            # [NEW] 生成记录 CRUD 路由（GET/POST/DELETE）
│       ├── services/
│       │   ├── visionService.ts       # [NEW] Vision LLM 调用服务（多服务商，移植 CharaForge 逻辑）
│       │   ├── imageGenService.ts     # [NEW] DALL-E / GPT-Image 图片生成服务
│       │   └── posterService.ts       # [NEW] 海报生成服务（调用 Vision + Image Gen 组合）
│       ├── middleware/
│       │   ├── errorHandler.ts        # [NEW] 全局错误处理中间件（统一错误响应格式）
│       │   └── validateRequest.ts    # [NEW] 请求参数校验中间件（Joi 或 Zod）
│       └── types/
│           └── index.ts              # [NEW] 后端 TypeScript 类型定义
└── README.md                          # [NEW] 项目说明文档（启动步骤、环境变量说明）
```

## 关键代码结构

```typescript
// frontend/src/types/index.ts - 全局类型定义
export interface APIConfig {
  provider: 'openai' | 'google' | 'deepseek' | 'xfyun' | 'custom';
  model: string;
  endpoint: string;
  apiKey: string;
  useProxy: boolean;
  proxyEndpoint: string;
}

export interface GenerationRecord {
  id: number;
  featureType: 'inspiration' | 'character' | 'threeview' | 'poster';
  prompt?: string;
  uploadImages: string[];
  generatedImages: string[];
  modelProvider: string;
  modelName: string;
  tokenUsage: number;
  createdAt: string;
}

export interface VisionAnalysisResult {
  analysis: { zh: string; en: string };
}
```

```typescript
// backend/src/types/index.ts - 后端类型定义
export interface APIConfig {
  provider: 'openai' | 'google' | 'deepseek' | 'xfyun' | 'custom';
  model: string;
  endpoint: string;
  apiKey: string;
  useProxy: boolean;
  proxyEndpoint: string;
}

export interface VisionAnalysisResult {
  analysis: { zh: string; en: string };
}
```

## 设计风格概述

采用现代科技感设计风格，以紫色渐变（`#8B5CF6` → `#6366F1`）为主品牌色，配合暗色/亮色双主题系统。整体视觉专业、简洁、具有高端 SaaS 产品质感。所有页面组件使用 shadcn/ui 构建，确保一致的设计语言和完善的可访问性。

## 页面详细设计

### 全局布局（Layout 组件）

- **顶栏（Header）**：固定顶部，背景半透明毛玻璃效果（backdrop-blur），左侧 Logo（紫色渐变图标 + 「Lightbulb AI」文字），中间水平导航标签（灵感提示 / 角色生图 / 角色三视图 / 海报生成 / CG生成），右侧用户头像圆形按钮（点击打开下拉菜单）
- **内容区**：`min-h-screen` 最小高度，根据选中导航标签切换渲染对应页面组件，带淡入动画
- **页脚**：居中浅灰色小字版权信息「© 2026 Lightbulb AI - 巷子CHARM~」

### 页面 1：灵感提示（InspirationPage）

- **区块 1 - 上传区**：`ImageUploadZone` 组件，虚线边框，拖拽时边框高亮紫色，上传后显示图片预览缩略图 + 右上角移除按钮
- **区块 2 - 分析状态**：AI 分析时显示骨架屏 + 旋转动画（紫色渐变 spinner），分析完成后显示「✨ 画风分析完成」提示
- **区块 3 - AI 画风分析**：单个 `Textarea` 卡片，展示 AI 对图片的完整分析结果
  - AI 自由分析图片内容，不限定分析维度（可以是角色、场景、物体等）
  - 重点分析画风特征：绘画风格、线条质感、色彩倾向、光影处理、材质表现等
  - 分析结果可编辑，实时自动调整高度
- **区块 4 - 提示词展示区**：三个 Tab 切换（中文 / English / JSON），内容区域可编辑，底部「复制提示词」按钮

### 页面 2：角色生图（CharacterGenPage）

- **区块 1 - 提示词输入**：大文本输入框（`Textarea`，最小 120px 高度），占位符「描述你想生成的角色形象...」
- **区块 2 - 模型选择 + 生成按钮**：左侧显示当前模型徽标（可点击切换），右侧「生成图片」按钮（紫色渐变背景，悬停放大效果）
- **区块 3 - 生成结果展示**：响应式图片网格（`grid-cols-1 md:grid-cols-2`），每张图片卡片带下载按钮和提示词标签

### 页面 3：角色三视图（ThreeViewPage）

- **区块 1 - 参考图上传**：`ImageUploadZone` 组件，提示「上传角色参考图，AI 将分析画风并生成三视图」
- **区块 2 - 分析 + 提示词**：分析状态指示器 + 可编辑的三视图提示词展示（只读预览，高级用户可展开编辑）
- **区块 3 - 生成按钮 + 结果展示**：「生成三视图」按钮，结果区三张图片横向排列（`flex row`），带标签（正面 / 侧面 / 背面）

### 页面 4：海报生成（PosterGenPage）

- **区块 1 - 角色参考图上传**：多图片上传区，横向缩略图列表，每张带移除按钮，必填验证
- **区块 2 - 海报参考图上传（可选）**：单张图片上传，小尺寸预览
- **区块 3 - 提示词输入 + 生成**：`Textarea` 输入海报描述，「生成海报」按钮
- **区块 4 - 结果展示**：大图居中展示，带下载按钮

### 页面 5：CG 生成（CgGenPage）

- **占位页面**：居中布局，大幅度空白，显示「🚧 功能开发中，敬请期待」+ 脉冲动画圆圈

### 下拉菜单面板（AvatarMenu 组件）

- **模型配置面板（Dialog）**：服务商选择标签（`ToggleGroup`），API Key 输入框（密码类型，可切换显示），模型选择下拉框，端点输入框，代理开关，「测试连接」按钮，连接成功绿色指示条
- **生成记录面板（Drawer 或独立页面）**：按时间倒序列表，每张卡片显示：功能类型徽标、提示词摘要（截断）、生成图片缩略图、token 消耗量、相对时间
- **主题切换**：`Switch` 组件，左侧太阳图标（亮色）/ 右侧月亮图标（暗色），切换时图标有旋转动画

## 交互设计细节

- 所有按钮悬停时有 `scale(1.02)` 微缩放 + 阴影加深效果
- 卡片悬停时 `translateY(-2px)` 微上浮 + 边框高亮
- 图片上传区域拖拽时背景色变为紫色半透明（`rgba(139, 92, 246, 0.1)`）
- 页面切换使用 `framer-motion` 的 `AnimatePresence` + `motion.div` 淡入淡出
- 暗色/亮色切换时所有颜色通过 CSS `transition-colors` 平滑过渡（200ms）
- Toast 通知从右上角滑入（`slideInFromRight`），3秒后自动消失或手动关闭
- 下拉菜单打开/关闭使用 `radix-ui` 的 `DropdownMenu`，带缩放淡入动画

## Agent Extensions

### SubAgent

- **code-explorer**：用于深入探索现有 CharaForge 项目代码（vision-analyzer.ts、prompt-builder.ts、main.ts、style.css），确保新项目准确复用其 AI 调用逻辑、提示词模板设计和 API 配置系统。
- 预期成果：获取完整的 Vision LLM 多服务商调用逻辑、提示词模板结构、localStorage 配置存储格式，用于指导后端 visionService.ts 和前端 useApiConfig.ts 的实现。