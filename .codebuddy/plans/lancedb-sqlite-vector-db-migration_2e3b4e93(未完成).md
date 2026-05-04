---
name: lancedb-sqlite-vector-db-migration
overview: 完全替换 ChromaDB 为 LanceDB 嵌入式向量数据库，与 SQLite 组成本地一体化的 AI 对话向量记忆系统，无需外部进程依赖。
todos:
  - id: replace-chroma-with-lance
    content: 创建 lanceService.ts 替代 chromaService.ts，实现 LanceDB 嵌入式连接、记忆存取、向量检索和条件删除
    status: pending
  - id: update-imports
    content: 更新 memoryService.ts、routes/chat.ts、index.ts 的导入和函数调用，从 ChromaDB 切换到 LanceDB
    status: pending
    dependencies:
      - replace-chroma-with-lance
  - id: update-package-json
    content: 修改 backend/package.json，移除 chromadb 依赖，新增 @lancedb/lancedb，删除旧 chromaService.ts 文件
    status: pending
    dependencies:
      - replace-chroma-with-lance
  - id: update-documentation
    content: 更新 DEVELOPER.md 和 CLAUDE.md，将 ChromaDB 引用替换为 LanceDB，同步架构描述和开发指南
    status: pending
    dependencies:
      - update-imports
---

## 用户需求

将 Lightbulb AI 项目的 AI 对话记忆系统从 **ChromaDB（外部进程）** 完全替换为 **LanceDB（嵌入式模式）**，与现有 SQLite（sql.js）配合，构成"结构化数据 + 向量检索"双库架构。LanceDB 数据文件存储在本地 `data/lancedb/` 目录，无需启动外部进程。

## 核心功能

- 用 LanceDB 替换 ChromaDB，保持相同的记忆存取 API（storeMemory / retrieveMemories / deleteConversationMemories）
- 保持 OpenAI Embedding（text-embedding-3-small, 1536维）不变
- 保持记忆检索策略不变：用户消息 → embedding → 向量检索 top 5 → cosine 过滤 → 注入 system prompt
- 保持降级机制：LanceDB 初始化失败时对话正常工作，仅记忆功能关闭
- 移除 chromadb npm 依赖，新增 @lancedb/lancedb，无需再启动外部 ChromaDB 进程

## 技术栈选择

- **向量数据库**: `@lancedb/lancedb`（npm 包，嵌入式模式，数据存磁盘）
- **结构化数据库**: sql.js（嵌入式 SQLite），保持不变
- **Embedding**: OpenAI `text-embedding-3-small`（1536维），`embeddingService.ts` 保持不变
- **后端框架**: Express + TypeScript，保持不变

## 实现方案

### 整体策略

创建 `backend/src/services/lanceService.ts` 替代 `chromaService.ts`，保持完全相同的导出接口签名，使 `memoryService.ts` 和 `routes/chat.ts` 只需修改导入路径，内部逻辑不变。

### LanceDB 与 ChromaDB 的关键差异处理

| 维度 | ChromaDB | LanceDB | 处理方式 |
| --- | --- | --- | --- |
| 运行模式 | 外部进程 :8000 | 嵌入式文件目录 | `connect('data/lancedb')` |
| 表/集合管理 | `getOrCreateCollection()` | `createTable()` / `openTable()` | 首次运行时创建表，后续直接打开 |
| 数据写入 | `collection.add()` 批量 | `table.add(arrowRecords)` | 转为 Arrow 格式记录 |
| 向量检索 | `collection.query()` | `table.search().distanceType().limit().toArray()` | 指定 cosine 距离 |
| 条件删除 | `collection.delete({ where })` | `table.delete('sql_predicate')` | 使用 SQL 风格谓词 |
| Schema | 动态 infer | 需预定义 Arrow Schema | 定义固定 schema |


### 数据流程（替换后）

```
用户发送消息
  → chat.ts: 构建 history + system prompt
  → memoryService.getRelevantMemories(query, config, conversationId)
     → lanceService.retrieveMemories({ query, nResults: 5, conversationId })
        → embeddingService.generateEmbedding(query) → 1536维向量
        → table.search(vector).distanceType('cosine').limit(5).toArray()
        → 过滤 _distance < 1.5 的结果
        → 返回 [{ content, metadata, distance }]
  → 注入 system prompt → chatService.chatCompletionStream()
  → 回复完成后异步触发摘要
     → memoryService.maybeSummarizeConversation()
        → lanceService.storeMemory({ content: summary, type: 'summary' })
```

### 性能要点

- **嵌入模式优势**: 无网络开销，向量检索在进程内完成，比 ChromaDB HTTP 调用更快
- **Lance 列式格式**: 适合批量向量操作，内存映射（mmap）减少内存占用
- **启动加速**: 不再依赖外部进程，启动时间由 ChromaDB 的 2-3秒 降为毫秒级

## 实现注意事项

### 向后兼容

- 导出接口签名与 chromaService 完全一致（函数名、参数结构、返回类型）
- `memoryService.ts` 仅修改 `import` 语句，内部逻辑零改动
- 旧 ChromaDB 数据目录 `data/chromadb/` 不再使用，可手动删除

### 降级处理

- `initLanceDB()` 使用 try/catch，失败时设置 `available = false`
- 通过 `isLanceDBAvailable()` 守卫所有向量操作
- 降级时日志输出友好提示，与旧行为一致

### 错误处理

