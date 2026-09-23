import { useState, useCallback, useRef } from 'react';
import { characterChatApi } from '@/services/api';
import { useApiConfig } from './useApiConfig';
import { modelConfigToApiConfig } from '@/lib/model-utils';
import type { GameCharacter, CharacterConversation, CharacterChatMessage, APIConfig } from '@/types/index';

interface ThinkingStatus {
  status: 'preparing' | 'thinking' | 'completed' | 'error';
  message: string;
}

export function useCharacterChat() {
  const [characters, setCharacters] = useState<GameCharacter[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<GameCharacter | null>(null);
  const [conversations, setConversations] = useState<CharacterConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<CharacterConversation | null>(null);
  const [messages, setMessages] = useState<CharacterChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState<ThinkingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { activeModelConfig, getConfigsByCategory } = useApiConfig();

  const getChatApiConfig = useCallback((): APIConfig | null => {
    // First try active model config
    if (activeModelConfig?.apiKey) {
      return modelConfigToApiConfig(activeModelConfig);
    }
    // Fallback: find a text model
    const textModels = getConfigsByCategory('text');
    const modelWithKey = textModels.find(m => m.apiKey);
    if (modelWithKey) return modelConfigToApiConfig(modelWithKey);
    // Last resort: any model with apiKey
    const visionModels = getConfigsByCategory('vision');
    const visionWithKey = visionModels.find(m => m.apiKey);
    if (visionWithKey) return modelConfigToApiConfig(visionWithKey);
    return null;
  }, [activeModelConfig, getConfigsByCategory]);

  const loadCharacters = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await characterChatApi.getCharacters();
      let chars = result.data || [];
      if (chars.length === 0) {
        const initResult = await characterChatApi.initPresets();
        chars = initResult.data || [];
      }
      setCharacters(chars);
      if (chars.length > 0 && !activeCharacter) {
        setActiveCharacter(chars[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeCharacter]);

  const loadConversations = useCallback(async (characterId: number) => {
    try {
      const result = await characterChatApi.getConversations(characterId);
      setConversations(result.data || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const createConversation = useCallback(async (characterId: number, title?: string) => {
    try {
      const result = await characterChatApi.createConversation(characterId, title);
      const newConv = result.data;
      setConversations(prev => [newConv, ...prev]);
      setActiveConversation(newConv);
      setMessages([]);
      return newConv;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  const selectConversation = useCallback(async (conv: CharacterConversation) => {
    try {
      const result = await characterChatApi.getConversation(conv.id);
      setActiveConversation(conv);
      setMessages(result.data?.messages || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const deleteConversation = useCallback(async (id: number) => {
    try {
      await characterChatApi.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [activeConversation]);

  const selectCharacter = useCallback(async (character: GameCharacter) => {
    setActiveCharacter(character);
    setActiveConversation(null);
    setMessages([]);
    await loadConversations(character.id);
  }, [loadConversations]);

  const sendMessage = useCallback(async (content: string) => {
    const config = getChatApiConfig();
    if (!config || !activeConversation || !activeCharacter) return;

    setIsStreaming(true);
    setThinkingStatus({ status: 'thinking', message: `${activeCharacter.name}思考中...` });
    setError(null);

    // Add user message locally
    const userMsg: CharacterChatMessage = {
      id: Date.now(),
      conversationId: activeConversation.id,
      characterId: activeCharacter.id,
      role: 'user',
      content,
      emotion: null,
      emotionIntensity: null,
      tokenUsage: 0,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Add assistant placeholder
    const assistantPlaceholder: CharacterChatMessage = {
      id: Date.now() + 1,
      conversationId: activeConversation.id,
      characterId: activeCharacter.id,
      role: 'assistant',
      content: '',
      emotion: null,
      emotionIntensity: null,
      tokenUsage: 0,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantPlaceholder]);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await characterChatApi.sendMessage(
        activeConversation.id, content, config, abortController.signal
      );

      if (!response.ok) throw new Error('Network error');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';
      let finalEmotion: string | null = null;
      let finalIntensity: number | null = null;

      setThinkingStatus(null);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: thinking')) {
            // Next data line will have thinking info
          } else if (line.startsWith('event: delta')) {
            // Next data line has content
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.status === 'thinking') {
                setThinkingStatus({ status: 'thinking', message: data.message || '思考中...' });
              } else if (data.content !== undefined) {
                setThinkingStatus(null);
                fullContent += data.content;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                  return updated;
                });
              } else if (data.emotion !== undefined) {
                finalEmotion = data.emotion;
                finalIntensity = data.emotionIntensity;
              } else if (data.messageId !== undefined) {
                // message_end
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    id: data.messageId,
                    content: fullContent,
                    emotion: finalEmotion,
                    emotionIntensity: finalIntensity,
                    tokenUsage: data.tokenUsage || 0,
                  };
                  return updated;
                });
              } else if (data.error) {
                setError(data.error);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User stopped streaming
      } else {
        setError(err.message);
      }
    } finally {
      setIsStreaming(false);
      setThinkingStatus(null);
      abortRef.current = null;
    }
  }, [getChatApiConfig, activeConversation, activeCharacter]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    characters,
    activeCharacter,
    conversations,
    activeConversation,
    messages,
    isStreaming,
    thinkingStatus,
    isLoading,
    error,
    loadCharacters,
    loadConversations,
    selectCharacter,
    createConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
    stopStreaming,
    clearError,
    getChatApiConfig,
  };
}
