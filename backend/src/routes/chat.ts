import { Router, Request, Response } from 'express';
import { ZodError } from 'zod';
import { createConversationSchema, sendMessageSchema, updateConversationSchema } from '../middleware/validateRequest.js';
import { chatCompletionStream, type ChatMessage } from '../services/chatService.js';
import { getRelevantMemories, maybeSummarizeConversation, deleteConversationMemories, generateConversationTitle } from '../services/memoryService.js';
import { isChromaAvailable } from '../services/chromaService.js';
import {
  getAllConversations,
  getConversationById,
  createConversation,
  updateConversation,
  deleteConversation,
  getMessagesByConversationId,
  createMessage,
} from '../database.js';
import type { APIConfig } from '../types/index.js';

const router = Router();

function formatConversation(c: any) {
  return {
    id: c.id,
    title: c.title,
    modelProvider: c.model_provider,
    modelName: c.model_name,
    systemPrompt: c.system_prompt,
    summary: c.summary,
    summaryUpdatedAt: c.summary_updated_at,
    messageCount: c.message_count,
    isArchived: c.is_archived === 1,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

function formatMessage(m: any) {
  return {
    id: m.id,
    conversationId: m.conversation_id,
    role: m.role,
    content: m.content,
    tokenUsage: m.token_usage,
    createdAt: m.created_at,
  };
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if ('status' in error) {
      const status = (error as any).status;
      if (status === 401) return 'API Key 无效或已过期';
      if (status === 429) return '请求频率超限，请稍后重试';
      if (status === 502) return '连接被拒绝，请检查 API 地址';
      if (status === 504) return '请求超时，请稍后重试';
    }
    return error.message;
  }
  return String(error);
}

function toAPIConfig(data: any): APIConfig {
  return {
    provider: data.provider,
    model: data.model,
    endpoint: data.endpoint || '',
    apiKey: data.apiKey,
    useProxy: data.useProxy || false,
    proxyEndpoint: data.proxyEndpoint || '',
  };
}

// 获取对话列表
router.get('/conversations', async (_req: Request, res: Response) => {
  try {
    const page = parseInt(_req.query.page as string) || 1;
    const pageSize = parseInt(_req.query.pageSize as string) || 20;
    const result = await getAllConversations(page, pageSize);
    res.json({
      success: true,
      data: {
        conversations: result.conversations.map(formatConversation),
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: extractErrorMessage(error) });
  }
});

// 创建对话
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const data = createConversationSchema.parse(req.body);
    const id = await createConversation({
      title: data.title,
      model_provider: data.modelProvider,
      model_name: data.modelName,
      system_prompt: data.systemPrompt,
    });
    const conversation = await getConversationById(id);
    res.json({ success: true, data: formatConversation(conversation) });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      res.status(500).json({ success: false, error: extractErrorMessage(error) });
    }
  }
});

// 获取对话详情（含消息）
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const conversation = await getConversationById(id);
    if (!conversation) {
      res.status(404).json({ success: false, error: '对话不存在' });
      return;
    }
    const messages = await getMessagesByConversationId(id);
    res.json({ success: true, data: { ...formatConversation(conversation), messages: messages.map(formatMessage) } });
  } catch (error) {
    res.status(500).json({ success: false, error: extractErrorMessage(error) });
  }
});

// 更新对话
router.put('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const data = updateConversationSchema.parse(req.body);
    await updateConversation(id, {
      title: data.title,
      system_prompt: data.systemPrompt,
    });
    const conversation = await getConversationById(id);
    res.json({ success: true, data: formatConversation(conversation) });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      res.status(500).json({ success: false, error: extractErrorMessage(error) });
    }
  }
});

// 删除对话
router.delete('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await deleteConversationMemories(id);
    await deleteConversation(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: extractErrorMessage(error) });
  }
});

// 发送消息（SSE 流式响应）
router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.id as string);
    const data = sendMessageSchema.parse(req.body);
    const config = toAPIConfig(data.config);

    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      res.status(404).json({ success: false, error: '对话不存在' });
      return;
    }

    // 保存用户消息
    await createMessage({
      conversation_id: conversationId,
      role: 'user',
      content: data.content,
    });

    // 加载历史消息
    const dbMessages = await getMessagesByConversationId(conversationId);
    const historyMessages: ChatMessage[] = dbMessages
      .slice(-50)
      .map(m => ({ role: m.role, content: m.content }));

    // 构建系统提示
    let systemPrompt = conversation.system_prompt || '你是一个有帮助的 AI 助手。';

    // 如果 ChromaDB 可用，检索相关记忆注入
    if (isChromaAvailable()) {
      const memoryContext = await getRelevantMemories(data.content, config, conversationId);
      if (memoryContext) {
        systemPrompt += '\n\n' + memoryContext;
      }
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
    ];

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 发送开始事件
    res.write(`event: message_start\ndata: ${JSON.stringify({ conversationId })}\n\n`);

    let fullContent = '';
    let totalTokenUsage = 0;

    try {
      const stream = chatCompletionStream(messages, config);

      for await (const chunk of stream) {
        if (chunk.delta) {
          fullContent += chunk.delta;
          res.write(`event: delta\ndata: ${JSON.stringify({ content: chunk.delta })}\n\n`);
        }
        if (chunk.usage) {
          totalTokenUsage = chunk.usage.totalTokens;
          res.write(`event: usage\ndata: ${JSON.stringify(chunk.usage)}\n\n`);
        }
      }

      // 保存助手消息
      const messageId = await createMessage({
        conversation_id: conversationId,
        role: 'assistant',
        content: fullContent,
        token_usage: totalTokenUsage,
      });

      res.write(`event: message_end\ndata: ${JSON.stringify({ messageId, tokenUsage: totalTokenUsage })}\n\n`);

      // 异步触发摘要（不阻塞响应）
      maybeSummarizeConversation(conversationId, config).catch(err => {
        console.warn('[ChatRoute] Background summarization failed:', err);
      });

      // 异步生成对话标题（仅首次对话时触发）
      generateConversationTitle(conversationId, config).catch(err => {
        console.warn('[ChatRoute] Title generation failed:', err);
      });

    } catch (streamError) {
      console.error('[ChatRoute] Stream error:', streamError);
      res.write(`event: error\ndata: ${JSON.stringify({ error: extractErrorMessage(streamError) })}\n\n`);
    }

    res.end();

  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors });
    } else {
      res.status(500).json({ success: false, error: extractErrorMessage(error) });
    }
  }
});

// 手动触发摘要
router.post('/conversations/:id/summarize', async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.id as string);
    const config = toAPIConfig(req.body.config);

    if (!req.body.config) {
      res.status(400).json({ success: false, error: '缺少 config 参数' });
      return;
    }

    await maybeSummarizeConversation(conversationId, config);
    const conversation = await getConversationById(conversationId);
    res.json({ success: true, data: { summary: conversation?.summary } });
  } catch (error) {
    res.status(500).json({ success: false, error: extractErrorMessage(error) });
  }
});

export default router;
