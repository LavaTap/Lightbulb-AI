模型配置隔离 Bug 修复计划
                                                                                                                                                                                  
     Context
                                                                                                                                                                                  
     用户在任意功能页面（灵感提示、角色生图、三视图、海报、AI对话）切换 ModelDropdown 模型后，实际 API 调用仍使用 localStorage 中的旧 provider                                  
     配置，而非用户选择的模型。ModelDropdown 只是"视觉装饰"——切换模型后 config 完全没有传递到 API 调用。

     根因分析

     ┌───────────┬──────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────┐
     │   层级    │               代码               │                                           问题                                            │
     ├───────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
     │ 页面层    │ 各页面的 onModelChange 回调      │ 只更新了本地 useState<string>，从未更新 localStorage 或传给 hook                          │
     ├───────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
     │ Hook 层   │ useGeneration.ts 的 4 个函数     │ 每次调用都从 getCurrentProvider() + getConfig(provider) 读 localStorage，完全忽略页面选择 │
     ├───────────┼──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
     │ Chat Hook │ useChat.ts 的 getChatApiConfig() │ 直接取 getConfigsByCategory() 的第一个，不管 ModelDropdown 选了什么                       │
     └───────────┴──────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────┘

     数据流断链示意：
     用户选模型 → onModelChange → setSelectedModel(string) → 仅影响 UI 显示
                                                         ↓ (断链)
     API 调用 ← useGeneration ← getCurrentProvider() ← localStorage (从未被更新)

     ---
     修复方案

     核心思路：让 hook 函数接受外部传入的 APIConfig，页面层负责从 ModelDropdown 选择中构造并传递 config。 不改动 localStorage 逻辑（保留为 fallback），不改动后端。

     ---
     Step 1: 新建 frontend/src/lib/model-utils.ts

     提供 3 个共享工具函数，被所有页面使用：

     modelConfigToApiConfig(config: ModelConfig): APIConfig
       // ModelConfig → APIConfig 转换（当前在 useChat 和 useApiConfig 中各写了一遍）

     getPersistedModelId(feature: string): string | null
       // 读取 localStorage: `lightbulb_model_id_<feature>`

     setPersistedModelId(feature: string, id: string): void
       // 写入 localStorage: `lightbulb_model_id_<feature>`

     feature key: 'inspiration' | 'character' | 'threeview' | 'poster' | 'chat'

     ---
     Step 2: 修改 frontend/src/hooks/useGeneration.ts

     添加模块级 helper：
     function resolveConfig(overrideConfig?: APIConfig): APIConfig | null {
       if (overrideConfig) return overrideConfig;
       const provider = getCurrentProvider();
       return getConfig(provider);
     }

     修改 4 个函数签名（config 参数放最后，保持位置兼容）：

     ┌───────────────────┬─────────────────────────────────────────┬──────────────────────────────────────────────────┐
     │       函数        │                现有签名                 │                      新签名                      │
     ├───────────────────┼─────────────────────────────────────────┼──────────────────────────────────────────────────┤
     │ analyze           │ (imageBase64, category?)                │ (imageBase64, category?, config?)                │
     ├───────────────────┼─────────────────────────────────────────┼──────────────────────────────────────────────────┤
     │ generate          │ (prompt, size?)                         │ (prompt, size?, config?)                         │
     ├───────────────────┼─────────────────────────────────────────┼──────────────────────────────────────────────────┤
     │ generateThreeView │ (refImage, analysisPrompt, userPrompt?) │ (refImage, analysisPrompt, userPrompt?, config?) │
     ├───────────────────┼─────────────────────────────────────────┼──────────────────────────────────────────────────┤
     │ generatePoster    │ (images, prompt, size?)                 │ (images, prompt, size?, config?)                 │
     └───────────────────┴─────────────────────────────────────────┴──────────────────────────────────────────────────┘

     每个函数内部：将 getCurrentProvider() + getConfig(provider) 替换为 resolveConfig(overrideConfig)。

     额外修复：analyze 函数第 56-57 行硬编码 modelProvider: 'qwen-vl-plus' → 改为 config.provider / config.model。

     ---
     Step 3: 修改 frontend/src/hooks/useChat.ts

     sendMessage 添加可选参数：
     sendMessage(content: string, overrideConfig?: APIConfig)

     内部：const config = overrideConfig || getChatApiConfig();

     ---
     Step 4: 修改 5 个页面组件

     统一模式（每个页面执行相同改造）：

     1. 导入 useApiConfig（获取 modelConfigs、getConfigsByCategory）
     2. 导入 modelConfigToApiConfig、getPersistedModelId、setPersistedModelId
     3. 将 selectedModel: string state → selectedModelConfig: ModelConfig | null state
     4. 添加 useEffect 初始化：从 localStorage 恢复上次选择，或取该 category 第一个可用配置
     5. 派生 selectedApiConfig = selectedModelConfig ? modelConfigToApiConfig(selectedModelConfig) : null
     6. onModelChange 回调：setSelectedModelConfig(config) + setPersistedModelId(feature, config.id.toString())
     7. API 调用时传入 selectedApiConfig || undefined

     各页面差异：

     ┌──────────────────┬─────────────┬──────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────┐
     │       页面       │ feature key │             category             │                                          API 调用                                           │
     ├──────────────────┼─────────────┼──────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┤
     │ InspirationPage  │ inspiration │ ['vision', 'multimodal']         │ analyze(img, category, selectedApiConfig)                                                   │
     ├──────────────────┼─────────────┼──────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┤
     │ CharacterGenPage │ character   │ ['text-to-image', 'multimodal']  │ generate(prompt, undefined, selectedApiConfig)                                              │
     ├──────────────────┼─────────────┼──────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┤
     │ ThreeViewPage    │ threeview   │ ['multimodal']                   │ generateThreeView(ref, analysis, user, selectedApiConfig)                                   │
     ├──────────────────┼─────────────┼──────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┤
     │ PosterGenPage    │ poster      │ ['multimodal']                   │ generatePoster(imgs, prompt, size, selectedApiConfig)                                       │
     ├──────────────────┼─────────────┼──────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────┤
     │ ChatPage         │ chat        │ ['text', 'multimodal', 'vision'] │ sendMessage(content, selectedApiConfig) + createConversation(config.provider, config.model) │
     └──────────────────┴─────────────┴──────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────┘

     ---
     修改文件清单

     ┌─────────────────────────────────────────┬──────┬────────────────────────────────────────────────┐
     │                  文件                   │ 操作 │                      说明                      │
     ├─────────────────────────────────────────┼──────┼────────────────────────────────────────────────┤
     │ frontend/src/lib/model-utils.ts         │ 新建 │ 3 个共享工具函数                               │
     ├─────────────────────────────────────────┼──────┼────────────────────────────────────────────────┤
     │ frontend/src/hooks/useGeneration.ts     │ 修改 │ 4 个函数加 config? 参数 + resolveConfig helper │
     ├─────────────────────────────────────────┼──────┼────────────────────────────────────────────────┤
     │ frontend/src/hooks/useChat.ts           │ 修改 │ sendMessage 加 config? 参数                    │
     ├─────────────────────────────────────────┼──────┼────────────────────────────────────────────────┤
     │ frontend/src/pages/InspirationPage.tsx  │ 修改 │ ModelConfig state + 持久化 + 传 config         │
     ├─────────────────────────────────────────┼──────┼────────────────────────────────────────────────┤
     │ frontend/src/pages/CharacterGenPage.tsx │ 修改 │ 同上                                           │
     ├─────────────────────────────────────────┼──────┼────────────────────────────────────────────────┤
     │ frontend/src/pages/ThreeViewPage.tsx    │ 修改 │ 同上                                           │
     ├─────────────────────────────────────────┼──────┼────────────────────────────────────────────────┤
     │ frontend/src/pages/PosterGenPage.tsx    │ 修改 │ 同上                                           │
     ├─────────────────────────────────────────┼──────┼────────────────────────────────────────────────┤
     │ frontend/src/pages/ChatPage.tsx         │ 修改 │ 同上 + createConversation 使用选中模型         │
     └─────────────────────────────────────────┴──────┴────────────────────────────────────────────────┘

     不需要修改的文件：storage.ts、api.ts、ModelDropdown.tsx、后端代码、types

     ---
     验证方案

     1. 在灵感提示页选 DeepSeek 模型 → 执行分析 → 后端日志确认收到 DeepSeek 的 config
     2. 切换到角色生图页选 OpenAI 模型 → 生图 → 后端日志确认收到 OpenAI 的 config
     3. 切回灵感提示页 → 确认仍显示 DeepSeek（页面隔离持久化）
     4. 在 ChatPage 选 GPT-4o → 发消息 → 后端日志确认 model 为 gpt-4o
     5. 刷新页面 → 各页面恢复上次选择的模型（localStorage 持久化）
     6. 删除某模型配置 → 对应页面 fallback 到第一个可用配置
     7. 无可用模型时 → fallback 到 localStorage 旧逻辑 → 显示错误提示