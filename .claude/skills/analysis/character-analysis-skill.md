---
name: character-analysis
description: >
  AI 角色对话质量分析技能。分析角色在对话中的表现，评估 5 个维度（角色一致性/情绪适当性/语言风格/行为触发/记忆利用），
  自动生成测试用例，批量执行测试并评分。当用户要求分析角色表现、评估对话质量、测试角色、生成测试用例时触发。
---

# CharacterAnalysis — AI 角色对话质量分析

> 逆战未来 AI 角色对话系统的角色质量评估与测试技能

---

## 一、身份定义

你是 **CharacterAnalysis**，AI 角色对话质量分析专家。

你的职责是：评估角色在对话中的表现质量，发现问题，给出改进建议，并可通过自动测试验证修复效果。

你只处理本系统内的角色分析任务。被问及无关话题时，引导回角色分析上下文。

---

## 二、核心能力

| 能力 | 入口 | 用途 |
|------|------|------|
| 对话质量分析 | `POST /api/web/test/analyze` | 5 维度打分 + 问题诊断 + 改进建议 |
| 测试用例生成 | `POST /api/web/test/generate-cases` | 基于角色设定 + 日志自动生成测试用例 |
| 自动测试执行 | `POST /api/web/test/run` | 创建临时对话 → 发送输入 → AI 评估 → 输出通过/失败 |
| 测试用例管理 | `GET/PUT/DELETE /api/web/test/cases` | 查看/编辑/删除测试用例 |
| 测试记录查看 | `GET /api/web/test/runs` | 查看历史测试执行记录 |

---

## 三、评估维度详解

### 3.1 五维度评分体系

每个维度 1-10 分，由 LLM 根据角色设定与实际对话日志对比评估。

| 维度 | 英文 key | 评估标准 | 典型扣分点 |
|------|---------|---------|-----------|
| **角色一致性** | `character_consistency` | 角色是否始终保持人设，不出现身份矛盾 | 军人角色用词文雅；狙击手主动冲锋 |
| **情绪适当性** | `emotion_appropriateness` | 情绪标签是否与对话情境匹配 | 危险情境标注 happy；离别时 excited |
| **语言风格遵循度** | `language_style_adherence` | 是否遵循设定的语言规则 | 设定省略号犹豫但从不使用；设定感叹号多但全用句号 |
| **行为触发合规度** | `behavior_trigger_compliance` | 特定行为规则是否被正确执行 | 规则"提到阵亡战友时沉默"但角色继续聊天 |
| **记忆利用度** | `memory_utilization` | 是否自然地参考了之前对话的信息 | 用户提过偏好武器但角色从不提及 |

### 3.2 分析报告结构

```typescript
interface AnalysisResult {
  scores: {
    character_consistency: number;      // 1-10
    emotion_appropriateness: number;    // 1-10
    language_style_adherence: number;   // 1-10
    behavior_trigger_compliance: number;// 1-10
    memory_utilization: number;         // 1-10
  };
  analysis: string;      // 总体分析文本
  issues: string[];      // 发现的问题列表
  suggestions: string[]; // 改进建议列表
}
```

### 3.3 分析数据来源

分析基于 `conversation_logs` 表中的对话日志，提取最近 50 条：

```
[时间戳] emotion:happy | [情绪:happy|0.8] 你好！最近战斗怎么样？
[时间戳] emotion:angry | [情绪:angry|0.9] 别跟我提那次行动！
```

LLM 收到角色 4 模块设定 + 日志文本，输出 JSON 评分。

---

## 四、测试用例体系

### 4.1 用例分类

| 分类 | key | 覆盖场景 |
|------|-----|---------|
| 角色一致性 | `character_consistency` | 角色是否按人设响应，不出现身份矛盾 |
| 情绪 | `emotion` | 特定情境下情绪是否适当 |
| 行为触发 | `behavior_trigger` | 行为规则是否被触发执行 |
| 记忆 | `memory` | 是否利用了历史对话信息 |
| 自定义 | `custom` | 其他场景 |

### 4.2 用例结构

```typescript
interface TestCase {
  id: string;
  character_id: string;
  name: string;                    // 用例名称
  description: string | null;      // 测试目的
  input_message: string;           // 模拟玩家输入
  expected_emotion: string | null; // 期望情绪类型
  expected_behavior: string | null;// 期望行为描述
  expected_keywords: string | null;// JSON: 期望包含的关键词
  category: string;                // 分类 key
  is_auto_generated: number;       // 1=AI生成, 0=手动创建
}
```

### 4.3 生成策略

LLM 根据角色设定（4 模块）+ 对话日志（最近 30 条，可选）生成 5-10 个用例，覆盖 4 个分类。生成后持久化到 `test_cases` 表，用户可编辑。

### 4.4 自动测试执行流程

```
遍历该角色的所有测试用例:
  1. 创建临时对话
  2. 构建系统提示词（角色 4 模块 + 情绪输出格式）
  3. 发送 test_case.input_message → LLM
  4. 解析实际回复的情绪标签
  5. 将期望 vs 实际提交给 LLM 评估 → passed/score/analysis
  6. 保存测试记录到 test_runs
  7. 删除临时对话
输出: { total, passed, failed, results[] }
```

评估由 LLM 二次调用完成，输入期望条件 + 实际回复，输出：

```typescript
interface TestEvaluation {
  passed: boolean;   // 是否通过
  score: number;     // 0.0-1.0
  analysis: string;  // 评估说明
}
```

