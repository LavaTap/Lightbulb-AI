import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageSquare, Plus, Trash2, Send, Square, Bot, User, ArrowDown, PanelLeftClose, PanelLeft, ImagePlus, Paperclip, File, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ModelDropdown } from '@/components/ModelDropdown';
import { SvgRenderer } from '@/components/SvgRenderer';
import { ImagePreview } from '@/components/ImagePreview';
import { useChat } from '@/hooks/useChat';
import { useApiConfig } from '@/hooks/useApiConfig';
import { modelConfigToApiConfig, getPersistedModelId, setPersistedModelId } from '@/lib/model-utils';
import { compressImage, cn, base64ToDataUrl, fileToBase64, formatFileSize } from '@/lib/utils';
import type { ChatMessage as ChatMessageType, ModelConfig, MessageAttachment } from '@/types/index';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isNearBottomRef = useRef(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 自动初始化选中的模型
  useEffect(() => {
    if (initRef.current || modelConfigs.length === 0) return;
    const textConfigs = getConfigsByCategory('text');
    const visionConfigs = getConfigsByCategory('vision');
    const configs = [...textConfigs, ...visionConfigs];
    if (configs.length === 0) return;
    initRef.current = true;
    const persistedId = getPersistedModelId('chat');
    const match = persistedId ? configs.find(c => c.id.toString() === persistedId) : null;
    const config = match || textConfigs[0] || visionConfigs[0];
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const dataBase64 = await compressImage(file);
        setAttachments(prev => [...prev, {
          type: 'image',
          dataBase64,
          mimeType: 'image/jpeg',
          fileName: file.name,
        }]);
      } catch (err) {
        console.error('Image compression failed:', err);
      }
    }
    // 重置 input 以便再次选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        // 读取文件为 base64
        const base64 = await fileToBase64(file);
        setAttachments(prev => [...prev, {
          type: 'file',
          dataBase64: base64,
          mimeType: file.type || 'application/octet-stream',
          fileName: file.name,
          fileSize: file.size,
        }]);
      } catch (err) {
        console.error('File read failed:', err);
      }
    }
    if (fileInputRef2.current) fileInputRef2.current.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && attachments.length === 0) || isStreaming) return;
    const hasImageAttachments = attachments.some(a => a.type === 'image');
    const content = inputValue.trim() || (hasImageAttachments ? '请描述这张图片' : '请查看附件');
    setInputValue('');
    const currentAttachments = attachments.length > 0 ? attachments : undefined;
    setAttachments([]);

    if (!activeConversation) {
      await handleCreateConversation();
    }

    const config = selectedModelConfig ? modelConfigToApiConfig(selectedModelConfig) : undefined;
    await sendMessage(content, currentAttachments, config);
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

              {/* 模型选择 - 扩展为包含 vision 类别 */}
              <div className="mb-3">
                <ModelDropdown
                  category={['text', 'vision']}
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

                {/* 下拉滑纽：滚动到底部 */}
                <AnimatePresence>
                  {showScrollButton && (
                    <motion.button
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onClick={scrollToBottom}
                      className="w-full py-2 flex items-center justify-center gap-2 text-xs text-primary bg-primary/5 hover:bg-primary/10 transition-colors border-t cursor-pointer"
                    >
                      <ArrowDown className="h-3 w-3" />
                      滚动到最新消息
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* 输入区域 */}
                <div className="p-4 border-t">
                  {/* 附件预览条 */}
                  {attachments.length > 0 && (
                    <div className="flex gap-2.5 mb-3 overflow-x-auto pb-1 chat-scrollbar">
                      {attachments.map((att, index) => (
                        <div key={index} className="relative shrink-0 group">
                          {att.type === 'image' ? (
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-border/50 group-hover:border-primary/40 transition-colors">
                              <img
                                src={base64ToDataUrl(att.dataBase64, att.mimeType)}
                                alt={att.fileName}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                                <p className="text-[10px] text-white truncate leading-tight">{att.fileName}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="w-44 rounded-xl border-2 border-border/50 bg-card hover:border-primary/40 transition-colors flex items-center gap-2.5 p-2.5">
                              <div className="shrink-0 w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                                <File className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{att.fileName}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {att.fileSize ? formatFileSize(att.fileSize) : '未知大小'}
                                </p>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => handleRemoveAttachment(index)}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-background border border-border shadow-sm
                                       flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
                                       hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 items-end">
                    {/* 统一附件上传按钮（下拉菜单） */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={isStreaming}
                          className="shrink-0"
                          title="添加附件"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" side="top" className="min-w-[140px]">
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                          <ImagePlus className="h-4 w-4 mr-2" />
                          图片
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => fileInputRef2.current?.click()}>
                          <Paperclip className="h-4 w-4 mr-2" />
                          文件
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <input
                      ref={fileInputRef2}
                      type="file"
                      multiple
                      onChange={handleFileSelect2}
                      className="hidden"
                    />

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
                        disabled={!inputValue.trim() && attachments.length === 0}
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

  // 图片预览状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);

  // 打开预览
  const openPreview = useCallback((_src: string, images: string[], index: number) => {
    setPreviewImages(images);
    setPreviewInitialIndex(index);
    setPreviewVisible(true);
  }, []);

  // 关闭预览
  const closePreview = useCallback(() => {
    setPreviewVisible(false);
  }, []);

  // 收集用户消息中的所有图片
  const userImages = useMemo(() => {
    if (!isUser || !message.attachments) return [];
    return message.attachments.map(att => base64ToDataUrl(att.dataBase64, att.mimeType));
  }, [isUser, message.attachments]);

  // 自定义 ReactMarkdown 组件，将 SVG 代码块渲染为 SvgRenderer，图片可点击预览
  const markdownComponents = useCallback(() => ({
    code({ className, children, ...props }: any) {
      const isSvgBlock = className === 'language-svg' ||
        (typeof children === 'string' && children.trim().startsWith('<svg'));
      if (isSvgBlock) {
        const svgContent = typeof children === 'string' ? children : '';
        return <SvgRenderer svgContent={svgContent} />;
      }
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    pre({ children }: any) {
      if (children && typeof children === 'object' && 'type' in (children as any) && (children as any).type === SvgRenderer) {
        return children;
      }
      return <pre>{children}</pre>;
    },
    img({ src, alt }: any) {
      if (!src) return null;
      return (
        <img
          src={src}
          alt={alt || ''}
          className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity border border-border max-w-full h-auto my-2"
          onClick={(e) => {
            e.stopPropagation();
            openPreview(src, [src], 0);
          }}
        />
      );
    },
  }), [openPreview]);

  if (isSystem) {
    return (
      <div className="text-center text-xs text-muted-foreground py-2">
        {message.content}
      </div>
    );
  }

  return (
    <>
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
          {/* 用户消息附件展示 */}
          {isUser && message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.attachments.map((att, i) => (
                att.type === 'image' ? (
                  <img
                    key={i}
                    src={base64ToDataUrl(att.dataBase64, att.mimeType)}
                    alt={att.fileName}
                    className="rounded-lg w-24 h-24 cursor-pointer hover:opacity-80 transition-opacity border border-white/20 object-cover"
                    onClick={() => openPreview(
                      base64ToDataUrl(att.dataBase64, att.mimeType),
                      userImages,
                      i
                    )}
                  />
                ) : (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/20 min-w-0 max-w-[200px]"
                    title={att.fileName}
                  >
                    <File className="h-4 w-4 shrink-0 text-white/70" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{att.fileName}</p>
                      {att.fileSize && (
                        <p className="text-[10px] text-white/60">{formatFileSize(att.fileSize)}</p>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
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

      {/* 图片放大预览 */}
      <ImagePreview
        visible={previewVisible}
        images={previewImages}
        initialIndex={previewInitialIndex}
        onClose={closePreview}
      />
    </>
  );
}
