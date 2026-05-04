---
name: text-memory
description: 一键测试 Lightbulb AI 记忆系统的完整链路，验证各组件连通性和功能正确性。支持读取向量库摘要。
---

# /text — AI 对话记忆系统测试 Skill

> **用途**: 测试记忆系统完整链路、读取向量库摘要、验证各组件连通性。

---

## 文件位置参考

| 组件 | 路径 | 说明 |
|------|------|------|
| **LanceDB 数据目录** | `backend/data/lancedb/` | 向量数据库文件（相对路径，基于后端工作目录） |
| **LanceDB 表文件** | `backend/data/lancedb/lightbulb_memories.lance/` | 记忆向量表（含 data/、_versions/、_transactions/ 子目录） |
| **SQLite 数据库** | `data/lightbulb.db` | 对话摘要原文存储（conversations.summary 字段） |
| **lanceService.ts** | `backend/src/services/lanceService.ts` | LanceDB 存取层（延迟建表、降级机制） |
| **embeddingService.ts** | `backend/src/services/embeddingService.ts` | 多 Provider 嵌入生成（自动选择 aliyun/openai/google 等） |
| **memoryService.ts** | `backend/src/services/memoryService.ts` | 记忆管理（摘要触发、事实提取、跨对话检索） |
| **chat.ts** | `backend/src/routes/chat.ts` | 对话路由（SSE 流式 + 记忆注入 system prompt） |

---

## 触发方式

| 输入 | 行为 |
|------|------|
| `/text` | 执行记忆系统完整测试套件（8 项测试） |
| `/text quick` | 仅测试连通性（前 4 项：LanceDB + 嵌入 + AI 连接 + 存储） |
| `/text summary` | 测试摘要生成 + 事实提取（需后端运行） |
| `/text clean` | 清理测试产生的临时数据（conversationId=99999） |
| `/text read` | 读取向量库全部摘要和事实，显示文件位置 |

---

## 执行流程

收到命令后，按以下步骤**顺序执行**（每步依赖前步成功）。

**重要**：所有 `npx tsx -e` 内联脚本在 Windows 上有路径问题，需改为在 `backend/` 目录下创建临时 `.ts` 文件执行，测试完成后删除。

### Step 0: 前置检查

1. 确认后端是否在运行：`curl -s http://localhost:3001/health`
   - 失败 → 提示用户先启动后端（`cd backend && npm run dev`），终止测试
2. 确认是否有可用模型配置：`curl -s http://localhost:3001/api/model-configs`
   - 需要至少一个有 `apiKey` 的 `text` 类别配置用于 AI 连接和摘要测试
3. 检查 LanceDB 数据目录是否存在：`ls backend/data/lancedb/`
   - 不存在 → LanceDB 将在首次写入时自动创建

### Step 1: LanceDB 连通性 + 数据目录检查

在 `backend/` 下创建临时测试脚本 `_test_memory.ts` 并执行：

```typescript
import { getDatabase } from './src/database.js';
import { initLance, isLanceAvailable } from './src/services/lanceService.js';
import * as fs from 'fs';
import * as path from 'path';

await getDatabase();
await initLance();

const lanceDir = path.resolve('data/lancedb');
const dirExists = fs.existsSync(lanceDir);
const tableDir = path.join(lanceDir, 'lightbulb_memories.lance');
const tableExists = fs.existsSync(tableDir);

console.log('LanceDir:' + lanceDir);
console.log('DirExists:' + dirExists);
if (dirExists) {
  const files = fs.readdirSync(lanceDir);
  console.log('DirContents:' + files.join(','));
}
console.log('TableExists:' + tableExists);
console.log('Available:' + isLanceAvailable());
console.log('RESULT:' + (isLanceAvailable() ? 'PASS' : 'FAIL'));
```

**通过条件**: `RESULT:PASS`，同时输出 LanceDB 目录路径和表是否存在

**失败诊断**:
- 检查 `@lancedb/lancedb` 是否安装：`cd backend && npm list @lancedb/lancedb`
- 检查 `backend/data/lancedb/` 目录权限
- 如果 `Available:false` 且 `DirExists:true`：可能是 Node.js 版本或 native 模块问题

### Step 2: 嵌入生成（多 Provider 自动选择）

