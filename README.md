
# Lightbulb AI

Lightbulb AI 是一个本地部署的 AI 创作辅助网站，提供灵感提示、角色生图、角色三视图、海报生成等 AI 驱动的创作功能。

## 功能特性

### 1. 灵感提示
用户通过拖拽或点击上传图片，系统调用 Vision LLM 分析图片，自动生成描述图片色彩风格、表面质感、比例体系等维度的提示词。

**分析类型选择**：支持按类型差异化分析，提升分析质量：
- 🧑 **角色**：含人体比例分析（头身比、三庭五眼、肩宽腰宽比例、上下身比例、四肢比例等）
- 🏔️ **风景**：场景构图分析（空间层次、透视关系、环境元素、空间深度感）
- 📦 **物品**：材质细节分析（造型结构、表面纹理、光影反射、配色方案）
- ✨ **其他**：通用画风分析（绘画风格、线条质感、色彩倾向、光影处理、材质表现）

### 2. 角色生图
用户在文本框中输入提示词，选择已配置的 AI 模型，调用 OpenAI DALL-E / GPT-Image 生成图片。

### 3. 角色三视图
用户上传角色参考图，系统分析画风后生成正面/侧面/背面三张图，输出尺寸锁定为 **16:9** 横向宽屏比例。

### 4. 海报生成
用户上传角色参考图（必填）+ 海报参考图（选填）+ 输入提示词，系统生成海报，支持选择 **竖版 (9:16)** 或 **横版 (16:9)** 尺寸。

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
3. 选择"模型管理"
4. 点击"添加新配置"标签页
5. 输入配置名称、选择服务商、输入 API Key 和模型名称
6. （可选）点击"测试连接"验证 API 连通性
7. （可选）点击"检测 Vision 能力"检查模型是否支持多模态
8. 点击"保存到模型管理"

**支持多服务商配置**：可以为不同服务商分别保存配置（OpenAI、DeepSeek、Google、讯飞、自定义），支持真实 API 连通性检测和**模型能力自动识别**（vision/text-to-image/image-to-image）。保存时自动检测模型类型。

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
| `/api/image/generate` | POST | 图片生成 |
| `/api/poster/generate` | POST | 海报生成 |
| `/api/records` | GET | 获取生成记录 |
| `/api/records` | POST | 创建生成记录 |
| `/api/records/:id` | DELETE | 删除生成记录 |
| `/api/model-configs` | GET | 获取所有模型配置 |
| `/api/model-configs` | POST | 创建模型配置 |
| `/api/model-configs/:id` | PUT | 更新模型配置 |
| `/api/model-configs/:id` | DELETE | 删除模型配置 |
| `/api/model-configs/test-connection` | POST | 测试 API 连通性 |
| `/api/model-configs/detect-capabilities` | POST | 自动检测模型能力（vision/text-to-image/image-to-image） |
| `/health` | GET | 健康检查 |

## 数据存储

- **API Key**: 存储于前端 localStorage，同时持久化到 SQLite 数据库
- **模型配置**: SQLite 数据库（位于 `backend/data/lightbulb.db`），支持完整的 CRUD 操作
- **生成记录**: SQLite 数据库
- **主题偏好**: localStorage

## 支持的 AI 服务商和模型

### 多模态模型 (Vision)
- **OpenAI**: GPT-4o, GPT-4o Mini
- **Google Gemini**: Gemini 2.0 Flash, Gemini 2.5 Pro, Gemini 1.5 Flash
- **讯飞**: Qwen-VL-Plus, Qwen-VL-Max

### 文生图模型
- **OpenAI**: DALL-E 3, GPT Image 1
- **Google Gemini**: Imagen 3
- **讯飞**: Qwen-Image

### 图生图模型
- **OpenAI**: GPT Image 1
- **讯飞**: Wanx

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
4. 模型配置：模型类型会根据所选模型自动识别，保存前不强制要求测试连接

## 目录结构

```
d:/Program Files (x86)/lightbulb-AI/
├── frontend/                          # React 前端项目
│   ├── src/
│   │   ├── components/
│   │   │   ├── ModelSelector.tsx      # [保留] 独立模型选择组件
│   │   │   ├── ModelManagerContent.tsx # [新增] 模型管理弹窗内容（嵌入头像菜单）
│   │   │   ├── AvatarMenu.tsx        # [更新] 集成模型管理入口
│   │   │   ├── ModelDropdown.tsx      # [新增] 页面顶部模型下拉选择器
│   │   │   ├── AvatarMenu.tsx        # [更新] "模型配置" → "模型管理"
│   │   │   └── ui/                   # shadcn/ui 组件
│   │   ├── pages/
│   │   │   ├── InspirationPage.tsx    # [更新] 分析类型选择器 + Vision 模型选择器
│   │   │   ├── CharacterGenPage.tsx  # [更新] 顶部文生图模型选择器
│   │   │   ├── ThreeViewPage.tsx      # [更新] 顶部图生图模型选择器 + 16:9锁定
│   │   │   └── PosterGenPage.tsx      # [更新] 顶部图生图模型选择器 + 尺寸选择
│   │   ├── hooks/
│   │   │   └── useApiConfig.ts        # [重构] 支持模型分类和数据库持久化
│   │   ├── services/
│   │   │   ├── api.ts                # [更新] 新增模型管理API + category 参数
│   │   │   └── storage.ts            # [更新] 支持模型配置数据库操作
│   │   ├── hooks/
│   │   │   └── useGeneration.ts      # [更新] analyze() 支持 category 参数
│   │   └── types/
│   │       ├── index.ts              # [更新] 新增 ModelCategory, ModelConfig, AnalysisCategory 类型
│   │       └── api.ts                # [更新] 新增模型管理 API 类型 + AnalysisCategory
├── backend/
│   ├── src/
│   │   ├── database.ts                # [更新] 新增 model_configs 表
│   │   ├── app.ts                    # [更新] 注册模型配置路由
│   │   ├── middleware/
│   │   │   └── validateRequest.ts     # [更新] analyzeSchema 支持 category 参数
│   │   ├── services/
│   │   │   ├── visionService.ts       # [更新] 差异化分析 prompt 工厂 + 角色比例分析
│   │   │   └── posterService.ts
│   │   └── routes/
│   │       ├── modelConfigs.ts        # [新增] 模型配置 CRUD + API检测 + Vision检测
│   │       ├── generate.ts            # [更新] vision/analyze 透传 category 参数
│   │       └── records.ts
└── README.md                          # [更新] 新功能说明和数据库结构
```

## 数据库结构

### model_configs 表
```sql
CREATE TABLE model_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  api_key TEXT,
  endpoint TEXT,
  use_proxy INTEGER DEFAULT 0,
  proxy_endpoint TEXT,
  category TEXT DEFAULT 'vision',
  capabilities TEXT,
  is_active INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## License

MIT License
