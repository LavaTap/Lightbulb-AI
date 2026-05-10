import { useState, useCallback, useRef } from 'react';
import { chatApi } from '@/services/api';
import { useApiConfig } from './useApiConfig';
import type { Conversation, ChatMessage, MessageAttachment, APIConfig } from '@/types/index';

export interface ThinkingStatus {
  status: 'preparing' | 'thinking' | 'retrying' | 'completed' | 'error';
  message: string;
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState<ThinkingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const { getConfigsByCategory } = useApiConfig();

  const getChatApiConfig = useCallback((modelName?: string): APIConfig | null => {
    const textConfigs = getConfigsByCategory('text');
    if (textConfigs.length === 0) return null;
    // 优先使用指定模型，否则取第一个
    const config = modelName
      ? textConfigs.find(c => c.model === modelName) || textConfigs[0]
      : textConfigs[0];
    return {
      provider: config.provider as APIConfig['provider'],
      model: config.model,
      endpoint: config.endpoint || '',
      apiKey: config.apiKey || '',
      useProxy: config.useProxy,
      proxyEndpoint: config.proxyEndpoint || '',
    };
  }, [getConfigsByCategory]);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await chatApi.getConversations();
      setConversations(result.data.conversations);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (modelProvider: string, modelName: string, systemPrompt?: string): Promise<number> => {
    try {
      const conversation = await chatApi.createConversation({
        modelProvider,
        modelName,
        systemPrompt,
      });
      await loadConversations();
      return conversation.id;
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, [loadConversations]);

  const selectConversation = useCallback(async (id: number) => {
    setIsLoading(true);
    try {
      const result = await chatApi.getConversation(id);
      const conv = result.data;
      setActiveConversation({
        id: conv.id,
        title: conv.title,
        modelProvider: conv.modelProvider,
        modelName: conv.modelName,
        systemPrompt: conv.systemPrompt,
        summary: conv.summary,
        messageCount: conv.messageCount,
        isArchived: conv.isArchived,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      });
      setMessages(conv.messages || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteConversation = useCallback(async (id: number) => {
    try {
      await chatApi.deleteConversation(id);
      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setMessages([]);
      }
      await loadConversations();
    } catch (e: any) {
      setError(e.message);
    }
  }, [activeConversation, loadConversations]);

  const sendMessage = useCallback(async (content: string, attachments?: MessageAttachment[], overrideConfig?: APIConfig) => {
    if (!activeConversation) return;

    const config = overrideConfig || getChatApiConfig();
    if (!config) {
      setError('请先配置文本模型 API Key');
      return;
    }

    setIsStreaming(true);
    setError(null);

    const abortController = new AbortController();
    abortRef.current = abortController;

    // 立即添加用户消息
    const userMessage: ChatMessage = {
      id: -1,
      conversationId: activeConversation.id,
      role: 'user',
      content,
      attachments,
      tokenUsage: 0,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // 添加助手消息占位符
    const assistantPlaceholder: ChatMessage = {
      id: -2,
      conversationId: activeConversation.id,
      role: 'assistant',
      content: '',
      tokenUsage: 0,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantPlaceholder]);

    try {
      const response = await chatApi.sendMessage(activeConversation.id, content, config, attachments, abortController.signal);

      if (!response.ok || !response.body) throw new Error('Stream failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let tokenUsage = 0;
      let multimodalWarningShown = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          const lines = block.split('\n');
          let eventType = '';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7);
            else if (line.startsWith('data: ')) dataStr = line.slice(6);
          }

          if (!eventType || !dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (eventType === 'thinking') {
              // 更新思考状态
              setThinkingStatus({
                status: data.status || 'thinking',
                message: data.message || 'AI 正在思考...'
              });
            } else if (eventType === 'warning' && data.type === 'multimodal_not_supported') {
              multimodalWarningShown = true;
              // 更新用户消息，移除附件
              setMessages(prev => {
                const updated = [...prev];
                const userIdx = updated.length - 2;
                if (userIdx >= 0) {
                  updated[userIdx] = {
                    ...updated[userIdx],
                    attachments: undefined,
                  };
                }
                return updated;
              });
              // 显示警告
              setError(data.warning || '当前模型不支持读取图片内容');
            } else if (eventType === 'delta' && data.content) {
              fullContent += data.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: fullContent,
                };
                return updated;
              });
            } else if (eventType === 'usage') {
              tokenUsage = data.totalTokens || 0;
            } else if (eventType === 'message_end') {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  id: data.messageId,
                  tokenUsage: data.tokenUsage || tokenUsage,
                };
                return updated;
              });
            } else if (eventType === 'error') {
              setError(data.error || '未知错误');
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message);
      }
    } finally {
      setIsStreaming(false);
      // 清空思考状态
      setThinkingStatus(null);
      abortRef.current = null;
      // 延迟刷新对话信息，等待后端 AI 生成新标题
      if (activeConversation) {
        setTimeout(async () => {
          try {
            const result = await chatApi.getConversation(activeConversation.id);
            const updated = result.data;
            setActiveConversation(prev => prev ? { ...prev, title: updated.title } : null);
            setConversations(prev => prev.map(c =>
              c.id === updated.id ? { ...c, title: updated.title } : c
            ));
          } catch {
            // 静默忽略
          }
        }, 1500);
      }
    }
  }, [activeConversation, getChatApiConfig]);

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    conversations,
    activeConversation,
    messages,
    isStreaming,
    thinkingStatus,
    isLoading,
    error,
    loadConversations,
    createConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
    stopStreaming,
    clearError,
    setActiveConversation,
  };
}
