import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Plus, Trash2, Send, Square, Bot, User, ArrowDown, PanelLeftClose, PanelLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModelDropdown } from '@/components/ModelDropdown';
import { SvgRenderer } from '@/components/SvgRenderer';
import { useChat } from '@/hooks/useChat';
import { useApiConfig } from '@/hooks/useApiConfig';
import { modelConfigToApiConfig, getPersistedModelId, setPersistedModelId } from '@/lib/model-utils';
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

  const { modelConfigs, getConfigsByCategory } = useApiConfig();
  const [inputValue, setInputValue] = useState('');
  const [selectedTextModel, setSelectedTextModel] = useState<string>('');
  const [selectedModelConfig, setSelectedModelConfig] = useState<ModelConfig | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isNearBottomRef = useRef(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 自动初始化选中的模型
  useEffect(() => {
    if (initRef.current || modelConfigs.length === 0) return;
    const textConfigs = getConfigsByCategory('text');
    if (textConfigs.length === 0) return;
    initRef.current = true;
    const persistedId = getPersistedModelId('chat');
    const match = persistedId ? textConfigs.find(c => c.id.toString() === persistedId) : null;
    const config = match || textConfigs[0];
    setSelectedTextModel(config.model);
    setSelectedModelConfig(config);
  }, [modelConfigs, getConfigsByCategory]);

  // 自动滚动到底部（仅在用户处于底部附近时）
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 监听消息容器滚动，控制下拉按钮显隐
  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 100;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isNearBottomRef.current = nearBottom;
    setShowScrollButton(!nearBottom && el.scrollHeight > el.clientHeight + 200);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCreateConversation = async () => {
    const textConfigs = getConfigsByCategory('text');
    const modelConfig = selectedModelConfig || textConfigs[0];
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

    const config = selectedModelConfig ? modelConfigToApiConfig(selectedModelConfig) : undefined;
    await sendMessage(content, config);
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

      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-200px)]">
        {/* 左侧：对话列表 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{
            opacity: sidebarCollapsed ? 0 : 1,
            x: sidebarCollapsed ? -40 : 0,
            width: sidebarCollapsed ? 0 : 'auto',
          }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className={cn(
            sidebarCollapsed ? 'overflow-hidden invisible lg:col-span-0' : 'lg:col-span-3'
          )}
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
                  category={['text']}
                  selectedModel={selectedTextModel}
                  onModelChange={(_modelId: string, _config: ModelConfig) => {
                    setSelectedTextModel(_config.model);
                    setSelectedModelConfig(_config);
                    setPersistedModelId('chat', _config.id.toString());
                  }}
                />
              </div>

              {/* 对话列表 */}
              <div className="flex-1 overflow-y-auto space-y-1 chat-scrollbar">
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

        {/* 收纳切换按钮 */}
        <motion.button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 h-12 rounded-r-lg flex items-center justify-center transition-colors',
            'bg-white dark:bg-gray-800 border border-l-0 border-gray-200 dark:border-gray-700 shadow-sm',
            'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary'
          )}
          title={sidebarCollapsed ? '展开对话列表' : '收起对话列表'}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </motion.button>

        {/* 右侧：消息区域 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className={cn(
            sidebarCollapsed ? 'lg:col-span-12' : 'lg:col-span-9'
          )}
        >
          <Card className="h-full flex flex-col">
            {activeConversation ? (
              <>
                {/* 消息头部 */}
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <h2 className="font-medium truncate">{activeConversation.title}</h2>
                  <span className="text-xs text-muted-foreground">
                    {selectedModelConfig?.model || activeConversation.modelName}
                  </span>
                </div>

                {/* 消息列表 */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                  className="flex-1 overflow-y-scroll p-4 space-y-4 relative chat-scrollbar"
                >
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

                  {/* 下拉滑纽：滚动到底部 */}
                  <AnimatePresence>
                    {showScrollButton && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={scrollToBottom}
                        className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-lg 
                                   flex items-center justify-center hover:bg-primary/90 transition-colors z-10"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>
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
                      minRows={1}
                      maxRows={8}
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

  // 自定义 ReactMarkdown 组件，将 SVG 代码块渲染为 SvgRenderer
  const markdownComponents = useCallback(() => ({
    code({ className, children, ...props }: any) {
      const isSvgBlock = className === 'language-svg' ||
        (typeof children === 'string' && children.trim().startsWith('<svg'));
      if (isSvgBlock) {
        const svgContent = typeof children === 'string' ? children : '';
        return <SvgRenderer svgContent={svgContent} />;
      }
      // 默认代码块渲染
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    pre({ children }: any) {
      // 检查 pre 标签内是否包含 SvgRenderer（即 SVG 代码块）
      if (children && typeof children === 'object' && 'type' in (children as any) && (children as any).type === SvgRenderer) {
        return children;
      }
      return <pre>{children}</pre>;
    },
  }), []);

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
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {message.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents()}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