```typescript
import { getDatabase } from './src/database.js';
import { initLance } from './src/services/lanceService.js';
import { getEmbeddingConfig, generateEmbedding } from './src/services/embeddingService.js';

await getDatabase();
await initLance();

const config = await getEmbeddingConfig();
if (!config) { console.log('RESULT:FAIL:No embedding config'); process.exit(0); }

console.log('Provider:' + config.provider);
console.log('Model:' + config.model);
console.log('Endpoint:' + (config.endpoint || 'default').substring(0, 60));

const embedding = await generateEmbedding('测试文本');
console.log('Dimension:' + embedding.length);
console.log('RESULT:PASS');
```

**通过条件**: `RESULT:PASS`，显示 provider、model、dimension

**支持的嵌入 Provider**（按优先级自动选择）：

| Provider | 嵌入模型 | 维度 | Endpoint |
|----------|---------|------|----------|
| `openai` | text-embedding-3-small | 1536 | 默认 |
| `aliyun` | text-embedding-v3 | 1024 | dashscope compatible-mode/v1 |
| `google` | text-embedding-004 | 768 | generativelanguage v1beta/openai |
| `bytedance` | doubao-embedding-large-250515 | 1024 | ark.cn-beijing.volces.com/api/v3 |
| `baidu` | embedding-v1 | 384 | qianfan.baidubce.com/v2 |

**失败诊断**:
- `No embedding config`：需在模型管理中配置一个支持嵌入的 API（阿里云 dashscope 最易获取）
- API 404 错误：当前 provider 不支持嵌入模型（如 deepseek），需配置 aliyun/openai
- `custom` provider 的配置通过 endpoint 匹配自动识别（如包含 `dashscope` → aliyun）

### Step 3: AI 连接测试（chatCompletion）

```typescript
import { getDatabase } from './src/database.js';
import { getEmbeddingConfig } from './src/services/embeddingService.js';
import { chatCompletion } from './src/services/chatService.js';
import { getAllModelConfigs } from './src/database.js';

await getDatabase();

// 查找 text 类别的模型配置
const configs = await getAllModelConfigs();
const textConfig = configs.find(c => c.api_key && (c.category?.includes('text') || c.category === 'text'));
if (!textConfig) { console.log('RESULT:SKIP:No text model config'); process.exit(0); }

const config = {
  provider: textConfig.provider,
  model: textConfig.model,
  endpoint: textConfig.endpoint || '',
  apiKey: textConfig.api_key!,
  useProxy: !!textConfig.use_proxy,
  proxyEndpoint: textConfig.proxy_endpoint || '',
};

console.log('Model:' + config.provider + '/' + config.model);

const result = await chatCompletion(
  [{ role: 'user', content: '回复"连接正常"四个字' }],
  config,
  { maxTokens: 20, temperature: 0 }
);

console.log('Response:' + result.content.substring(0, 50));
console.log('Tokens:' + result.tokenUsage);
console.log('RESULT:PASS');
```

**通过条件**: `RESULT:PASS`，AI 返回包含"连接正常"或类似内容

**失败诊断**:
- 401 错误：API Key 无效
- 404 错误：模型名或 endpoint 不正确
- 超时：网络问题或代理配置错误

### Step 4: 记忆存储

```typescript
import { getDatabase } from './src/database.js';
import { initLance, storeMemory, isLanceAvailable } from './src/services/lanceService.js';

await getDatabase();
await initLance();

if (!isLanceAvailable()) { console.log('RESULT:FAIL:LanceDB not available'); process.exit(0); }

await storeMemory({ conversationId: 99999, content: '测试记忆-用户喜欢水彩画', type: 'fact' });
await storeMemory({ conversationId: 99999, content: '测试记忆-用户是插画师', type: 'fact' });
await storeMemory({ conversationId: 99999, content: '测试摘要-这是一个关于绘画的对话', type: 'summary' });

console.log('Stored:3');
console.log('RESULT:PASS');
```

**通过条件**: `RESULT:PASS`，LanceDB 表不存在时会自动创建

### Step 5: 语义检索

