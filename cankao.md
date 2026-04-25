## 用户需求分析

用户针对「带你吃火锅工具箱」（CharaForge 画风分析工具）提出两个技术问题：

1. **模型类型检测机制**：项目如何判断当前模型是否支持图像分析（Vision），以及为什么 DeepSeek-V3.2 会触发「该模型不支持图像分析」的错误
2. **API 配置验证机制**：项目如何实现 API 连通性检测，并在 UI 上展示「✅ API已连通 | 当前生效模型: DeepSeek-V3.2」的验证结果

用户希望理解这两个功能的技术实现原理，而非要求修改代码。

## 技术架构分析

### 一、模型 Vision 能力检测机制：运行时试探性错误匹配（Runtime Trial-and-Error Detection）

**核心原理：不预设模型能力清单，而是通过实际请求的响应内容来反推**

项目采用的是**事后错误识别**策略，而非预先白名单过滤。具体实现位于 `vision-analyzer.ts` 第 136-211 行的 `analyzeWithOpenAI()` 函数：

**步骤 1：无条件发送多模态请求**

```typescript
// 第147-169行：无论什么模型，都发送包含 image_url 的请求体
const requestBody = {
  model,
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        { type: 'text', text: '请分析这张角色图的视觉制作工艺和画风体系。' }
      ]
    }
  ],
  temperature: 0.3,
  max_tokens: 2000,
};
```

**步骤 2：捕获响应并做关键词匹配**

```typescript
// 第180-189行：通过错误文本中的特征关键词组合判断
if (!response.ok) {
  const err = await response.text();
  if (err.includes('image_url') && err.includes('unknown variant')) {
    throw new Error('该模型不支持图像分析（Vision）。请切换到支持多模态的模型...');
  }
}
```

**关键设计决策说明：**

| 设计选择 | 原因 |
| --- | --- |
| 使用 `image_url` + `unknown variant` 双关键词匹配 | 避免误判其他类型的 API 错误；`unknown variant` 是 OpenAI 兼容协议中「不支持该消息类型」的标准错误标识 |
| 不做预检（pre-flight check） | 模型列表来自多个供应商（讯飞、DeepSeek、自定义中转站），维护能力元数据成本过高且难以实时更新 |
| DeepSeek-V3.2 触发此错误的根本原因 | 该模型的 `modelId` 为 `deepseek-chat`（见第404行 PROVIDER_MODELS），它是纯文本生成模型，其 API 网关在收到 `image_url` 类型的 content part 时返回 `unknown variant` 错误 |


**Provider 分支逻辑（第126-131行）：**

```typescript
if (config.provider === 'google') {
  return analyzeWithGoogle(...);  // Gemini 原生格式，天然支持图片
}
return analyzeWithOpenAI(...);     // OpenAI 兼容格式，统一处理 GPT/DeepSeek/讯飞/中转站
```

Google Gemini 走独立的 `analyzeWithGoogle()` 路径（第216-267行），使用 `inline_data` 格式传入图片，不存在 `image_url` 兼容性问题。

**可支持的模型对照表（来自 PROVIDER_MODELS 常量，第393-415行）：**

- OpenAI: GPT-5.4 系列 — 支持 Vision
- Google: Gemini 3.1 Flash / Gemini 3 Pro — 天然多模态
- DeepSeek: DeepSeek-V3.2 (`deepseek-chat`) — **纯文本，不支持 Vision**
- 讯飞: Qwen3.5-35B-A3B / Qwen3-VL-32B-Instruct 等 — 部分支持（VL 版本支持）
- 自定义: 取决于用户填写的模型 ID

---

### 二、API 配置验证机制：最小化探针请求（Minimal Probe Request）

**核心函数：`testConnection()` （第347-390行）**

该函数根据 Provider 类型走两条不同验证路径：

#### 路径 A：Google Gemini（第357-363行）

```typescript
// 使用 GET /models?key=apiKey 端点验证
const url = `${proxied}/models?key=${config.apiKey}`;
const res = await fetch(url);
if (!res.ok) throw new Error(`连接失败 (${res.status})`);
return true;
```

- 调用 Gemini API 的模型列表端点
- 仅验证 apiKey 是否有效，不发任何生成请求
- 不消耗 token 配额

#### 路径 B：OpenAI 兼容协议（第366-389行）

```typescript
// 发送最轻量的 POST 到 /chat/completions
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  },
  body: JSON.stringify({
    model: config.model,
    messages: [{ role: 'user', content: '你好，回复 OK 即可' }],
    max_tokens: 10,
  }),
});
```

- 发送**纯文本**单轮对话请求（不含图片）
- `max_tokens: 10` 最小化响应体积和 token 消耗
- 探针消息为 `'你好，回复 OK 即可'`，极短且语言无关

**HTTP 状态码语义化处理（analyzeWithOpenAI 第192-198行，分析时生效）：**

- `401` → 「API Key 无效，请检查是否正确填写（讯飞格式: APIKey:APISecret）」
- `403` → 「权限不足。请检查 API Key 是否有权限使用该模型」
- 其他 → 透传原始状态码和错误文本

**关键细节：测试连接 ≠ 测试 Vision 能力**

`testConnection()` 只发**文本请求**，所以即使 DeepSeek-V3.2 这种纯文本模型也能通过连接测试（返回 success），展示为「✅ API已连通」。但真正调用 `analyzeStyle()` 发送带图片的请求时才会触发 Vision 不支持的错误。

这是一个**有意的设计取舍**：

- 优点：连接测试轻量、快速、不依赖特定模型能力
- 缺点：用户可能误以为「连接成功=可以分析图片」，导致后续报错时的困惑

---

### 三、UI 状态机与持久化层

**测试按钮状态流转（main.ts 第537-561行）：**

```
初始态 [测试连接] 
  → click → testing 态 [测试中...] (添加 .testing class)
    → 成功 → success 态 [✓ 连接成功] (3秒后自动恢复)
    → 失败 → error 态 [✗ 连接失败] (3秒后自动恢复)
```

**配置持久化方案（main.ts 第567-594行）：**

- 按 Provider 隔离存储：`localStorage.setItem('charaforge_api_${provider}', ...)`
- 活跃 Provider 标记：`charaforge_active_provider`
- 切换 Provider 时自动加载对应的历史配置（第407-425行）

**当前生效模型显示逻辑（main.ts 第77-89行 `updateConnModelDisplay`）：**

- 从 `PROVIDER_MODELS` 中查找 model value 对应的 label
- 自定义模型则显示输入框中的名称或 fallback 为「未命名自定义模型」
- 仅在 `forceShow=true`（即测试成功回调）时才显示绿色指示器