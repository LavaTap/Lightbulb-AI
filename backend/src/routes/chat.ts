import { Router, Request, Response } from 'express';
import { ZodError } from 'zod';
import { createConversationSchema, sendMessageSchema, updateConversationSchema } from '../middleware/validateRequest.js';
import { chatCompletionStream, type ChatMessage, type MultimodalContent } from '../services/chatService.js';
import { getRelevantMemories, maybeSummarizeConversation, deleteConversationMemories, generateConversationTitle } from '../services/memoryService.js';
import { isLanceAvailable } from '../services/lanceService.js';
import { parseFileContent } from '../services/fileParser.js';
import { enrichMessageWithUrls } from '../services/webFetcher.js';
import {
  getAllConversations,
  getConversationById,
  createConversation,
  updateConversation,
  deleteConversation,
  getMessagesByConversationId,
  createMessage,
  deleteMessageById,
} from '../database.js';
import type { APIConfig } from '../types/index.js';

const router = Router();

function formatConversation(c: any) {
  if (!c) return null;
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
  const result: any = {
    id: m.id,
    conversationId: m.conversation_id,
    role: m.role,
    content: m.content,
    tokenUsage: m.token_usage,
    createdAt: m.created_at,
  };
  // 解析 attachments JSON
  if (m.attachments) {
    try {
      result.attachments = JSON.parse(m.attachments);
    } catch {
      result.attachments = null;
    }
  }
  return result;
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

/** 判断模型是否支持图片视觉理解能力 */
function modelSupportsVision(provider: string, model: string): boolean {
  // 已知支持视觉的模型模式列表
  const visionModelPatterns: { provider: string; pattern: RegExp }[] = [
    // OpenAI
    { provider: 'openai', pattern: /^gpt-4o/ },
    { provider: 'openai', pattern: /^gpt-4\.1/ },
    { provider: 'openai', pattern: /^gpt-4-turbo/ },
    // 阿里云
    { provider: 'aliyun', pattern: /^qwen-vl/ },
    // Google
    { provider: 'google', pattern: /^gemini/ },
    // 深度求索
    { provider: 'deepseek', pattern: /^janus/ },
    // 字节跳动
    { provider: 'bytedance', pattern: /vision/i },
    // 百度
    { provider: 'baidu', pattern: /vision/i },
    // 讯飞
    { provider: 'xfyun', pattern: /vision/i },
  ];
  return visionModelPatterns.some(vm => vm.provider === provider && vm.pattern.test(model));
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
    const attachmentsJson = data.attachments ? JSON.stringify(data.attachments) : undefined;
    // 估算用户消息 token 用量：按 1 token ≈ 4 个字符估算
    const estimatedUserTokens = Math.ceil(data.content.length / 4);
    const userMessageId = await createMessage({
      conversation_id: conversationId,
      role: 'user',
      content: data.content,
      token_usage: estimatedUserTokens,
      attachments: attachmentsJson,
    });

    // 加载历史消息（异步解析文件附件）
    const dbMessages = await getMessagesByConversationId(conversationId);
    const recentMessages = dbMessages.slice(-50);
    const historyMessages: ChatMessage[] = await Promise.all(
      recentMessages.map(async (m) => {
        let content: string | MultimodalContent[] = m.content;
        if (m.attachments) {
          try {
            const attachments = JSON.parse(m.attachments);
            if (Array.isArray(attachments) && attachments.length > 0) {
              const multimodalContent: MultimodalContent[] = [];
              let fileTextContent = '';

              for (const att of attachments) {
                if (att.type === 'image' && att.dataBase64) {
                  multimodalContent.push({
                    type: 'image_url',
                    image_url: { url: `data:${att.mimeType};base64,${att.dataBase64}` },
                  });
                } else if (att.type === 'file' && att.dataBase64) {
                  const buffer = Buffer.from(att.dataBase64, 'base64');
                  const result = await parseFileContent(buffer, att.fileName || '', att.mimeType);
                  if (result.success && result.text) {
                    fileTextContent += `\n--- 附件: ${att.fileName} ---\n${result.text}\n--- 附件结束 ---\n`;
                  } else {
                    fileTextContent += `\n[附件: ${att.fileName} (${result.error || '无法解析'})]\n`;
                  }
                }
              }

              if (multimodalContent.length > 0) {
                multimodalContent.push({
                  type: 'text',
                  text: m.content + (fileTextContent || ''),
                });
                content = multimodalContent;
              } else if (fileTextContent) {
                content = m.content + fileTextContent;
              }
            }
          } catch {
            // 解析失败，保持纯文本
          }
        }
        return { role: m.role, content };
      })
    );

    // 自动抓取消息中的 URL 网页内容，注入 AI 上下文
    const lastUserMsg = [...historyMessages].reverse().find(m => m.role === 'user');
    if (lastUserMsg && typeof lastUserMsg.content === 'string') {
      try {
        const { enrichedContent } = await enrichMessageWithUrls(lastUserMsg.content);
        if (enrichedContent !== lastUserMsg.content) {
          lastUserMsg.content = enrichedContent;
        }
      } catch (err) {
        console.warn('[ChatRoute] URL enrichment failed:', err);
      }
    }

    // 构建系统提示
    let systemPrompt = conversation.system_prompt || '你是一个有帮助的 AI 助手。';

    // 如果 LanceDB 可用，检索相关记忆注入（跨对话检索，不限定当前对话）
    if (isLanceAvailable()) {
      const memoryContext = await getRelevantMemories(data.content, config);
      if (memoryContext) {
        systemPrompt += '\n\n' + memoryContext;
      }
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
    ];

    // 预拦截检查：非视觉模型收到图片时，在调用 API 前拦截
    const hasImageContent = messages.some(m => Array.isArray(m.content) && m.content.some(c => c.type === 'image_url'));
    if (hasImageContent && !modelSupportsVision(config.provider, config.model)) {
      console.warn(`[ChatRoute] Model ${config.model} does not support vision but received image content. Intercepting.`);
      await deleteMessageById(userMessageId);
      // 设置 SSE 响应头并发送错误事件
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.write(`event: error\ndata: ${JSON.stringify({
        error: `当前选择的模型（${config.model}）不支持图片分析，已为您删除该消息。请切换到支持多模态的模型（如 GPT-4o、Gemini、Qwen-VL 等）。`,
        type: 'multimodal_not_supported',
      })}\n\n`);
      res.end();
      return;
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 发送思考状态事件（AI 正在准备请求）
    res.write(`event: thinking\ndata: ${JSON.stringify({ status: 'preparing', message: '正在准备请求...' })}\n\n`);

    // 发送开始事件
    res.write(`event: message_start\ndata: ${JSON.stringify({ conversationId })}\n\n`);

    let fullContent = '';
    let totalTokenUsage = 0;

    try {
      // 创建 abort 控制器以处理客户端中断请求
      const abortController = new AbortController();
      req.on('abort', () => {
        console.log('[ChatRoute] Client aborted the request');
        abortController.abort();
      });

      // 发送准备完成事件（AI 正在思考）
      res.write(`event: thinking\ndata: ${JSON.stringify({ status: 'thinking', message: 'AI 正在思考...' })}\n\n`);

      const stream = chatCompletionStream(messages, config, { signal: abortController.signal });

      for await (const chunk of stream) {
        // 检查请求是否已中止
        if (res.headersSent && res.writableEnded) {
          break;
        }

        if (chunk.delta) {
          fullContent += chunk.delta;
          res.write(`event: delta\ndata: ${JSON.stringify({ content: chunk.delta })}\n\n`);
        }
        if (chunk.usage) {
          totalTokenUsage = chunk.usage.totalTokens;
          res.write(`event: usage\ndata: ${JSON.stringify(chunk.usage)}\n\n`);
        }
      }

      // 发送生成完成事件
      res.write(`event: thinking\ndata: ${JSON.stringify({ status: 'completed', message: '生成完成' })}\n\n`);

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

      // 发送错误状态事件
      res.write(`event: thinking\ndata: ${JSON.stringify({ status: 'error', message: extractErrorMessage(streamError) })}\n\n`);

      // 检测是否为模型不支持多模态内容（图片/视频）的错误
      const errMsg = extractErrorMessage(streamError);
      const status = (streamError as any)?.status;
      const errorCode = (streamError as any)?.code || (streamError as any)?.error?.code;
      const isMultimodalError = (
        status === 400 &&
        (errMsg.includes('image_url') || errMsg.includes('multimodal') || errMsg.includes('image input') || errMsg.includes('vision'))
      );

      // 检测是否为内容审核拦截（阿里云 data_inspection_failed / inappropriate content）
      const isContentModerationError = (
        errorCode === 'data_inspection_failed' ||
        errMsg.includes('inappropriate content') ||
        errMsg.includes('data_inspection_failed')
      );

      // 检测是否为纯图片/非对话模型（如图像生成模型被误用于聊天）
      const isModelMismatchError = (
        status === 404 || status === 400
      );

      if (isContentModerationError) {
        // 内容审核拦截：图片内容违规，删除用户消息
        await deleteMessageById(userMessageId).catch(err => {
          console.warn('[ChatRoute] Failed to delete user message:', err);
        });
        const friendlyMsg = '发送的图片内容未通过内容安全审核，图片已被拦截。请尝试更换图片或使用不同的提示内容。已为您删除该消息。';
        res.write(`event: error\ndata: ${JSON.stringify({ error: friendlyMsg, type: 'inappropriate_content' })}\n\n`);
      } else if (isMultimodalError) {
        // 发送警告事件告知前端当前模型不支持图片
        const warningMsg = '当前模型不支持读取图片内容，已移除图片附件，仅发送文字继续对话。';
        res.write(`event: warning\ndata: ${JSON.stringify({ warning: warningMsg, type: 'multimodal_not_supported' })}\n\n`);

        // 剥离所有历史消息中的附件，仅保留文本重试
        const textOnlyMessages: ChatMessage[] = messages.map(m => ({
          ...m,
          content: typeof m.content === 'string' ? m.content : m.content.filter(c => c.type === 'text').map(c => c.text).join(' ') || '',
        }));

        try {
          const retryStream = chatCompletionStream(textOnlyMessages, config, { signal: abortController.signal });

          // 发送重试准备事件
          res.write(`event: thinking\ndata: ${JSON.stringify({ status: 'retrying', message: '重试请求...' })}\n\n`);

          for await (const chunk of retryStream) {
            // 检查请求是否已中止
            if (res.headersSent && res.writableEnded) {
              break;
            }

            if (chunk.delta) {
              fullContent += chunk.delta;
              res.write(`event: delta\ndata: ${JSON.stringify({ content: chunk.delta })}\n\n`);
            }
            if (chunk.usage) {
              totalTokenUsage = chunk.usage.totalTokens;
              res.write(`event: usage\ndata: ${JSON.stringify(chunk.usage)}\n\n`);
            }
          }

          // 发送重试完成事件
          res.write(`event: thinking\ndata: ${JSON.stringify({ status: 'completed', message: '生成完成' })}\n\n`);

          const messageId = await createMessage({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullContent,
            token_usage: totalTokenUsage,
          });

          res.write(`event: message_end\ndata: ${JSON.stringify({ messageId, tokenUsage: totalTokenUsage })}\n\n`);

          maybeSummarizeConversation(conversationId, config).catch(err => {
            console.warn('[ChatRoute] Background summarization failed:', err);
          });

          generateConversationTitle(conversationId, config).catch(err => {
            console.warn('[ChatRoute] Title generation failed:', err);
          });
        } catch (retryError) {
          console.error('[ChatRoute] Retry stream error:', retryError);
          res.write(`event: error\ndata: ${JSON.stringify({ error: extractErrorMessage(retryError) })}\n\n`);
        }
      } else if (isModelMismatchError && errMsg.includes('page not found')) {
        // 纯图片/图像生成模型被用于对话（如 hy-image-v3.0）
        const warningMsg = `当前选择的模型（${config.model}）是图像生成模型，不支持文字对话，请切换到文本模型。`;
        res.write(`event: error\ndata: ${JSON.stringify({ error: warningMsg })}\n\n`);
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({ error: errMsg })}\n\n`);
      }
    }

    res.end();

  } catch (error) {
    console.error('[ChatRoute] Unhandled error:', error);
    // 发送最终错误事件
    try {
      if (res.headersSent && !res.writableEnded) {
        res.write(`event: thinking\ndata: ${JSON.stringify({ status: 'error', message: extractErrorMessage(error) })}\n\n`);
        res.write(`event: error\ndata: ${JSON.stringify({ error: extractErrorMessage(error) })}\n\n`);
      }
    } catch (e) {
      // 忽略响应已关闭的错误
    }
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
