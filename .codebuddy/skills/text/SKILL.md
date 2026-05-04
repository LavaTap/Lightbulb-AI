---
name: text-memory
description: 一键测试 Lightbulb AI 记忆系统的完整链路，验证各组件连通性和功能正确性。
---

# /test-memory — AI 对话记忆系统测试 Skill

> **用途**: 一键测试 Lightbulb AI 记忆系统的完整链路，验证各组件连通性和功能正确性。

---

## 触发方式

| 输入 | 行为 |
|------|------|
| `/text` | 执行记忆系统完整测试套件（7 项测试） |
| `/text quick` | 仅测试连通性（前 3 项：LanceDB + 嵌入 + 存储） |
| `/text summary` | 测试摘要生成 + 事实提取（需要后端运行中） |
| `/text clean` | 清理测试产生的临时数据 |

---

## 执行流程

收到命令后，按以下步骤**顺序执行**（每步依赖前步成功）：

### Step 0: 前置检查

1. 确认后端是否在运行：`curl -s http://localhost:3001/health`
   - 失败 → 提示用户先启动后端（`cd backend && npm run dev`），终止测试
2. 确认是否有可用模型配置：`curl -s http://localhost:3001/api/model-configs`
   - 需要至少一个有 `apiKey` 的 `text` 类别配置用于摘要/事实提取测试

### Step 1: LanceDB 连通性

```bash
cd D:/code/workspace/lightbulb-AI/backend && npx tsx -e "
import { getDatabase } from './src/database.js';
import { initLance, isLanceAvailable } from './src/services/lanceService.js';
await getDatabase();
await initLance();
console.log('RESULT:' + (isLanceAvailable() ? 'PASS' : 'FAIL'));
"
```

**通过条件**: 输出 `RESULT:PASS`

**失败诊断**:
- 检查 `@lancedb/lancedb` 是否安装：`npm list @lancedb/lancedb`
- 检查 `backend/data/lancedb/` 目录权限

### Step 2: 嵌入生成

```bash
cd D:/code/workspace/lightbulb-AI/backend && npx tsx -e "
import { getDatabase } from './src/database.js';
import { initLance } from './src/services/lanceService.js';
import { getEmbeddingConfig, generateEmbedding } from './src/services/embeddingService.js';
await getDatabase();
await initLance();
const config = await getEmbeddingConfig();
if (!config) { console.log('RESULT:FAIL:No embedding config'); process.exit(0); }
console.log('Provider:' + config.provider + ' Model:' + config.model);
const embedding = await generateEmbedding('测试文本');
console.log('Dimension:' + embedding.length);
console.log('RESULT:PASS');
"
```

**通过条件**: 输出 `RESULT:PASS`，并显示 provider 和维度

**失败诊断**:
- 如果 `No embedding config`：需要在模型管理中配置一个支持嵌入的 API（阿里云/OpenAI/Google）
- 如果 API 报错：检查 API Key 有效性，或嵌入模型名称是否被该 provider 支持

### Step 3: 记忆存储

```bash
cd D:/code/workspace/lightbulb-AI/backend && npx tsx -e "
import { getDatabase } from './src/database.js';
import { initLance, storeMemory, isLanceAvailable } from './src/services/lanceService.js';
await getDatabase();
await initLance();
if (!isLanceAvailable()) { console.log('RESULT:FAIL:LanceDB not available'); process.exit(0); }
await storeMemory({ conversationId: 99999, content: '测试记忆条目-用户喜欢水彩画', type: 'fact' });
await storeMemory({ conversationId: 99999, content: '测试记忆条目-用户是插画师', type: 'fact' });
await storeMemory({ conversationId: 99999, content: '测试摘要-这是一个关于绘画的对话', type: 'summary' });
console.log('RESULT:PASS');
"
```

**通过条件**: 输出 `RESULT:PASS`

### Step 4: 语义检索

```bash
cd D:/code/workspace/lightbulb-AI/backend && npx tsx -e "
import { getDatabase } from './src/database.js';
import { initLance, retrieveMemories, isLanceAvailable } from './src/services/lanceService.js';
await getDatabase();
await initLance();
if (!isLanceAvailable()) { console.log('RESULT:FAIL:LanceDB not available'); process.exit(0); }
const results = await retrieveMemories({ query: '用户做什么工作的', nResults: 3 });
if (results.length === 0) { console.log('RESULT:FAIL:No results'); process.exit(0); }
const hasRelevant = results.some(r => r.content.includes('插画师') || r.content.includes('水彩'));
console.log('Results:' + results.length + ' TopDistance:' + results[0].distance.toFixed(4));
console.log('Relevant:' + hasRelevant);
console.log('RESULT:' + (hasRelevant ? 'PASS' : 'FAIL'));
"
```

**通过条件**: 检索到包含"插画师"或"水彩"的结果，输出 `RESULT:PASS`

### Step 5: 跨对话检索