- 每次向量操作包裹 try/catch，失败时返回空数组/void，不抛异常
- 日志使用 `[LanceService]` 前缀，与旧 `[ChromaService]` 区分

## 架构设计

### 修改后的数据库架构

```
┌─────────────────────────────────────────────────┐
│                  后端 Express                     │
│                                                   │
│  ┌──────────────┐  ┌──────────────┐              │
│  │ memoryService│  │embeddingService│             │
│  │ (记忆管理)    │  │ (1536维embed) │             │
│  └──────┬───────┘  └──────────────┘              │
│         │                                         │
│  ┌──────▼──────────────────────────────────┐     │
│  │         双数据库层（均为嵌入式）             │     │
│  │  ┌─────────────┐  ┌──────────────────┐  │     │
│  │  │ sql.js       │  │ @lancedb/lancedb │  │     │
│  │  │ (SQLite)     │  │ (向量数据库)      │  │     │
│  │  │              │  │                  │  │     │
│  │  │ conversations│  │ lightbulb_       │  │     │
│  │  │ chat_messages│  │ memories 表      │  │     │
│  │  │              │  │ · vector(1536)   │  │     │
│  │  │ data/        │  │ · content        │  │     │
│  │  │ lightbulb.db │  │ · metadata       │  │     │
│  │  └─────────────┘  │ data/lancedb/    │  │     │
│  │                    └──────────────────┘  │     │
│  └──────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

## 目录结构

```
lightbulb-AI/
├── backend/
│   ├── package.json              # [MODIFY] 移除 chromadb，新增 @lancedb/lancedb
│   └── src/
│       ├── index.ts              # [MODIFY] initChroma → initLanceDB，更新日志
│       ├── services/
│       │   ├── chromaService.ts  # [DELETE] 删除旧 ChromaDB 服务
│       │   ├── lanceService.ts   # [NEW] LanceDB 向量服务，提供与 chromaService 相同的导出接口
│       │   ├── memoryService.ts  # [MODIFY] 导入从 chromaService 改为 lanceService
│       │   ├── embeddingService.ts  # [KEEP] 不变，继续生成 OpenAI Embedding
│       │   └── chatService.ts    # [KEEP] 不变
│       └── routes/
│           └── chat.ts           # [MODIFY] isChromaAvailable → isLanceDBAvailable
├── DEVELOPER.md                  # [MODIFY] ChromaDB 引用全部更新为 LanceDB
├── CLAUDE.md                     # [MODIFY] 同步更新向量数据库描述
└── start.bat                     # [KEEP] 不再需要启动 ChromaDB，保持不变
```

### 文件详细说明

#### `backend/src/services/lanceService.ts` [NEW]

LanceDB 向量数据库服务，完全替代 chromaService.ts。实现功能:

- `initLanceDB()` — 嵌入式连接 `data/lancedb/` 目录，创建或打开 `lightbulb_memories` 表
- `isLanceDBAvailable()` — 返回初始化状态
- `storeMemory({ conversationId, content, type, metadata?, config? })` — 将记忆内容转为 embedding 后存入 LanceDB
- `retrieveMemories({ query, nResults?, conversationId?, config? })` — 查询 embedding → LanceDB 向量检索 → 返回 top N 结果
- `deleteConversationMemories(conversationId)` — 按 conversation_id 删除相关记忆

表 Schema（Arrow 类型）:

- `id`: utf8 (主键，格式 `conv_{conversationId}_{type}_{timestamp}`)
- `vector`: fixed_size_list(float32, 1536)
- `content`: utf8
- `conversation_id`: utf8
- `type`: utf8 (summary | fact)
- `created_at`: utf8 (ISO 时间戳)

#### `backend/src/services/memoryService.ts` [MODIFY]

仅修改第3行导入语句:

- 旧: `import { isChromaAvailable, storeMemory, retrieveMemories, deleteConversationMemories } from './chromaService.js'`
- 新: `import { isLanceDBAvailable, storeMemory, retrieveMemories, deleteConversationMemories } from './lanceService.js'`
- 内部函数调用 `isChromaAvailable()` → `isLanceDBAvailable()`
- 日志前缀 `[MemoryService]` 保持不变
- `chromaUnavailableLogged` 变量重命名为 `lanceUnavailableLogged`

#### `backend/src/routes/chat.ts` [MODIFY]

仅修改第6行导入和193行调用:

- 导入: `import { isChromaAvailable }` → `import { isLanceDBAvailable }`
- 调用: `isChromaAvailable()` → `isLanceDBAvailable()`

#### `backend/src/index.ts` [MODIFY]

- 第4行: `import { initChroma }` → `import { initLanceDB }`
- 第16-21行: `initChroma()` → `initLanceDB()`，日志 `ChromaDB` → `LanceDB`

#### `backend/package.json` [MODIFY]

- 移除 `"chromadb": "^1.8.1"` 
- 新增 `"@lancedb/lancedb": "^0.15.0"`（嵌入式向量数据库）

#### `DEVELOPER.md` [MODIFY]

全文搜索替换：

- "ChromaDB" → "LanceDB"（嵌入式）
- 移除 ChromaDB 外部进程启动说明（§10.1 第5步）
- 更新 §3 目录结构中 `chromaService.ts` → `lanceService.ts`
- 更新 §8.7 架构描述
- Changelog 新增 v2.7 条目

#### `CLAUDE.md` [MODIFY]

- 第14行: "ChromaDB 向量检索" → "LanceDB 嵌入式向量检索"
- 移除 ChromaDB 启动步骤说明