```typescript
import { getDatabase } from './src/database.js';
import { initLance, retrieveMemories, isLanceAvailable } from './src/services/lanceService.js';

await getDatabase();
await initLance();

if (!isLanceAvailable()) { console.log('RESULT:FAIL:LanceDB not available'); process.exit(0); }

const results = await retrieveMemories({ query: '用户做什么工作的', nResults: 3 });
if (results.length === 0) { console.log('RESULT:FAIL:No results'); process.exit(0); }

const hasRelevant = results.some(r => r.content.includes('插画师') || r.content.includes('水彩'));
console.log('Results:' + results.length + ' TopDistance:' + results[0].distance.toFixed(4));
results.forEach((r, i) => console.log('  ' + (i+1) + '. [' + r.distance.toFixed(4) + '] ' + r.content.substring(0, 60)));
console.log('Relevant:' + hasRelevant);
console.log('RESULT:' + (hasRelevant ? 'PASS' : 'FAIL'));
```

**通过条件**: 检索到包含"插画师"或"水彩"的结果，`RESULT:PASS`

**距离参考**：
- `< 0.7`：高度相关
- `0.7 - 1.0`：相关
- `1.0 - 1.5`：弱相关（阈值内）
- `> 1.5`：不相关（被过滤）

### Step 6: 跨对话检索

```typescript
import { getDatabase } from './src/database.js';
import { initLance, retrieveMemories, isLanceAvailable } from './src/services/lanceService.js';

await getDatabase();
await initLance();

if (!isLanceAvailable()) { console.log('RESULT:FAIL:LanceDB not available'); process.exit(0); }

// 不传 conversationId，跨对话检索所有记忆
const results = await retrieveMemories({ query: '绘画相关的话题', nResults: 5 });
const crossConv = results.filter(r => r.metadata.conversation_id);
console.log('CrossResults:' + crossConv.length);
results.forEach((r, i) => console.log('  ' + (i+1) + '. [conv:' + r.metadata.conversation_id + ' dist:' + r.distance.toFixed(4) + '] ' + r.content.substring(0, 60)));
if (crossConv.length === 0) { console.log('RESULT:FAIL:No cross-conv results'); process.exit(0); }
console.log('RESULT:PASS');
```

**通过条件**: 跨对话检索到结果，`RESULT:PASS`

### Step 7: 记忆删除

```typescript
import { getDatabase } from './src/database.js';
import { initLance, deleteConversationMemories, retrieveMemories, isLanceAvailable } from './src/services/lanceService.js';

await getDatabase();
await initLance();

if (!isLanceAvailable()) { console.log('RESULT:FAIL:LanceDB not available'); process.exit(0); }

await deleteConversationMemories(99999);
const after = await retrieveMemories({ query: '测试记忆', nResults: 5, conversationId: 99999 });
console.log('Remaining:' + after.length);
console.log('RESULT:' + (after.length === 0 ? 'PASS' : 'FAIL'));
```

**通过条件**: 删除后 conversationId=99999 的记忆为 0，`RESULT:PASS`

### Step 8: 摘要生成 + 事实提取（需后端运行）

此步骤通过 HTTP API 测试，需要后端运行中有 text 类别模型配置。

**摘要触发条件**（`memoryService.ts`）：
- 对话消息数 ≥ `SUMMARY_THRESHOLD`（20 条）
- 距上次摘要新增消息 ≥ `SUMMARY_STALE_MESSAGES`（10 条）
- 两个条件**同时满足**才触发
- 摘要生成后自动触发事实提取（从对话中提取 ≤10 条独立关键事实）

1. 查找满足条件的对话：
   ```bash
   curl -s "http://localhost:3001/api/chat/conversations?page=1&pageSize=50" | node -e "
   const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
   // 优先找无摘要的 20+ 消息对话
   const noSummary = d.data.conversations.find(c => c.messageCount >= 20 && !c.summary);
   if (noSummary) { console.log('CONV_ID:' + noSummary.id + ' MSGS:' + noSummary.messageCount + ' HAS_SUMMARY:false'); process.exit(0); }
   // 其次找有摘要但新增 10+ 消息的对话
   const stale = d.data.conversations.find(c => c.messageCount >= 30 && c.summary);
   if (stale) { console.log('CONV_ID:' + stale.id + ' MSGS:' + stale.messageCount + ' HAS_SUMMARY:true (may re-summarize)'); process.exit(0); }
   console.log('NO_SUITABLE_CONV');
   "
   ```

