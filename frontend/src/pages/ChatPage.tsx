import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Trash2, Send, Square, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModelDropdown } from '@/components/ModelDropdown';
import { useChat } from '@/hooks/useChat';
import { useApiConfig } from '@/hooks/useApiConfig';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType, ModelConfig } from '@/types/index';

export function ChatPage() {
  const {
    conversations,
    activeConversation,
    messages,
    isStreaming,
    error,
    loadConversations,
    createConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
    stopStreaming,
    clearError,
  } = useChat();

  const { getConfigsByCategory } = useApiConfig();
  const [inputValue, setInputValue] = useState('');
  const [selectedTextModel, setSelectedTextModel] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateConversation = async () => {
    const textConfigs = getConfigsByCategory(['text', 'multimodal', 'vision']);
    const modelConfig = textConfigs[0];
    if (!modelConfig) {
      alert('请先在模型管理中配置文本模型');
      return;
    }

    const id = await createConversation(
      modelConfig.provider,
      selectedTextModel || modelConfig.model,
    );
    await selectConversation(id);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return;
    const content = inputValue.trim();
    setInputValue('');

    if (!activeConversation) {
      await handleCreateConversation();
    }

    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('确定删除此对话？此操作不可撤销。')) {
      await deleteConversation(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-3xl font-bold gradient-text mb-2">AI 对话</h1>
        <p className="text-muted-foreground">与 AI 进行智能对话，支持长期记忆</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-200px)]">
        {/* 左侧：对话列表 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3"
        >
          <Card className="h-full flex flex-col">
            <CardContent className="p-3 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  对话列表
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCreateConversation}
                  className="h-7 gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  新对话
                </Button>
              </div>

              {/* 模型选择 */}
              <div className="mb-3">
                <ModelDropdown
                  category={['text', 'multimodal', 'vision']}
                  selectedModel={selectedTextModel}
                  onModelChange={(_modelId: string, _config: ModelConfig) => setSelectedTextModel(_config.model)}
                />
              </div>

              {/* 对话列表 */}
              <div className="flex-1 overflow-y-auto space-y-1">
                {conversations.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    暂无对话
                  </div>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      className={cn(
                        'group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-sm',
                        activeConversation?.id === conv.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{conv.title}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 右侧：消息区域 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-9"
        >
          <Card className="h-full flex flex-col">
            {activeConversation ? (
              <>
                {/* 消息头部 */}
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <h2 className="font-medium truncate">{activeConversation.title}</h2>
                  <span className="text-xs text-muted-foreground">
                    {activeConversation.modelName}
                  </span>
                </div>

                {/* 消息列表 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <AnimatePresence>
                    {messages.map((msg, index) => (
                      <MessageBubble key={`${msg.id}-${index}`} message={msg} />
                    ))}
                  </AnimatePresence>

                  {/* 流式输出时的光标 */}
                  {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <Button variant="ghost" size="sm" onClick={clearError} className="h-6 text-xs">
                      关闭
                    </Button>
                  </div>
                )}

                {/* 输入区域 */}
                <div className="p-4 border-t">
                  <div className="flex gap-2 items-end">
                    <Textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
                      className="min-h-[40px] max-h-[200px] resize-none"
                      rows={1}
                      disabled={isStreaming}
                    />
                    {isStreaming ? (
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={stopStreaming}
                        className="shrink-0"
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim()}
                        className="shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* 空状态 */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <h3 className="text-lg font-medium mb-2">开始新对话</h3>
                  <p className="text-sm mb-4">点击"新对话"或直接输入消息开始</p>
                  <Button onClick={handleCreateConversation} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    创建新对话
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="text-center text-xs text-muted-foreground py-2">
        {message.content}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'bg-primary text-primary-foreground rounded-tr-sm'
          : 'bg-muted rounded-tl-sm'
      )}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {message.content || (
              <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
