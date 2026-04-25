
# Lightbulb AI

Lightbulb AI 是一个本地部署的 AI 创作辅助网站，提供灵感提示、角色生图、角色三视图、海报生成等 AI 驱动的创作功能。

## 功能特性

### 1. 灵感提示
用户通过拖拽或点击上传图片，系统调用 Vision LLM 分析图片，自动生成描述图片色彩风格、表面质感、比例体系等维度的提示词。

### 2. 角色生图
用户在文本框中输入提示词，选择已配置的 AI 模型，调用 OpenAI DALL-E / GPT-Image 生成图片。

### 3. 角色三视图
用户上传角色参考图，系统分析画风后生成正面/侧面/背面三张图。

### 4. 海报生成
用户上传角色参考图（必填）+ 海报参考图（选填）+ 输入提示词，系统生成海报。

### 5. CG 生成
功能占位，敬请期待。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **后端**：Node.js + Express + TypeScript + SQLite (sql.js)
- **AI 调用**：OpenAI SDK（支持 OpenAI/DeepSeek/Google/讯飞等多服务商）
- **状态管理**：React Context + localStorage
- **路由**：React Router v6

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm 或 yarn

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 配置 API Key

1. 打开前端应用
2. 点击右上角头像下拉菜单
3. 选择"模型配置"
4. 选择服务商（如 OpenAI）
5. 输入 API Key 和模型名称
6. 点击"测试连接"验证
7. 保存配置

**支持多服务商配置**：可以为不同服务商分别保存配置（OpenAI、DeepSeek、Google、讯飞、自定义），随时在模型配置弹窗中切换使用。

### 启动开发服务器

```bash
# 终端1: 启动后端
cd backend
npm run dev

# 终端2: 启动前端
cd frontend
npm run dev
```

访问 http://localhost:3000 查看应用。


## API 接口

### 后端 API

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/vision/analyze` | POST | Vision LLM 分析图片 |
| `/api/image/generate` | POST | DALL-E 图片生成 |
| `/api/poster/generate` | POST | 海报生成 |
| `/api/records` | GET | 获取生成记录 |
| `/api/records` | POST | 创建生成记录 |
| `/api/records/:id` | DELETE | 删除生成记录 |
| `/health` | GET | 健康检查 |

## 数据存储

- **API Key**: 存储于前端 localStorage，不经过后端
- **生成记录**: SQLite 数据库（位于 `backend/data/lightbulb.db`）
- **主题偏好**: localStorage

## 支持的 AI 服务商

- OpenAI (GPT-4V, DALL-E 3, GPT-Image)
- DeepSeek
- Google Gemini
- 讯飞
- 自定义 API 端点

## 构建生产版本

```bash
# 构建前端
cd frontend
npm run build

# 构建后端
cd ../backend
npm run build
```

## 注意事项

1. API Key 安全：请勿将 API Key 提交到代码仓库
2. 额度消耗：使用 AI 功能会产生 API 调用费用
3. 图片大小：建议上传小于 10MB 的图片以优化处理速度

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

## License

MIT License
>>>>>>> 4ecd04bb4d6193a160064bda4d23f07965118bff