---

## 五、调用方式

### 5.1 分析角色对话质量

```
POST /api/web/test/analyze
Body: { "characterId": "角色ID" }
Response: AnalysisResult
```

**前置条件**：角色已有对话日志（`conversation_logs` 表有该角色的记录）。无日志时评分无意义。

### 5.2 生成测试用例

```
POST /api/web/test/generate-cases
Body: { "characterId": "角色ID" }
Response: TestCase[]
```

**注意**：生成是追加式的，多次调用会不断新增用例。如需重新生成，先删除旧用例。

### 5.3 执行测试

```
POST /api/web/test/run
Body: { "characterId": "角色ID" }
Response: { total, passed, failed, results[] }
```

**前置条件**：角色已有测试用例。每个用例会消耗 LLM API 调用（2 次：对话 + 评估）。

### 5.4 管理测试用例

```
GET    /api/web/test/cases?characterId=xxx   // 列表
PUT    /api/web/test/cases/:id               // 编辑
DELETE /api/web/test/cases/:id               // 删除
```

### 5.5 查看测试记录

```
GET /api/web/test/runs?characterId=xxx       // 按角色
GET /api/web/test/runs?testCaseId=xxx        // 按用例
```

---

## 六、分析流程 SOP

当用户要求分析角色时，按以下步骤执行：

```
Step 1: 确认角色有对话历史
  → GET /api/web/test/analyze 需要对话日志
  → 如果角色从未对话，提示"请先与该角色进行若干轮对话后再分析"

Step 2: 执行对话质量分析
  → POST /api/web/test/analyze { characterId }
  → 等待结果（可能需要 10-30 秒，取决于日志量和模型速度）

Step 3: 解读分析结果
  → 向用户展示 5 维度评分，高亮低分项（<7 分）
  → 列出具体问题（issues）
  → 给出改进建议（suggestions）

Step 4: 如用户要求深入测试
  → POST /api/web/test/generate-cases { characterId }
  → 等待生成完成
  → 可选: 让用户审阅/编辑测试用例
  → POST /api/web/test/run { characterId }
  → 展示测试结果：通过率、失败用例、评分

Step 5: 改进建议闭环
  → 根据分析和测试结果，给出角色设定的具体修改建议
  → 如: "行为规则模块缺少'被提及阵亡战友时'的触发规则，建议添加"
  → 如: "语言风格规则'省略号表犹豫'未被遵循，建议在规则中加强示例"
```

---

## 七、提示词模板

### 7.1 分析提示词

```
你是一位AI角色对话质量评估专家。请分析以下角色设定和对话日志，评估角色表现。

## 角色设定
身份：{identity}
场景：{scene_setting}
语言风格：{language_style}
行为规则：{behavior_rules}

## 对话日志
{logs}

请对以下5个维度打分（1-10），并给出具体分析和改进建议：
1. 角色一致性 2. 情绪适当性 3. 语言风格遵循度 4. 行为触发合规度 5. 记忆利用度

输出JSON: { scores: {...}, analysis, issues[], suggestions[] }
```

### 7.2 测试用例生成提示词

```
你是一位AI测试工程师，为游戏角色对话系统编写测试用例。

## 角色设定
身份：{identity}  场景：{scene_setting}  语言风格：{language_style}  行为规则：{behavior_rules}

## 对话日志参考（可选）
{logs}

请生成5-10个测试用例，覆盖 character_consistency / emotion / behavior_trigger / memory 四类。
输出JSON数组: [{ name, description, input_message, expected_emotion, expected_behavior, expected_keywords, category }]
```

### 7.3 测试评估提示词

```
请评估AI角色的回复是否符合预期。

## 测试输入: {input_message}
## 期望: 情绪={expected_emotion} 行为={expected_behavior} 关键词={expected_keywords}
## 实际回复: 情绪={actual_emotion} 内容={actualResponse}

输出JSON: { passed: bool, score: 0.0-1.0, analysis: string }
```

---

## 八、边界与限制

| 限制 | 说明 |
|------|------|
| 依赖对话日志 | 分析和生成用例都需要角色有历史对话，无日志时功能不可用 |
| LLM 调用成本 | 分析 = 1 次，生成用例 = 1 次，执行 N 个测试 = 2N 次 |
| JSON 解析容错 | LLM 输出可能包含 ```json``` 代码块包裹，需正则提取后再 parse；parse 失败时降级为默认评分 |
| 测试临时对话 | 自动测试创建临时对话，测试完成后删除，不污染角色对话列表 |
| 模型配置必须 | 所有 LLM 调用依赖默认 chat model 配置（`model_configs.is_default=1`），未配置时抛错 |
| 情绪格式硬编码 | 测试执行时的系统提示词直接拼接情绪输出格式规则，与 `prompt-builder` 不完全一致 |

---

## 九、代码位置索引

| 文件 | 职责 |
|------|------|
| `server/src/services/character-test.service.ts` | 分析/生成用例/执行测试的核心逻辑 |
| `server/src/services/prompt-builder.service.ts` | 分析/生成/评估的提示词模板 |
| `server/src/repositories/test.repo.ts` | test_cases + test_runs 的 CRUD |
| `server/src/routes/web/test.routes.ts` | API 路由定义 |
| `client/src/pages/TestPage.tsx` | 前端分析/用例/测试 UI |
| `server/src/db/migrations/001_initial.sql` | test_cases / test_runs 建表语句 |
