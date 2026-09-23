import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Plus, Trash2, Send, Square, Bot, User, ArrowDown, FlaskConical, X, Pencil, Sparkles, Loader2, CheckCircle2, Circle, Clock, FileText, ChevronRight, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ModelDropdown } from '@/components/ModelDropdown';
import { useCharacterChat } from '@/hooks/useCharacterChat';
import { useApiConfig } from '@/hooks/useApiConfig';
import { characterChatApi } from '@/services/api';
import { modelConfigToApiConfig } from '@/lib/model-utils';
import { EMOTION_CONFIG } from '@/types/index';
import type { GameCharacter, CharacterChatMessage, ModelConfig } from '@/types/index';

// Emotion tag component
function EmotionTag({ emotion, intensity }: { emotion: string | null; intensity: number | null }) {
  if (!emotion) return null;
  const config = EMOTION_CONFIG[emotion] || { color: '#a0a4b8', label: emotion };
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full mt-1"
      style={{ background: `${config.color}22`, color: config.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
      {config.label}
      {intensity !== null && <span className="opacity-60 text-[10px]">{intensity.toFixed(1)}</span>}
    </span>
  );
}

// Character avatar
function CharacterAvatar({ character, size = 36 }: { character: GameCharacter; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: character.avatarColor + '33',
        color: character.avatarColor,
      }}
    >
      {character.name[0]}
    </div>
  );
}

