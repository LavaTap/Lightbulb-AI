# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供在本仓库开发时的指导规范。

## 常用命令

### 环境搭建
```bash
# 安装后端依赖
cd backend && npm install

# 安装前端依赖
cd ../frontend && npm install
```

### 开发模式
```bash
# 启动后端（运行在 3001 端口）
cd backend && npm run dev

# 启动前端（运行在 3000 端口，/api 请求自动代理到后端）
cd frontend && npm run dev
```

或者双击根目录下的 `start.bat` 一键启动两个服务。

### 构建生产版本
```bash
# 构建前端生产版本
cd frontend && npm run build

# 构建后端生产版本
cd backend && npm run build
```

### 生产运行
```bash
# 生产模式启动后端（运行在 3001 端口）
cd backend && npm start

# 预览前端生产构建（运行在 4173 端口）
cd frontend && npm run preview
```

### 开发工具链
```bash
# 代码检查
cd frontend && npm run lint
cd backend && npm run lint

# 代码格式化
cd frontend && npm run format
cd backend && npm run format

# 运行测试
cd frontend && npm run test
cd backend && npm run test

# 安装 git hooks（首次配置）
npm run prepare
```

## 架构概述

Lightbulb AI 是一个本地优先的 AI 创意辅助工具，采用简单的 monorepo 结构：

### 技术栈
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui（无重量级状态管理，使用 React Hooks + Context）
- **后端**: Node.js + Express + TypeScript + sql.js（嵌入式 SQLite，无需外部数据库）
- **AI 集成**: OpenAI SDK 支持多服务商（10+ 服务商：OpenAI、Google、DeepSeek、阿里云、腾讯云、讯飞、字节跳动、百度等）
- **向量记忆**: LanceDB 用于对话语义搜索和记忆检索
- **文件解析**: mammoth（DOCX）、pdf-parse（PDF）、xlsx（Excel）、cheerio（网页内容抓取）
- **图表可视化**: recharts（用量统计等图表）

### 核心架构
```
用户浏览器 (React SPA :3000)
    ↓ /api (Vite 代理)
Express 服务器 (:3001)
    ├─ 路由层: generate（视觉/图像/海报生成）、records（历史记录+用量统计）、
    │          modelConfigs（API 密钥管理）、chat（AI 对话，SSE 流式响应）
    ├─ 服务层: visionService（图像分析）、imageGenService（多服务商图像生成）、
    │          posterService（海报生成流程）、chatService（对话流式响应）、
    │          memoryService（对话记忆+摘要）、lanceService（向量数据库）、
    │          embeddingService（文本向量化）、fileParser（文件解析）、
    │          webFetcher（网页内容抓取）
    └─ SQLite 数据库 (data/lightbulb.db): 存储模型配置、生成记录、对话历史
```

### 核心模块
- **模型管理系统**: API 密钥完整 CRUD 操作、自动检测模型能力、按类别过滤（视觉/文生图/图生图/文本）
- **图像生成路由**: 根据模型名称动态路由到对应服务商 API（OpenAI 兼容、通义万相、腾讯混元、GPTImage2 代理）
- **AI 对话系统**: SSE 流式响应、文件附件上传（图片/PDF/DOCX/XLSX）、URL 网页内容自动抓取、对话记忆与语义搜索
- **双图存储机制**: 在 SQLite 中同时存储 200px 缩略图（用于列表快速加载）和原始全尺寸图片（用于下载）
- **用量统计**: 记录页下方可折叠统计面板，含饼状图（服务商分布）、折线图（每日 Token）、柱状图（各模型 Token）
- **功能页面**: 6 个主要功能（灵感提示、AI 对话、文生图、三视图生成、海报生成、CG 生成占位）

### 数据库表结构
- `generation_records`: 生成记录（feature_type, prompt, 图片, model_provider, model_name, token_usage）
- `conversations`: 对话元数据（title, model, system_prompt, summary）
- `chat_messages`: 对话消息（role, content, token_usage, attachments）
- `model_configs`: 模型配置（provider, model, api_key, category, capabilities）
- `app_settings`: 应用设置（key-value）

## 重要模式与指南

### 新增功能时
1. **新增功能页面**: 添加到 `frontend/src/pages/`，在 `App.tsx` 和 `Header.tsx` 的标签栏中注册
2. **新增 API 端点**: 在 `backend/src/routes/` 中添加路由处理函数，在 `validateRequest.ts` 中定义 Zod 校验 schema
3. **新增 AI 服务商**:
   - 在 `ModelManagerContent.tsx` 和 `ModelSelector.tsx` 的 `PROVIDERS[]` 数组中添加服务商条目
   - 更新前端和后端 `types/index.ts` 中的 `APIConfig.provider` 联合类型
   - 在 `validateRequest.ts` 的所有 Zod schema 中添加服务商枚举值
   - 如果不是 OpenAI 兼容的 API，在 `imageGenService.ts` 中添加自定义 API 逻辑
   - 在 `modelConfigs.ts` 中添加测试/检测逻辑

### 代码规范
- 前端导入使用路径别名 `@/`（映射到 `frontend/src/`）
- 所有 API 请求通过 `frontend/src/services/api.ts` 中的类型化 Axios 客户端发送
- 业务逻辑放在自定义 Hooks 中（`useGeneration.ts`、`useApiConfig.ts`、`useChat.ts`），不要放在页面组件中
- 后端所有请求校验使用 Zod
- 所有数据库写入操作执行后必须调用 `saveDatabase()` 才能将更改持久化到磁盘
- 提交代码前必须通过 ESLint 检查
- 提交代码前必须使用 Prettier 格式化代码

### 测试规范
- **测试策略**: 最小测试，仅聚焦核心业务逻辑
- 测试优先级：
  - 服务层函数（图像生成、视觉分析、海报生成）
  - 核心 API 端点
  - 通用工具函数
- 使用 Vitest 作为测试框架
- 无全量测试覆盖要求，仅测试关键路径

### 安全规范
- **校验策略**: 基本校验，仅针对核心接口
- 所有面向用户的 API 端点必须有 Zod 请求校验
- 处理文件上传和图像数据前先进行 sanitize 处理
- API 密钥以明文存储（仅适合本地使用，请勿部署到公共服务器）

### 开发流程
1. 从 main 分支创建 feature 分支
2. 实现功能/修复 bug
3. 运行 `npm run lint` 检查代码质量
4. 运行 `npm run format` 格式化代码
5. 运行针对变更代码的相关测试
6. 提交变更（pre-commit 钩子会自动运行 lint 和格式检查）
7. 提交 pull request 进行代码审查

### 关键注意事项
- **SQLite 并发**: sql.js 是单线程的，避免并发写入操作
- **图片大小限制**: 前端上传前会压缩图片，后端有 50MB 请求体限制
- **API 密钥安全**: 密钥以明文存储在本地 SQLite 数据库中（本地使用可接受）
- **长时运行请求**: 图像生成请求有 2 分钟超时，gptimage2 请求有 10 分钟超时
- **SSE 流式响应**: 对话消息使用原生 fetch（非 Axios），后端通过 `res.write()` + `res.end()` 推送
- **Token 计量**: 图像生成 API 无标准 token 返回时按 `prompt.length / 4` 估算；对话按 API 实际返回 `total_tokens` 记录