2. 如果找到合适的对话，触发摘要（需从模型配置中获取 API Key）：
   ```bash
   # 先获取可用的 text 模型配置
   curl -s http://localhost:3001/api/model-configs | node -e "
   const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
   const c = d.data.find(c => c.apiKey && (c.category?.includes('text') || c.category === 'text'));
   if (c) console.log(JSON.stringify({provider:c.provider,model:c.model,apiKey:c.apiKey,useProxy:c.useProxy,proxyEndpoint:c.proxyEndpoint||''}));
   else console.log('NO_TEXT_CONFIG');
   "
   ```
   然后用获取的配置调用摘要 API：
   ```bash
   curl -s -X POST "http://localhost:3001/api/chat/conversations/{CONV_ID}/summarize" \
     -H "Content-Type: application/json" \
     -d '{"config":{...获取的配置...}}'
   ```

3. 验证摘要已生成：
   - SQLite：`curl -s http://localhost:3001/api/chat/conversations/{CONV_ID}` 检查 `summary` 字段非空
   - LanceDB：通过 Step 6 跨对话检索应能找到该摘要

**通过条件**: 摘要 API 返回 `success: true` 且 `summary` 非空

**如无合适对话**：提示用户先进行一段 20+ 条消息的对话，或使用 `/text summary` 命令单独测试

---

## `/text read` — 读取向量库摘要

此命令读取 LanceDB 中所有存储的记忆（摘要 + 事实），并显示文件位置信息。

### 执行步骤

1. 在 `backend/` 下创建临时脚本 `_read_memories.ts`：

```typescript
import { getDatabase } from './src/database.js';
import { initLance, retrieveMemories, isLanceAvailable } from './src/services/lanceService.js';
import * as fs from 'fs';
import * as path from 'path';

await getDatabase();
await initLance();

// 显示文件位置
const lanceDir = path.resolve('data/lancedb');
const tableDir = path.join(lanceDir, 'lightbulb_memories.lance');
console.log('=== LanceDB 文件位置 ===');
console.log('数据目录: ' + lanceDir);
console.log('表目录:   ' + tableDir);
console.log('目录存在: ' + fs.existsSync(lanceDir));
console.log('表存在:   ' + fs.existsSync(tableDir));

if (fs.existsSync(lanceDir)) {
  const size = getDirSize(lanceDir);
  console.log('数据大小: ' + (size / 1024 / 1024).toFixed(2) + ' MB');
}

console.log('');
console.log('=== LanceDB 可用性 ===');
console.log('Available: ' + isLanceAvailable());

if (!isLanceAvailable()) {
  console.log('LanceDB 不可用，无法读取记忆');
  process.exit(0);
}

// 读取所有摘要
console.log('');
console.log('=== 摘要 (summary) ===');
const summaries = await retrieveMemories({ query: '对话摘要', nResults: 20 });
const summaryItems = summaries.filter(m => m.metadata.type === 'summary');
if (summaryItems.length === 0) {
  console.log('(无摘要)');
} else {
  summaryItems.forEach((m, i) => {
    console.log('--- 摘要 #' + (i+1) + ' [conv:' + m.metadata.conversation_id + ' dist:' + m.distance.toFixed(4) + '] ---');
    console.log(m.content.substring(0, 300));
    if (m.content.length > 300) console.log('...(截断)');
  });
}

// 读取所有事实
console.log('');
console.log('=== 关键事实 (fact) ===');
const facts = await retrieveMemories({ query: '用户偏好和信息', nResults: 20 });
const factItems = facts.filter(m => m.metadata.type === 'fact');
if (factItems.length === 0) {
  console.log('(无事实)');
} else {
  factItems.forEach((m, i) => {
    console.log('  ' + (i+1) + '. [conv:' + m.metadata.conversation_id + '] ' + m.content);
  });
}

// 统计
console.log('');
console.log('=== 统计 ===');
console.log('摘要总数: ' + summaryItems.length);
console.log('事实总数: ' + factItems.length);

// SQLite 中的对话摘要
console.log('');
console.log('=== SQLite 对话摘要 ===');
console.log('SQLite 文件位置: ' + path.resolve('../../data/lightbulb.db'));

function getDirSize(dir: string): number {
  let size = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) size += getDirSize(full);
    else if (entry.isFile()) size += fs.statSync(full).size;
  }
  return size;
}
```

2. 执行：`cd D:/code/workspace/lightbulb-AI/backend && npx tsx _read_memories.ts`