// Message bubble
function MessageBubble({ message, character }: { message: CharacterChatMessage; character: GameCharacter }) {
  const isUser = message.role === 'user';

  // Strip emotion tags from display content
  const displayContent = message.content.replace(/^\[情绪:[^\]]+\]\s*/, '');

  return (
    <div className={`flex gap-2.5 max-w-[75%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}>
      <div
        className="rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 mt-0.5"
        style={{
          width: 28,
          height: 28,
          background: isUser ? '#2d3a5c' : character.avatarColor,
          color: isUser ? '#74b9ff' : '#fff',
        }}
      >
        {isUser ? 'V' : character.name[0]}
      </div>
      <div className={isUser ? 'text-right' : ''}>
        {!isUser && <EmotionTag emotion={message.emotion} intensity={message.emotionIntensity} />}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
            isUser
              ? 'bg-primary-500 dark:bg-[#2d3a5c] text-white rounded-br-sm'
              : 'bg-white/60 dark:bg-[#1e2233] border border-gray-200/60 dark:border-white/10 text-gray-800 dark:text-gray-200 rounded-bl-sm'
          }`}
        >
          <span className="whitespace-pre-wrap">{displayContent || '...'}</span>
          {isUser && message.content === '' && (
            <span className="inline-flex gap-1 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Character edit dialog
interface CharacterEditData {
  name: string;
  subtitle: string;
  avatarColor: string;
  identity: string;
  sceneSetting: string;
  languageStyle: string;
  behaviorRules: string;
}

function CharacterEditDialog({
  character,
  isOpen,
  onClose,
  onSave,
}: {
  character: CharacterEditData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CharacterEditData, isNew: boolean) => Promise<void>;
}) {
  const [form, setForm] = useState<CharacterEditData>({
    name: '', subtitle: '', avatarColor: '#6c5ce7',
    identity: '', sceneSetting: '', languageStyle: '', behaviorRules: '',
  });
  const [basicInfo, setBasicInfo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isNew = !character?.identity;
  const { activeModelConfig, getConfigsByCategory } = useApiConfig();

  useEffect(() => {
    if (isOpen && character) {
      setForm({
        name: character.name || '',
        subtitle: character.subtitle || '',
        avatarColor: character.avatarColor || '#6c5ce7',
        identity: character.identity || '',
        sceneSetting: character.sceneSetting || '',
        languageStyle: character.languageStyle || '',
        behaviorRules: character.behaviorRules || '',
      });
      setBasicInfo('');
    }
  }, [isOpen, character]);

  const updateField = (field: keyof CharacterEditData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!form.name.trim()) return;
    const config = activeModelConfig?.apiKey
      ? modelConfigToApiConfig(activeModelConfig)
      : modelConfigToApiConfig(getConfigsByCategory('text').find(m => m.apiKey)!);
    if (!config) return;

    setIsGenerating(true);
    try {
      const result = await characterChatApi.generatePersona(form.name, form.subtitle, basicInfo, config);
      const data = result.data;
      if (data.identity) updateField('identity', data.identity);
      if (data.sceneSetting) updateField('sceneSetting', data.sceneSetting);
      if (data.languageStyle) updateField('languageStyle', data.languageStyle);
      if (data.behaviorRules) updateField('behaviorRules', data.behaviorRules);
      if (data.suggestedSubtitle && !form.subtitle) updateField('subtitle', data.suggestedSubtitle);
      if (data.suggestedAvatarColor && isNew) updateField('avatarColor', data.suggestedAvatarColor);
    } catch (err: any) {
      console.error('Generate persona failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.identity.trim()) return;
    setIsSaving(true);
    try {
      await onSave(form, isNew);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white/95 dark:bg-[#1a1d27] border border-gray-200/60 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200/60 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {isNew ? '创建角色' : '编辑角色'}
          </h2>
          <button onClick={onClose} className="text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/80">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Basic info */}
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold"
                style={{ background: form.avatarColor + '33', color: form.avatarColor }}
              >
                {form.name ? form.name[0] : '?'}
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <Input
                value={form.name} onChange={e => updateField('name', e.target.value)}
                placeholder="角色名" className="bg-white/70 dark:bg-[#222633]"
              />
              <div className="flex gap-2">
                <Input
                  value={form.subtitle} onChange={e => updateField('subtitle', e.target.value)}
                  placeholder="称号/副标题" className="flex-1 bg-white/70 dark:bg-[#222633]"
                />
                <Input
                  value={form.avatarColor} onChange={e => updateField('avatarColor', e.target.value)}
                  placeholder="#6c5ce7" className="w-28 bg-white/70 dark:bg-[#222633]"
                  type="color"
                />
              </div>
            </div>
          </div>

          {/* AI Generation */}
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-white/50 mb-1 block">
                  输入角色基础信息，AI 将自动生成人格提示词
                </label>
                <Input
                  value={basicInfo} onChange={e => setBasicInfo(e.target.value)}
                  placeholder="例：22岁女战士，从小在军方训练营长大，性格冷静但偶尔流露对正常生活的向往"
                  className="bg-white/70 dark:bg-[#222633] text-sm"
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !form.name.trim()}
                className="bg-[#6c5ce7] hover:bg-[#a29bfe] flex-shrink-0"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" />生成中</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-1" />AI 生成</>
                )}
              </Button>
            </div>
          </div>

          {/* Persona fields */}
          {[
            { key: 'identity' as const, label: '身份与背景', desc: 'Module 1：角色是谁？职业、年龄、性格特质' },
            { key: 'sceneSetting' as const, label: '场景与对话对象', desc: 'Module 2：在哪里？和谁对话？' },
            { key: 'languageStyle' as const, label: '语言风格规则', desc: 'Module 3：怎么说话？标点、语气词、口头禅' },
            { key: 'behaviorRules' as const, label: '行为触发规则', desc: 'Module 4：遇到什么话题做什么反应？' },
          ].map(({ key, label, desc }) => (
            <div key={key}>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                {label}
                <span className="text-xs font-normal text-gray-400 dark:text-white/40 ml-2">{desc}</span>
              </label>
              <Textarea
                value={form[key]} onChange={e => updateField(key, e.target.value)}
                placeholder={desc}
                className="bg-white/70 dark:bg-[#222633] min-h-[72px] text-sm"
                rows={3}
              />
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-200/60 dark:border-white/10 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !form.name.trim() || !form.identity.trim()}
            className="bg-[#6c5ce7] hover:bg-[#a29bfe]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            {isNew ? '创建' : '保存'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CharacterChatPage() {
  const {
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
    selectCharacter,
    createConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
    stopStreaming,
    clearError,
  } = useCharacterChat();

  const { getConfigsByCategory, activeModelConfig } = useApiConfig();
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedModelConfig, setSelectedModelConfig] = useState<ModelConfig | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<CharacterEditData | null>(null);
  const [selectedTestModel, setSelectedTestModel] = useState<string>('');
  const [selectedTestModelConfig, setSelectedTestModelConfig] = useState<ModelConfig | null>(null);
  const [testSteps, setTestSteps] = useState<Array<{ step: number; label: string; status: string; detail: string }>>([]);
  const [testProgress, setTestProgress] = useState<{ current: number; total: number; detail: string } | null>(null);
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [selectedTestRun, setSelectedTestRun] = useState<any>(null);
  const testAbortRef = useRef<AbortController | null>(null);

  // Initialize selected model from active model config
  useEffect(() => {
    if (activeModelConfig && !selectedModel) {
      setSelectedModel(activeModelConfig.model);
      setSelectedModelConfig(activeModelConfig);
    }
  }, [activeModelConfig, selectedModel]);

  // Initialize test model from chat page model (gamechat config)
  useEffect(() => {
    if (!selectedTestModel && selectedModelConfig?.apiKey) {
      setSelectedTestModel(selectedModelConfig.model);
      setSelectedTestModelConfig(selectedModelConfig);
    } else if (!selectedTestModel && activeModelConfig?.apiKey) {
      setSelectedTestModel(activeModelConfig.model);
      setSelectedTestModelConfig(activeModelConfig);
    }
  }, [selectedModelConfig, activeModelConfig, selectedTestModel]);

  const handleModelChange = useCallback((_modelId: string, config: ModelConfig) => {
    setSelectedModel(config.model);
    setSelectedModelConfig(config);
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;
    const msg = inputValue.trim();
    setInputValue('');
    await sendMessage(msg);
  }, [inputValue, isStreaming, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleNewConversation = useCallback(async () => {
    if (!activeCharacter) return;
    await createConversation(activeCharacter.id, `与${activeCharacter.name}的对话`);
  }, [activeCharacter, createConversation]);

  const handleRunTest = useCallback(async () => {
    setIsTestRunning(true);
    setTestResult(null);
    setTestSteps([]);
    setTestProgress(null);

    // Use selected test model, or fall back to first available text model
    let modelConfig = selectedTestModelConfig;
    if (!modelConfig || !modelConfig.apiKey) {
      const textModels = getConfigsByCategory('text');
      modelConfig = textModels.find(m => m.apiKey) || null;
    }
    if (!modelConfig || !modelConfig.apiKey) {
      setTestResult({ error: '没有可用的文本模型配置，请先在模型管理中配置或选择模型' });
      setIsTestRunning(false);
      return;
    }
    const config = {
      provider: modelConfig.provider,
      model: modelConfig.model,
      apiKey: modelConfig.apiKey!,
      endpoint: modelConfig.endpoint || '',
      useProxy: modelConfig.useProxy,
      proxyEndpoint: modelConfig.proxyEndpoint || '',
    };

    const abortController = new AbortController();
    testAbortRef.current = abortController;

    try {
      const response = await characterChatApi.runTest(config, abortController.signal);
      if (!response.ok) throw new Error('Network error');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let currentEventType = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (currentEventType === 'step') {
                setTestSteps(prev => {
                  const existing = prev.findIndex(s => s.step === data.step);
                  if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = data;
                    return updated;
                  }
                  return [...prev, data];
                });
              } else if (currentEventType === 'progress') {
                setTestProgress({
                  current: data.questionIndex,
                  total: data.totalQuestions,
                  detail: data.detail,
                });
              } else if (currentEventType === 'complete') {
                setTestResult(data);
                setTestProgress(null);
              } else if (currentEventType === 'error') {
                setTestResult({ error: data.error });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setTestResult({ error: err.message });
      }
    } finally {
      setIsTestRunning(false);
      testAbortRef.current = null;
    }
  }, [getConfigsByCategory, selectedTestModelConfig]);

  const handleTestModelChange = useCallback((_modelId: string, config: ModelConfig) => {
    setSelectedTestModel(config.model);
    setSelectedTestModelConfig(config);
  }, []);

  const loadTestHistory = useCallback(async () => {
    try {
      const result = await characterChatApi.getTestRuns();
      setTestHistory(result.data || []);
    } catch (err: any) {
      console.error('Failed to load test history:', err);
    }
  }, []);

  const handleStopTest = useCallback(() => {
    testAbortRef.current?.abort();
  }, []);

  const downloadJson = useCallback((data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportConversation = useCallback(() => {
    if (!activeCharacter || !activeConversation || messages.length === 0) return;
    const exportData = {
      exportTime: new Date().toISOString(),
      character: {
        id: activeCharacter.id,
        name: activeCharacter.name,
        subtitle: activeCharacter.subtitle,
        avatarColor: activeCharacter.avatarColor,
        identity: activeCharacter.identity,
        sceneSetting: activeCharacter.sceneSetting,
        languageStyle: activeCharacter.languageStyle,
        behaviorRules: activeCharacter.behaviorRules,
      },
      conversation: {
        id: activeConversation.id,
        title: activeConversation.title,
        createdAt: activeConversation.createdAt,
      },
      messages: messages.map(m => ({
        role: m.role,
        content: m.content.replace(/^\[情绪:[^\]]+\]\s*/, ''),
        emotion: m.emotion,
        emotionIntensity: m.emotionIntensity,
        tokenUsage: m.tokenUsage,
        createdAt: m.createdAt,
      })),
    };
    downloadJson(exportData, `${activeCharacter.name}_对话记录_${new Date().toISOString().slice(0, 10)}.json`);
  }, [activeCharacter, activeConversation, messages, downloadJson]);

  const handleExportTestReport = useCallback((report: any, filenameSuffix?: string) => {
    const exportData = {
      exportTime: new Date().toISOString(),
      testRunId: report.testRunId || report.id,
      modelInfo: report.modelInfo,
      total: report.total,
      passed: report.passed,
      failed: report.failed,
      results: report.results,
      analysis: report.analysis,
    };
    const suffix = filenameSuffix || `报告_${report.testRunId || report.id}`;
    downloadJson(exportData, `${suffix}_${new Date().toISOString().slice(0, 10)}.json`);
  }, [downloadJson]);

  const handleEditCharacter = useCallback((char: GameCharacter) => {
    setEditingCharacter({
      name: char.name, subtitle: char.subtitle || '', avatarColor: char.avatarColor,
      identity: char.identity, sceneSetting: char.sceneSetting,
      languageStyle: char.languageStyle, behaviorRules: char.behaviorRules,
    });
    setShowEditDialog(true);
  }, []);

  const handleCreateCharacter = useCallback(() => {
    setEditingCharacter({
      name: '', subtitle: '', avatarColor: '#6c5ce7',
      identity: '', sceneSetting: '', languageStyle: '', behaviorRules: '',
    });
    setShowEditDialog(true);
  }, []);

  const handleSaveCharacter = useCallback(async (data: CharacterEditData, isNew: boolean) => {
    const systemPrompt = `Reply to me in Chinese only!\n${data.identity}\n\n${data.sceneSetting}\n\n${data.languageStyle}\n\n${data.behaviorRules}\n\n重要规则：\n- 始终保持角色人设，不要脱离角色\n- 回复字数控制在20-50字之间\n- 每条回复开头用 [情绪:xxx|强度] 格式标注当前情绪`;
    if (isNew) {
      await characterChatApi.createCharacter({
        name: data.name, avatarColor: data.avatarColor, subtitle: data.subtitle,
        identity: data.identity, sceneSetting: data.sceneSetting,
        languageStyle: data.languageStyle, behaviorRules: data.behaviorRules,
        systemPrompt, isPreset: false,
      });
    } else if (activeCharacter) {
      await characterChatApi.updateCharacter(activeCharacter.id, {
        name: data.name, avatarColor: data.avatarColor, subtitle: data.subtitle,
        identity: data.identity, sceneSetting: data.sceneSetting,
        languageStyle: data.languageStyle, behaviorRules: data.behaviorRules,
        systemPrompt,
      });
    }
    await loadCharacters();
  }, [activeCharacter, loadCharacters]);

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 min-w-[256px] border-r border-gray-200/60 dark:border-white/10 bg-white/40 dark:bg-white/5 flex flex-col">
        {/* Character list */}
        <div className="p-3 border-b border-gray-200/60 dark:border-white/10">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs uppercase tracking-wider text-gray-400 dark:text-white/40">角色</h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/80"
              onClick={handleCreateCharacter}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex flex-col gap-0.5">
            {characters.map(char => (
              <div
                key={char.id}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors group ${
                  activeCharacter?.id === char.id
                    ? 'bg-gray-100 dark:bg-white/10'
                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <button
                  onClick={() => selectCharacter(char)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                >
                  <CharacterAvatar character={char} size={32} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate text-gray-800 dark:text-gray-200">{char.name}</div>
                    {char.subtitle && (
                      <div className="text-[11px] text-gray-400 dark:text-white/40 truncate">{char.subtitle}</div>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => handleEditCharacter(char)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-white/40 hover:text-[#6c5ce7] dark:hover:text-[#a29bfe] flex-shrink-0 transition-opacity"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between px-1 mb-1">
            <h2 className="text-xs uppercase tracking-wider text-gray-400 dark:text-white/40">对话</h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/80"
              onClick={handleNewConversation}
              disabled={!activeCharacter}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`w-full text-left px-2.5 py-2 rounded-lg mb-0.5 transition-colors group ${
                activeConversation?.id === conv.id
                  ? 'bg-[#6c5ce7] text-white'
                  : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-white/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] truncate flex-1">{conv.title}</span>
                <button
                  onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 ml-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="text-[11px] opacity-60 mt-0.5">{conv.messageCount} 条消息</div>
            </button>
          ))}
        </div>

        {/* Bottom nav */}
        <div className="border-t border-gray-200/60 dark:border-white/10 p-2 flex flex-col gap-0.5">
          <button
            onClick={() => setShowTestPanel(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-gray-500 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white/80 transition-colors"
          >
            <FlaskConical className="w-4 h-4" />
            测试智能体
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeCharacter ? (
          <>
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-gray-200/60 dark:border-white/10 bg-white/40 dark:bg-white/5 flex items-center gap-3">
              <CharacterAvatar character={activeCharacter} size={32} />
              <div>
                <h2 className="text-[15px] font-semibold text-gray-800 dark:text-gray-200">{activeCharacter.name}</h2>
                <span className="text-[12px] text-gray-400 dark:text-white/40">
                  {activeCharacter.subtitle}
                  {activeConversation && ` · ${activeConversation.title}`}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {activeConversation && messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-gray-400 dark:text-white/50 hover:text-[#6c5ce7] dark:hover:text-[#a29bfe]"
                    onClick={handleExportConversation}
                    title="导出对话记录 JSON"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                <ModelDropdown
                  category={["text", "vision"]}
                  selectedModel={selectedModel}
                  onModelChange={handleModelChange}
                />
              </div>
              {isStreaming && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  onClick={stopStreaming}
                >
                  <Square className="w-3 h-3 mr-1" />终止
                </Button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {!activeConversation && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-white/20 gap-3">
                  <MessageSquare className="w-12 h-12" />
                  <p className="text-sm text-gray-400 dark:text-gray-300">选择一个对话或创建新对话开始聊天</p>
                  <Button variant="outline" onClick={handleNewConversation}>
                    <Plus className="w-4 h-4 mr-1" />新建对话
                  </Button>
                </div>
              )}
              {activeConversation && messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} character={activeCharacter} />
              ))}
              {thinkingStatus && (
                <div className="flex gap-2.5 max-w-[75%] self-start">
                  <CharacterAvatar character={activeCharacter} size={28} />
                  <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white/60 dark:bg-[#1e2233] border border-gray-200/60 dark:border-white/10 text-sm text-gray-500 dark:text-white/50">
                    {thinkingStatus.message}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            {activeConversation && (
              <div className="px-5 py-4 border-t border-gray-200/60 dark:border-white/10 bg-white/40 dark:bg-white/5">
                {error && (
                  <div className="mb-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 dark:text-red-400 text-xs flex items-center gap-2">
                    <span className="flex-1">{error}</span>
                    <button onClick={clearError}><X className="w-3 h-3" /></button>
                  </div>
                )}
                <div className="flex gap-2.5 items-end">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`给${activeCharacter.name}发消息…`}
                    className="flex-1 bg-white/70 dark:bg-[#222633] border-gray-200/60 dark:border-white/10 text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 resize-none min-h-[42px] max-h-[120px] focus:border-[#6c5ce7]"
                    rows={1}
                    disabled={isStreaming}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isStreaming}
                    className="w-[42px] h-[42px] p-0 bg-[#6c5ce7] hover:bg-[#a29bfe] rounded-xl flex-shrink-0"
                  >
                    {isStreaming ? <Square className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-white/20 gap-3">
            <Bot className="w-16 h-16" />
            <p className="text-sm text-gray-400 dark:text-gray-300">选择一个角色开始对话</p>
          </div>
        )}
      </div>

      {/* Character Edit Dialog */}
      <AnimatePresence>
        <CharacterEditDialog
          character={editingCharacter}
          isOpen={showEditDialog}
          onClose={() => { setShowEditDialog(false); setEditingCharacter(null); }}
          onSave={handleSaveCharacter}
        />
      </AnimatePresence>

      {/* Test Panel Dialog */}
      <AnimatePresence>
        {showTestPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowTestPanel(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/90 dark:bg-[#1a1d27] border border-gray-200/60 dark:border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Test Panel Header */}
              <div className="px-6 py-4 border-b border-gray-200/60 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-[#6c5ce7]" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">角色测试智能体</h2>
                </div>
                <button onClick={() => setShowTestPanel(false)} className="text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/80">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Test Panel Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Test Config Area */}
                <div className="mb-6">
                  <p className="text-gray-600 dark:text-white/60 text-sm mb-4">
                    自动为 4 个预设角色生成人格，然后跑通对话测试（每个角色 4 个标准问题 + 追问），
                    最后调用分析模块生成 5 维度评估报告。
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {characters.filter(c => c.isPreset).map(char => (
                      <div key={char.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5">
                        <CharacterAvatar character={char} size={28} />
                        <div>
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{char.name}</div>
                          <div className="text-[11px] text-gray-400 dark:text-white/40">{char.subtitle}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 dark:text-white/50 mb-1.5 block">选择测试模型</label>
                    <ModelDropdown
                      category="text"
                      selectedModel={selectedTestModel}
                      onModelChange={handleTestModelChange}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRunTest}
                      disabled={isTestRunning || !selectedTestModelConfig?.apiKey}
                      className="bg-[#6c5ce7] hover:bg-[#a29bfe] flex-1"
                    >
                      {isTestRunning ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />测试中…</>
                      ) : (
                        <><FlaskConical className="w-4 h-4 mr-2" />开始测试</>
                      )}
                    </Button>
                    {isTestRunning && (
                      <Button variant="outline" onClick={handleStopTest} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                        <Square className="w-4 h-4 mr-1" />终止
                      </Button>
                    )}
                    <Button variant="outline" onClick={loadTestHistory} className="flex-shrink-0">
                      <FileText className="w-4 h-4 mr-1" />历史报告
                    </Button>
                  </div>
                </div>

                {/* Step Progress */}
                {(testSteps.length > 0 || isTestRunning) && (
                  <div className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10">
                    <h3 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-200">测试进度</h3>
                    <div className="space-y-2">
                      {[
                        { step: 0, label: '前置检查' },
                        { step: 1, label: '初始化预设角色' },
                        { step: 2, label: '构建测试问题集' },
                        { step: 3, label: '对话测试' },
                        { step: 4, label: '情绪标签记录' },
                        { step: 5, label: '生成分析报告' },
                        { step: 6, label: '测试完成' },
                      ].map(stepDef => {
                        const stepData = testSteps.find(s => s.step === stepDef.step);
                        const status = stepData?.status || (testSteps.some(s => s.step < stepDef.step && s.status === 'done') || testSteps.some(s => s.step > stepDef.step) ? 'pending' : 'pending');
                        const isCurrentStep = stepData?.status === 'running';
                        return (
                          <div key={stepDef.step} className={`flex items-start gap-2.5 py-1 ${isCurrentStep ? 'bg-[#6c5ce7]/5 dark:bg-[#6c5ce7]/10 rounded-lg px-2 -mx-2' : ''}`}>
                            {stepData?.status === 'done' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : isCurrentStep ? (
                              <Loader2 className="w-4 h-4 text-[#6c5ce7] mt-0.5 flex-shrink-0 animate-spin" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 dark:text-white/20 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium ${
                                stepData?.status === 'done' ? 'text-green-600 dark:text-green-400' :
                                isCurrentStep ? 'text-[#6c5ce7] dark:text-[#a29bfe]' :
                                'text-gray-400 dark:text-white/30'
                              }`}>
                                Step {stepDef.step} {stepDef.label}
                              </div>
                              {stepData?.detail && (
                                <div className={`text-xs mt-0.5 ${isCurrentStep ? 'text-[#6c5ce7]/70 dark:text-[#a29bfe]/70' : 'text-gray-500 dark:text-white/40'}`}>
                                  {stepData.detail}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Real-time question progress */}
                    {testProgress && (
                      <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-white/10">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-gray-500 dark:text-white/50">
                            对话进度 ({testProgress.current}/{testProgress.total})
                          </span>
                          <span className="text-xs text-gray-400 dark:text-white/30">
                            {Math.round((testProgress.current / testProgress.total) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#6c5ce7] rounded-full transition-all duration-300"
                            style={{ width: `${(testProgress.current / testProgress.total) * 100}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-white/40 mt-1.5 truncate">
                          {testProgress.detail}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Test Results */}
                {testResult && (
                  <div className="space-y-4">
                    {testResult.error ? (
                      <div className="p-4 rounded-lg bg-red-500/10 text-red-500 dark:text-red-400 text-sm">
                        测试失败：{testResult.error}
                      </div>
                    ) : (
                      <>
                        {/* Summary */}
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">测试概览</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-gray-400 dark:text-white/50 hover:text-[#6c5ce7] dark:hover:text-[#a29bfe]"
                              onClick={() => handleExportTestReport(testResult)}
                            >
                              <Download className="w-3.5 h-3.5 mr-1" />导出JSON
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{testResult.total}</div>
                              <div className="text-xs text-gray-400 dark:text-white/40">总测试</div>
                            </div>
                            <div className="text-center text-green-500 dark:text-green-400">
                              <div className="text-2xl font-bold">{testResult.passed}</div>
                              <div className="text-xs text-gray-400 dark:text-white/40">通过</div>
                            </div>
                            <div className="text-center text-red-500 dark:text-red-400">
                              <div className="text-2xl font-bold">{testResult.failed}</div>
                              <div className="text-xs text-gray-400 dark:text-white/40">失败</div>
                            </div>
                          </div>
                          {testResult.modelInfo && (
                            <div className="text-xs text-gray-400 dark:text-white/40 mt-2 text-center">
                              模型：{testResult.modelInfo.provider} / {testResult.modelInfo.model}
                              {testResult.testRunId && ` · 报告 ID: ${testResult.testRunId}`}
                            </div>
                          )}
                        </div>

                        {/* Per-character results */}
                        {testResult.results?.map((charResult: any) => (
                          <div key={charResult.characterId} className="p-4 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{charResult.characterName}</span>
                              <span className="text-xs text-gray-400 dark:text-white/40">
                                {charResult.passed}/{charResult.passed + charResult.failed} 通过
                              </span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                {Math.round((charResult.passed / (charResult.passed + charResult.failed)) * 100)}%
                              </span>
                            </div>
                            <div className="space-y-2">
                              {charResult.tests?.map((test: any, idx: number) => (
                                <div key={idx} className="text-sm flex gap-2">
                                  <span className={test.passed ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>
                                    {test.passed ? '✓' : '✗'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-gray-600 dark:text-white/60">{test.question}</span>
                                    {test.response && (
                                      <div className="text-gray-800 dark:text-white/80 mt-0.5 text-xs">
                                        {test.response.substring(0, 100)}{test.response.length > 100 ? '…' : ''}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {test.emotion && (
                                        <EmotionTag emotion={test.emotion} intensity={test.emotionIntensity} />
                                      )}
                                      {test.emotionSource && (
                                        <span className="text-[10px] text-gray-400 dark:text-white/30">
                                          {test.emotionSource === 'self' ? '自标注' : test.emotionSource === 'ai' ? 'AI检测' : '默认'}
                                        </span>
                                      )}
                                      {test.error && (
                                        <span className="text-[10px] text-red-400">{test.error}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Analysis */}
                        {testResult.analysis && (
                          <div className="p-4 rounded-lg bg-gray-50 dark:bg-white/5 border border-[#6c5ce7]/30">
                            <h3 className="text-sm font-semibold mb-2 text-[#6c5ce7] dark:text-[#a29bfe]">五维度分析报告</h3>
                            <pre className="text-xs text-gray-700 dark:text-white/70 whitespace-pre-wrap font-mono leading-relaxed max-h-80 overflow-y-auto">
                              {testResult.analysis.substring(0, 3000)}
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Test History */}
                {testHistory.length > 0 && !isTestRunning && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> 测试历史
                    </h3>
                    <div className="space-y-2">
                      {testHistory.map((run: any) => (
                        <div
                          key={run.id}
                          className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 cursor-pointer hover:border-[#6c5ce7]/50 transition-colors"
                          onClick={() => setSelectedTestRun(selectedTestRun?.id === run.id ? null : run)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                报告 #{run.id}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                run.failed === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              }`}>
                                {run.passed}/{run.total} 通过
                              </span>
                              {run.modelInfo && (
                                <span className="text-xs text-gray-400 dark:text-white/30">
                                  {run.modelInfo.provider}/{run.modelInfo.model}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[11px] text-gray-400 dark:text-white/50 hover:text-[#6c5ce7] dark:hover:text-[#a29bfe] px-1.5"
                                onClick={(e) => { e.stopPropagation(); handleExportTestReport(run, `测试报告_${run.id}`); }}
                                title="导出JSON"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                              <span className="text-xs text-gray-400 dark:text-white/30">
                                {new Date(run.createdAt).toLocaleString('zh-CN')}
                              </span>
                            </div>
                          </div>
                          {/* Expanded detail */}
                          {selectedTestRun?.id === run.id && (
                            <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-white/10 space-y-3">
                              {run.results?.map((charResult: any) => (
                                <div key={charResult.characterId}>
                                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {charResult.characterName}
                                    <span className="text-xs text-gray-400 dark:text-white/40 ml-2">
                                      {charResult.passed}/{charResult.passed + charResult.failed}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    {charResult.tests?.map((test: any, idx: number) => (
                                      <div key={idx} className="text-xs flex gap-1.5">
                                        <span className={test.passed ? 'text-green-500' : 'text-red-500'}>
                                          {test.passed ? '✓' : '✗'}
                                        </span>
                                        <span className="text-gray-500 dark:text-white/50">{test.question}</span>
                                        {test.emotion && <EmotionTag emotion={test.emotion} intensity={test.emotionIntensity} />}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              {run.analysis && (
                                <div className="mt-2 p-3 rounded bg-white/50 dark:bg-white/5 border border-[#6c5ce7]/20">
                                  <div className="text-xs font-semibold text-[#6c5ce7] dark:text-[#a29bfe] mb-1">五维度分析</div>
                                  <pre className="text-[11px] text-gray-600 dark:text-white/60 whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                                    {run.analysis.substring(0, 2000)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
