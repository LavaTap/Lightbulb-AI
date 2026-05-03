import type { APIConfig } from '../types/index.js';
import { chatCompletion, type ChatMessage } from './chatService.js';
import { isChromaAvailable, storeMemory, retrieveMemories, deleteConversationMemories } from './chromaService.js';
import { getConversationById, getMessagesByConversationId, updateConversation } from '../database.js';

const SUMMARY_THRESHOLD = 20;
const SUMMARY_STALE_MESSAGES = 10;

const SUMMARIZE_SYSTEM_PROMPT = `请对以下对话进行摘要，捕捉以下关键信息：
1. 讨论的主要话题
2. 用户的偏好和约束
3. 重要的决定或结论
4. 提到的具体实体、名称或技术细节
摘要应简洁但全面，仅返回摘要文本。`;

const FACT_EXTRACTION_PROMPT = `从以下对话中提取独立的、有用的关键事实，每行一条。每条事实应自包含，无需上下文即可理解。示例：
- 用户偏好暗色主题 UI
- 项目使用 React 18 + TypeScript
- 用户的名字是 Alice
仅返回事实列表，每行一条，不要编号。`;

export async function maybeSummarizeConversation(
  conversationId: number,
  config: APIConfig
): Promise<void> {
  if (!isChromaAvailable()) return;

  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation) return;

    const messageCount = conversation.message_count;
    if (messageCount < SUMMARY_THRESHOLD) return;

    // 检查摘要是否过时
    const lastSummaryCount = conversation.summary_updated_at
      ? await getMessagesSinceSummary(conversationId)
      : messageCount;

    if (lastSummaryCount < SUMMARY_STALE_MESSAGES) return;

    console.log(`[MemoryService] Summarizing conversation ${conversationId} (${messageCount} messages)`);

    const messages = await getMessagesByConversationId(conversationId);
    const recentMessages = messages.slice(-40); // 最近 40 条消息

    // 构建摘要上下文
    const contextMessages: ChatMessage[] = recentMessages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    let existingSummary = '';
    if (conversation.summary) {
      existingSummary = `之前的对话摘要：\n${conversation.summary}\n\n`;
    }

    // 生成摘要
    const summaryResult = await chatCompletion(
      [
        { role: 'system', content: SUMMARIZE_SYSTEM_PROMPT },
        { role: 'user', content: existingSummary + formatMessagesForSummary(contextMessages) },
      ],
      config,
      { maxTokens: 1000, temperature: 0.3 }
    );

    // 存储摘要到 SQLite
    await updateConversation(conversationId, {
      summary: summaryResult.content,
      summary_updated_at: new Date().toISOString(),
    });

    // 存储摘要到 ChromaDB
    await storeMemory({
      conversationId,
      content: summaryResult.content,
      type: 'summary',
      config,
    });

    // 提取关键事实
    await extractAndStoreFacts(conversationId, config, contextMessages);
  } catch (error) {
    console.warn('[MemoryService] Failed to summarize conversation:', (error as Error).message);
  }
}

export async function getRelevantMemories(
  userMessage: string,
  config: APIConfig,
  conversationId?: number
): Promise<string | null> {
  if (!isChromaAvailable()) return null;

  try {
    const memories = await retrieveMemories({
      query: userMessage,
      nResults: 5,
      conversationId,
      config,
    });

    // 过滤距离过大的结果（cosine distance < 1.5）
    const relevantMemories = memories.filter(m => m.distance < 1.5);
    if (relevantMemories.length === 0) return null;

    const memoryText = relevantMemories
      .map((m, i) => `${i + 1}. ${m.content}`)
      .join('\n');

    return `以下是之前对话中的相关记忆：\n${memoryText}\n\n请参考这些记忆来更好地理解和回答用户的问题，但不要直接提及"记忆"这个词。`;
  } catch (error) {
    console.warn('[MemoryService] Failed to retrieve memories:', (error as Error).message);
    return null;
  }
}

export async function extractAndStoreFacts(
  conversationId: number,
  config: APIConfig,
  messages?: ChatMessage[]
): Promise<void> {
  if (!isChromaAvailable()) return;

  try {
    if (!messages) {
      const dbMessages = await getMessagesByConversationId(conversationId);
      messages = dbMessages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));
    }

    if (messages.length === 0) return;

    const result = await chatCompletion(
      [
        { role: 'system', content: FACT_EXTRACTION_PROMPT },
        { role: 'user', content: formatMessagesForSummary(messages) },
      ],
      config,
      { maxTokens: 500, temperature: 0.2 }
    );

    const facts = result.content
      .split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 5);

    // 批量存储事实
    for (const fact of facts.slice(0, 10)) {
      await storeMemory({
        conversationId,
        content: fact,
        type: 'fact',
        config,
      });
    }

    console.log(`[MemoryService] Extracted ${facts.length} facts from conversation ${conversationId}`);
  } catch (error) {
    console.warn('[MemoryService] Failed to extract facts:', (error as Error).message);
  }
}

const TITLE_GENERATION_PROMPT = `根据以下对话内容，生成一个简洁的对话标题（不超过 20 个字），直接返回标题文本，不要加引号或多余内容。`;

export async function generateConversationTitle(
  conversationId: number,
  config: APIConfig
): Promise<string | null> {
  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation || conversation.title !== '新对话') return null;

    const messages = await getMessagesByConversationId(conversationId);
    const contextMessages = messages
      .filter(m => m.role !== 'system')
      .slice(0, 4)
      .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
      .join('\n');

    if (!contextMessages) return null;

    const result = await chatCompletion(
      [
        { role: 'system', content: TITLE_GENERATION_PROMPT },
        { role: 'user', content: contextMessages },
      ],
      config,
      { maxTokens: 50, temperature: 0.3 }
    );

    const title = result.content.trim().replace(/^["'「」]|["'」]$/g, '').slice(0, 50);
    if (title && title !== '新对话') {
      await updateConversation(conversationId, { title });
      console.log(`[MemoryService] Generated title for conversation ${conversationId}: "${title}"`);
      return title;
    }
    return null;
  } catch (error) {
    console.warn('[MemoryService] Failed to generate title:', (error as Error).message);
    return null;
  }
}

export { deleteConversationMemories };

function formatMessagesForSummary(messages: ChatMessage[]): string {
  return messages
    .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
    .join('\n');
}

async function getMessagesSinceSummary(conversationId: number): Promise<number> {
  const conversation = await getConversationById(conversationId);
  if (!conversation || !conversation.summary_updated_at) {
    return conversation?.message_count || 0;
  }

  const messages = await getMessagesByConversationId(conversationId);
  const summaryTime = new Date(conversation.summary_updated_at).getTime();
  const messagesSince = messages.filter(m => new Date(m.created_at).getTime() > summaryTime);
  return messagesSince.length;
}