3. 额外：通过 API 读取 SQLite 中的对话摘要：
   ```bash
   curl -s "http://localhost:3001/api/chat/conversations?page=1&pageSize=50" | node -e "
   const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
   const withSummary = d.data.conversations.filter(c => c.summary);
   console.log('有摘要的对话: ' + withSummary.length + '/' + d.data.total);
   withSummary.forEach(c => {
     console.log('--- 对话 #' + c.id + ' [' + c.title + '] (' + c.messageCount + '条消息) ---');
     console.log(c.summary.substring(0, 200));
     if (c.summary.length > 200) console.log('...(截断)');
     console.log('');
   });
   "
   ```

4. 清理临时文件：`rm -f backend/_read_memories.ts`

### 输出包含

| 信息 | 来源 |
|------|------|
| LanceDB 数据目录路径 | `backend/data/lancedb/` |
| 表目录路径 | `backend/data/lancedb/lightbulb_memories.lance/` |
| 数据大小 | 目录递归计算 |
| 所有摘要内容 | LanceDB 向量检索 |
| 所有关键事实 | LanceDB 向量检索 |
| SQLite 对话摘要 | HTTP API `/api/chat/conversations` |
| SQLite 文件位置 | `data/lightbulb.db` |

---

## 输出格式

每步测试输出一行结果，格式统一：

```
✅/❌ [Step N] 测试名称  —  附加信息
```

全部完成后输出汇总表：

```
╔══════════════════════════════════════════════════╗
║           记忆系统测试报告                         ║
╠══════════════════════════════════════════════════╣
║ Step 1  LanceDB 连通性        ✅ 已连接            ║
║ Step 2  嵌入生成              ✅ aliyun 1024d      ║
║ Step 3  AI 连接               ✅ deepseek-chat     ║
║ Step 4  记忆存储              ✅ 3 条              ║
║ Step 5  语义检索              ✅ 距离 0.61         ║
║ Step 6  跨对话检索            ✅ 5 条结果          ║
║ Step 7  记忆删除              ✅ 已清理            ║
║ Step 8  摘要生成              ✅ 生成成功          ║
╠══════════════════════════════════════════════════╣
║ 通过率: 8/8                                      ║
╚══════════════════════════════════════════════════╝
```

---

## 常见故障排查

| 症状 | 可能原因 | 解决方案 |
|------|---------|---------|
| LanceDB not available | `@lancedb/lancedb` 未安装或版本冲突 | `cd backend && npm install @lancedb/lancedb` |
| No embedding config | 没有支持嵌入的 API 配置 | 在模型管理中添加阿里云（dashscope）API Key |
| 嵌入 404 错误 | 当前 provider 不支持嵌入模型 | 确保配置了 aliyun/openai 的 API（非 deepseek） |
| AI 连接 401 | API Key 无效 | 检查模型管理中的 API Key 是否有效 |
| 检索 0 结果 | LanceDB 表为空 | 确认摘要已被触发（需对话 ≥ 20 条消息，且新增 ≥ 10 条） |
| 跨对话检索失败 | chat.ts 传了 conversationId 限制 | 确认代码已修复为不传 conversationId |
| 摘要未触发 | 消息数不够或摘要不陈旧 | 对话需 ≥ 20 条消息，且距上次摘要 ≥ 10 条新消息 |
| LanceDB 数据在错误位置 | 相对路径基于工作目录 | 确保从 `backend/` 目录启动后端，数据在 `backend/data/lancedb/` |
| `npx tsx -e` 脚本报错 | Windows 下内联脚本路径问题 | 使用临时 .ts 文件方式执行 |

---

## 注意事项

- 测试使用的 conversationId=99999 在 Step 7 自动清理
- 如 Step 8 找不到 ≥20 消息的对话，提示用户先进行一段较长的对话
- 所有临时测试脚本在 `backend/` 目录下创建，测试完成后必须删除（`rm -f backend/_test_memory.ts`）
- 嵌入 API 调用消耗少量 token，AI 连接测试消耗约 20-50 tokens
- 摘要触发条件：消息数 ≥ 20 **且** 距上次摘要新增 ≥ 10 条，两者缺一不可
- LanceDB 数据存储在 `backend/data/lancedb/`（相对路径，基于后端启动的工作目录）
- 摘要原文同时存于 SQLite（`conversations.summary`）和 LanceDB（向量检索用）
