# Lightbulb AI

> 本地优先的 AI 创意辅助工具，为创作者提供一站式 AI 生成服务，支持 10+ AI 服务商开箱即用。详细实现文档见 [DEVELOPER.md](./DEVELOPER.md)。

## 适用范围

| 范围 | 说明 |
|------|------|
| 生效 | 所有新增功能、修复 bug、重构代码操作 |
| 排除 | 纯文档更新（README/DEVELOPER）可跳过部分规范 |

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

## 核心架构规则

Lightbulb AI 采用简单的 monorepo 结构：

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

### 新增功能流程

| 操作 | 步骤 |
|------|------|
| **新增功能页面** | 1. 添加到 `frontend/src/pages/`<br>2. 在 `App.tsx` 的 FeatureType 和 renderPage 注册<br>3. 在 `Header.tsx` 的 TABS 数组添加导航项 |
| **新增 API 端点** | 1. 在 `backend/src/routes/` 添加路由处理函数<br>2. 在 `backend/src/middleware/validateRequest.ts` 定义 Zod 校验 schema |
| **新增 AI 服务商** | 1. 在 `ModelManagerContent.tsx` 和 `ModelSelector.tsx` 的 `PROVIDERS[]` 添加条目<br>2. 更新前端和后端 `types/index.ts` 中 `APIConfig.provider` 联合类型<br>3. 在 `validateRequest.ts` 所有 Zod schema 中添加服务商枚举值<br>4. 非 OpenAI 兼容 API：在 `imageGenService.ts` 添加自定义逻辑<br>5. 在 `modelConfigs.ts` 添加测试/检测逻辑 |

### 关键约束

| 规则 | 说明 | ✅ 正确 | ❌ 错误 |
|------|------|--------|--------|
| **SQLite 持久化** | 所有数据库写入操作**必须**调用 `saveDatabase()` 才能持久化到磁盘 | ```typescript db.run(...); saveDatabase(db); ``` | ```typescript db.run(...); // 忘记调用 saveDatabase ``` |
| **组件模型** | 仅使用函数式组件 + Hooks，**禁止** class 组件 | ```typescript export function MyComponent() { const [state, setState] = useState(); ... } ``` | ```typescript export class MyComponent extends Component { ... } ``` |
| **路径别名** | 前端导入使用 `@/` 别名映射到 `src/` | ```typescript import { api } from '@/services/api'; ``` | ```typescript import { api } from '../../../services/api'; ``` |
| **业务逻辑位置** | 业务逻辑放在自定义 Hooks 中，不要放在页面组件 | 逻辑在 `useGeneration.ts`，页面仅做渲染 | 所有逻辑写在 `*Page.tsx` 组件中 |
| **请求校验** | 后端所有面向用户的 API 端点必须使用 Zod 校验 | 定义 schema 然后用 `validateRequest` 中间件 | 直接从 `req.body` 读取不校验 |
| **双图存储** | 生成图片同时存储缩略图（200px）和原图 | 调用 `compressImage` 生成缩略图后入库 | 仅存储原图导致列表加载缓慢 |

## 代码风格

### TypeScript 约定

| 规则 | 做法 |
|------|------|
| **interface vs type** | 对象形状用 `interface`，联合类型/工具类型用 `type` |
| **导出风格** | **优先使用命名导出**，极少使用默认导出（项目现有代码遵循此约定） |
| **any 禁止** | 依赖 TypeScript strict + ESLint `no-explicit-any` 禁止显式 any |
| **key 约束** | 列表渲染使用稳定唯一 key，**禁止**使用数组 index |

### 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `SkillRouter.tsx` |
| Hook 文件 | camelCase | `useGeneration.ts` |
| 组件名 | PascalCase | `SkillRouter` |
| Props 接口 | `*Props` | `SkillRouterProps` |
| Hook | `use*` 前缀 | `useGeneration` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 测试文件 | `*.test.ts(x)` | `generation.test.tsx` |

### 示例

```typescript
// ✅ 正确 - 命名导出 + interface + 函数组件
export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  tokenUsage?: number;
}

export function ChatMessage({ role, content, tokenUsage }: ChatMessageProps) {
  return <div className={...}>{content}</div>;
}

// ❌ 错误 - 默认导出 + type 用于对象形状
type Props = {
  // ...
};

export default function ChatMessage(props: Props) {
  // ...
}
```

## 测试规范

**测试策略：TDD 优先**（红灯→绿灯→重构）

1. **流程**：先写失败测试 → 最小实现通过 → 重构
2. **框架**：使用 Vitest 作为测试框架
3. **优先级**：
   - 服务层函数（图像生成、视觉分析、海报生成）
   - 核心 API 端点
   - 通用工具函数
4. **原则**：最小测试，仅聚焦核心业务逻辑
   - 测试用户行为而非实现细节
   - 无全量测试覆盖要求，仅测试关键路径
   - 禁止为凑覆盖率测试内部实现细节

## 安全规范

- **校验策略**：基本校验，仅针对核心接口
- 所有面向用户的 API 端点必须有 Zod 请求校验
- 处理文件上传和图像数据前先进行 sanitize 处理
- API 密钥以明文存储（仅适合本地使用，请勿部署到公共服务器）

## 开发流程

1. 从 main 分支创建 feature 分支
2. 实现功能/修复 bug
3. 运行 `npm run lint` 检查代码质量
4. 运行 `npm run format` 格式化代码
5. 运行针对变更代码的相关测试
6. 提交变更（pre-commit 钩子会自动运行 lint 和格式检查）
7. 提交 pull request 进行代码审查

## 关键注意事项

- **SQLite 并发**：sql.js 是单线程的，避免并发写入操作
- **图片大小限制**：前端上传前会压缩图片，后端有 50MB 请求体限制
- **API 密钥安全**：密钥以明文存储在本地 SQLite 数据库中（本地使用可接受）
- **长时运行请求**：图像生成请求有 2 分钟超时，gptimage2 请求有 10 分钟超时
- **SSE 流式响应**：对话消息使用原生 fetch（非 Axios），后端通过 `res.write()` + `res.end()` 推送
- **Token 计量**：图像生成 API 无标准 token 返回时按 `prompt.length / 4` 估算；对话按 API 实际返回 `total_tokens` 记录

---

**红线：** 必须调用 `saveDatabase()` 后写入才持久 · TDD 优先先写测试再实现 · 新增服务商必须四处同步（PROVIDERS + 两处 types + Zod schema） · SQLite 单线程避免并发写入