```bash
cd D:/code/workspace/lightbulb-AI/backend && npx tsx -e "
import { getDatabase } from './src/database.js';
import { initLance, retrieveMemories, isLanceAvailable } from './src/services/lanceService.js';
await getDatabase();
await initLance();
if (!isLanceAvailable()) { console.log('RESULT:FAIL:LanceDB not available'); process.exit(0); }
// 不传 conversationId，跨对话检索
const results = await retrieveMemories({ query: '绘画相关的话题', nResults: 5 });
const crossConv = results.filter(r => r.metadata.conversation_id);
console.log('CrossResults:' + crossConv.length);
if (crossConv.length === 0) { console.log('RESULT:FAIL:No cross-conv results'); process.exit(0); }
console.log('RESULT:PASS');
"
```

**通过条件**: 跨对话检索到结果，输出 `RESULT:PASS`

### Step 6: 记忆删除

```bash
cd D:/code/workspace/lightbulb-AI/backend && npx tsx -e "
import { getDatabase } from './src/database.js';
import { initLance, deleteConversationMemories, retrieveMemories, isLanceAvailable } from './src/services/lanceService.js';
await getDatabase();
await initLance();
if (!isLanceAvailable()) { console.log('RESULT:FAIL:LanceDB not available'); process.exit(0); }
await deleteConversationMemories(99999);
const after = await retrieveMemories({ query: '测试记忆条目', nResults: 5, conversationId: 99999 });
console.log('Remaining:' + after.length);
console.log('RESULT:' + (after.length === 0 ? 'PASS' : 'FAIL'));
"
```

**通过条件**: 删除后 conversationId=99999 的记忆为 0，输出 `RESULT:PASS`

### Step 7: 摘要生成 + 事实提取（需后端运行）

此步骤通过 HTTP API 测试，需要后端运行中且有 text 类别模型配置。

1. 找到一个消息数 ≥ 20 的对话（如无则提示跳过）：
   ```bash
   curl -s "http://localhost:3001/api/chat/conversations?page=1&pageSize=50" | node -e "
   const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
   const conv = d.data.conversations.find(c => c.messageCount >= 20 && !c.summary);
   if (conv) console.log('CONV_ID:' + conv.id + ' MSGS:' + conv.messageCount);
   else console.log('NO_SUITABLE_CONV');
   "
   ```

2. 如果找到合适的对话，触发摘要：
   ```bash
   # 需要用一个 text 类别的模型配置
   curl -s -X POST "http://localhost:3001/api/chat/conversations/{CONV_ID}/summarize" \
     -H "Content-Type: application/json" \
     -d '{"config":{"provider":"deepseek","model":"deepseek-chat","apiKey":"...","useProxy":true,"proxyEndpoint":"https://api.deepseek.com/v1"}}'
   ```

3. 验证摘要已生成且 LanceDB 中有对应数据

**通过条件**: 摘要 API 返回 `success: true` 且 `summary` 非空

---

## 输出格式

每步测试输出一行结果，格式统一：

```
✅/❌ [Step N] 测试名称  —  附加信息
```

全部完成后输出汇总表：

```
╔══════════════════════════════════════════════╗
║        记忆系统测试报告                       ║
╠══════════════════════════════════════════════╣
║ Step 1  LanceDB 连通性      ✅ 已连接         ║
║ Step 2  嵌入生成            ✅ aliyun 1024d   ║
║ Step 3  记忆存储            ✅ 3 条           ║
║ Step 4  语义检索            ✅ 距离 0.61      ║
║ Step 5  跨对话检索          ✅ 5 条结果       ║
║ Step 6  记忆删除            ✅ 已清理         ║
║ Step 7  摘要生成            ✅ 生成成功       ║
╠══════════════════════════════════════════════╣
║ 通过率: 7/7                                 ║
╚══════════════════════════════════════════════╝
```

---

## 常见故障排查

| 症状 | 可能原因 | 解决方案 |
|------|---------|---------|
| LanceDB not available | `@lancedb/lancedb` 未安装或版本冲突 | `cd backend && npm install @lancedb/lancedb` |
| No embedding config | 没有支持嵌入的 API 配置 | 在模型管理中添加阿里云/OpenAI 的 API Key |
| 嵌入 404 错误 | 当前 provider 不支持嵌入模型 | 确保配置了阿里云（dashscope）或 OpenAI 的 API |
| 检索 0 结果 | LanceDB 表为空或嵌入维度不匹配 | 确认摘要已被触发（需对话 ≥ 20 条消息） |
| 跨对话检索失败 | chat.ts 中传了 conversationId 限制 | 确认代码已修复为不传 conversationId |

---

## 注意事项

- 测试使用的 conversationId=99999 会在 Step 6 自动清理
- 如 Step 7 找不到 ≥20 消息的对话，可提示用户先进行一段较长的对话
- 所有测试脚本运行在 `backend/` 工作目录下
- 嵌入 API 调用会消耗少量 token
