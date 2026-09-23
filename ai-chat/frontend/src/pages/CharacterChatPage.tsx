import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Plus, Trash2, Send, Square, Bot, User, X, Pencil, Sparkles, Loader2, Download, Settings } from 'lucide-react';
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
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full mt-1" style={{ background: `${config.color}22`, color: config.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
      {config.label}
      {intensity !== null && <span className="opacity-60 text-[10px]">{intensity.toFixed(1)}</span>}
    </span>
  );
}

// Character avatar
function CharacterAvatar({ character, size = 36 }: { character: GameCharacter; size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center font-semibold flex-shrink-0" style={{ width: size, height: size, fontSize: size * 0.4, background: character.avatarColor + '33', color: character.avatarColor }}>
      {character.name[0]}
    </div>
  );
}

// Message bubble
function MessageBubble({ message, character }: { message: CharacterChatMessage; character: GameCharacter }) {
  const isUser = message.role === 'user';
  const displayContent = message.content.replace(/^\[情绪:[^\]]+\]\s*/, '');

  return (
    <div className={`flex gap-2.5 max-w-[75%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}>
      <div className="rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 mt-0.5" style={{ width: 28, height: 28, background: isUser ? '#2d3a5c' : character.avatarColor, color: isUser ? '#74b9ff' : '#fff' }}>
        {isUser ? 'V' : character.name[0]}
      </div>
      <div className={isUser ? 'text-right' : ''}>
        {!isUser && <EmotionTag emotion={message.emotion} intensity={message.emotionIntensity} />}
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${isUser ? 'bg-primary-500 dark:bg-[#2d3a5c] text-white rounded-br-sm' : 'bg-white/60 dark:bg-[#1e2233] border border-gray-200/60 dark:border-white/10 text-gray-800 dark:text-gray-200 rounded-bl-sm'}`}>
          <span className="whitespace-pre-wrap">{displayContent || '...'}</span>
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

function CharacterEditDialog({ character, isOpen, onClose, onSave }: { character: CharacterEditData | null; isOpen: boolean; onClose: () => void; onSave: (data: CharacterEditData, isNew: boolean) => Promise<void>; }) {
  const [form, setForm] = useState<CharacterEditData>({ name: '', subtitle: '', avatarColor: '#6c5ce7', identity: '', sceneSetting: '', languageStyle: '', behaviorRules: '' });
  const [basicInfo, setBasicInfo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isNew = !character?.identity;
  const { activeModelConfig, getConfigsByCategory } = useApiConfig();

  useEffect(() => {
    if (isOpen && character) {
      setForm({ name: character.name || '', subtitle: character.subtitle || '', avatarColor: character.avatarColor || '#6c5ce7', identity: character.identity || '', sceneSetting: character.sceneSetting || '', languageStyle: character.languageStyle || '', behaviorRules: character.behaviorRules || '' });
      setBasicInfo('');
    }
  }, [isOpen, character]);

  const updateField = (field: keyof CharacterEditData, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleGenerate = async () => {
    if (!form.name.trim()) return;
    const config = activeModelConfig?.apiKey ? modelConfigToApiConfig(activeModelConfig) : modelConfigToApiConfig(getConfigsByCategory('text').find(m => m.apiKey)!);
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
    } catch (err: any) { console.error('Generate persona failed:', err); } finally { setIsGenerating(false); }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.identity.trim()) return;
    setIsSaving(true);
    try { await onSave(form, isNew); onClose(); } finally { setIsSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white/95 dark:bg-[#1a1d27] border border-gray-200/60 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200/60 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{isNew ? '创建角色' : '编辑角色'}</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/80"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold" style={{ background: form.avatarColor + '33', color: form.avatarColor }}>{form.name ? form.name[0] : '?'}</div>
            </div>
            <div className="flex-1 space-y-2">
              <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="角色名" className="bg-white/70 dark:bg-[#222633]" />
              <div className="flex gap-2">
                <Input value={form.subtitle} onChange={e => updateField('subtitle', e.target.value)} placeholder="称号/副标题" className="flex-1 bg-white/70 dark:bg-[#222633]" />
                <Input value={form.avatarColor} onChange={e => updateField('avatarColor', e.target.value)} placeholder="#6c5ce7" className="w-28 bg-white/70 dark:bg-[#222633]" type="color" />
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-white/50 mb-1 block">输入角色基础信息，AI 将自动生成人格提示词</label>
                <Input value={basicInfo} onChange={e => setBasicInfo(e.target.value)} placeholder="例：22岁女战士，从小在军方训练营长大，性格冷静但偶尔流露对正常生活的向往" className="bg-white/70 dark:bg-[#222633] text-sm" />
              </div>
              <Button onClick={handleGenerate} disabled={isGenerating || !form.name.trim()} className="bg-[#6c5ce7] hover:bg-[#a29bfe] flex-shrink-0">
                {isGenerating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />生成中</> : <><Sparkles className="w-4 h-4 mr-1" />AI 生成</>}
              </Button>
            </div>
          </div>
          {[{ key: 'identity' as const, label: '身份与背景', desc: 'Module 1：角色是谁？职业、年龄、性格特质' }, { key: 'sceneSetting' as const, label: '场景与对话对象', desc: 'Module 2：在哪里？和谁对话？' }, { key: 'languageStyle' as const, label: '语言风格规则', desc: 'Module 3：怎么说话？标点、语气词、口头禅' }, { key: 'behaviorRules' as const, label: '行为触发规则', desc: 'Module 4：遇到什么话题做什么反应？' }].map(({ key, label, desc }) => (
            <div key={key}>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{label}<span className="text-xs font-normal text-gray-400 dark:text-white/40 ml-2">{desc}</span></label>
              <Textarea value={form[key]} onChange={e => updateField(key, e.target.value)} placeholder={desc} className="bg-white/70 dark:bg-[#222633] min-h-[72px] text-sm" rows={3} />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-200/60 dark:border-white/10 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} disabled={isSaving || !form.name.trim() || !form.identity.trim()} className="bg-[#6c5ce7] hover:bg-[#a29bfe]">
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}{isNew ? '创建' : '保存'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Model Settings Dialog (simplified)
function ModelSettingsDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { modelConfigs, saveToModelManager, deleteModelConfig, reloadModelConfigs } = useApiConfig();
  const [form, setForm] = useState({ name: '', provider: 'openai', model: 'gpt-4o-mini', apiKey: '', endpoint: '', useProxy: false, proxyEndpoint: '', category: 'text' });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim() || !form.apiKey.trim()) return;
    setIsSaving(true);
    try {
      await saveToModelManager(form.name, form.provider, form.model, form.apiKey, form.endpoint, form.useProxy, form.proxyEndpoint, form.category as any, [], true);
      setForm({ name: '', provider: 'openai', model: 'gpt-4o-mini', apiKey: '', endpoint: '', useProxy: false, proxyEndpoint: '', category: 'text' });
      await reloadModelConfigs();
    } catch (err: any) { console.error('Failed to save model config:', err); } finally { setIsSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/95 dark:bg-[#1a1d27] border border-gray-200/60 dark:border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200/60 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">模型配置</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/80"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Existing configs */}
          {modelConfigs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">已配置模型</h3>
              {modelConfigs.map(config => (
                <div key={config.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                  <div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{config.name}</span>
                    <span className="text-xs text-gray-400 dark:text-white/40 ml-2">{config.provider}/{config.model}</span>
                    {config.isActive && <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full ml-2">激活</span>}
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-red-400 hover:text-red-500" onClick={() => deleteModelConfig(config.id)}>删除</Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new config */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">添加新模型</h3>
            <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="配置名称（如：GPT-4o）" className="bg-white/70 dark:bg-[#222633]" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.provider} onChange={e => setForm(prev => ({ ...prev, provider: e.target.value }))} className="h-10 rounded-xl border border-gray-200/60 dark:border-gray-700/50 bg-white/40 dark:bg-gray-800/40 px-3 text-sm">
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
                <option value="google">Google</option>
                <option value="aliyun">阿里云</option>
                <option value="xfyun">讯飞</option>
                <option value="bytedance">字节跳动</option>
                <option value="baidu">百度</option>
                <option value="custom">自定义</option>
              </select>
              <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className="h-10 rounded-xl border border-gray-200/60 dark:border-gray-700/50 bg-white/40 dark:bg-gray-800/40 px-3 text-sm">
                <option value="text">纯文本</option>
                <option value="vision">视觉分析</option>
              </select>
            </div>
            <Input value={form.model} onChange={e => setForm(prev => ({ ...prev, model: e.target.value }))} placeholder="模型名称（如：gpt-4o-mini）" className="bg-white/70 dark:bg-[#222633]" />
            <Input value={form.apiKey} onChange={e => setForm(prev => ({ ...prev, apiKey: e.target.value }))} placeholder="API Key" type="password" className="bg-white/70 dark:bg-[#222633]" />
            <Input value={form.endpoint} onChange={e => setForm(prev => ({ ...prev, endpoint: e.target.value }))} placeholder="自定义 Endpoint（可选）" className="bg-white/70 dark:bg-[#222633]" />
            <Button onClick={handleSave} disabled={isSaving || !form.name.trim() || !form.apiKey.trim()} className="w-full bg-[#6c5ce7] hover:bg-[#a29bfe]">
              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}保存并激活
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CharacterChatPage() {
  const {
    characters, activeCharacter, conversations, activeConversation, messages,
    isStreaming, thinkingStatus, isLoading, error,
    loadCharacters, selectCharacter, createConversation, selectConversation,
    deleteConversation, sendMessage, stopStreaming, clearError,
  } = useCharacterChat();

  const { getConfigsByCategory, activeModelConfig } = useApiConfig();
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedModelConfig, setSelectedModelConfig] = useState<ModelConfig | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<CharacterEditData | null>(null);
  const [showModelSettings, setShowModelSettings] = useState(false);

  useEffect(() => {
    if (activeModelConfig && !selectedModel) { setSelectedModel(activeModelConfig.model); setSelectedModelConfig(activeModelConfig); }
  }, [activeModelConfig, selectedModel]);

  const handleModelChange = useCallback((_modelId: string, config: ModelConfig) => { setSelectedModel(config.model); setSelectedModelConfig(config); }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { loadCharacters(); }, [loadCharacters]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;
    const msg = inputValue.trim();
    setInputValue('');
    await sendMessage(msg);
  }, [inputValue, isStreaming, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleNewConversation = useCallback(async () => {
    if (!activeCharacter) return;
    await createConversation(activeCharacter.id, `与${activeCharacter.name}的对话`);
  }, [activeCharacter, createConversation]);

  const handleExportConversation = useCallback(() => {
    if (!activeCharacter || !activeConversation || messages.length === 0) return;
    const exportData = {
      exportTime: new Date().toISOString(),
      character: { id: activeCharacter.id, name: activeCharacter.name, subtitle: activeCharacter.subtitle },
      conversation: { id: activeConversation.id, title: activeConversation.title },
      messages: messages.map(m => ({ role: m.role, content: m.content.replace(/^\[情绪:[^\]]+\]\s*/, ''), emotion: m.emotion, emotionIntensity: m.emotionIntensity })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${activeCharacter.name}_对话_${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [activeCharacter, activeConversation, messages]);

  const handleEditCharacter = useCallback((char: GameCharacter) => {
    setEditingCharacter({ name: char.name, subtitle: char.subtitle || '', avatarColor: char.avatarColor, identity: char.identity, sceneSetting: char.sceneSetting, languageStyle: char.languageStyle, behaviorRules: char.behaviorRules });
    setShowEditDialog(true);
  }, []);

  const handleCreateCharacter = useCallback(() => {
    setEditingCharacter({ name: '', subtitle: '', avatarColor: '#6c5ce7', identity: '', sceneSetting: '', languageStyle: '', behaviorRules: '' });
    setShowEditDialog(true);
  }, []);

  const handleSaveCharacter = useCallback(async (data: CharacterEditData, isNew: boolean) => {
    const systemPrompt = `Reply to me in Chinese only!\n${data.identity}\n\n${data.sceneSetting}\n\n${data.languageStyle}\n\n${data.behaviorRules}\n\n重要规则：\n- 始终保持角色人设，不要脱离角色\n- 回复字数控制在20-50字之间\n- 每条回复开头用 [情绪:xxx|强度] 格式标注当前情绪`;
    if (isNew) {
      await characterChatApi.createCharacter({ name: data.name, avatarColor: data.avatarColor, subtitle: data.subtitle, identity: data.identity, sceneSetting: data.sceneSetting, languageStyle: data.languageStyle, behaviorRules: data.behaviorRules, systemPrompt, isPreset: false });
    } else if (activeCharacter) {
      await characterChatApi.updateCharacter(activeCharacter.id, { name: data.name, avatarColor: data.avatarColor, subtitle: data.subtitle, identity: data.identity, sceneSetting: data.sceneSetting, languageStyle: data.languageStyle, behaviorRules: data.behaviorRules, systemPrompt });
    }
    await loadCharacters();
  }, [activeCharacter, loadCharacters]);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 min-w-[256px] border-r border-gray-200/60 dark:border-white/10 bg-white/40 dark:bg-white/5 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200/60 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#6c5ce7]" />
            <h1 className="text-sm font-bold text-gray-800 dark:text-gray-200">AI 角色对话</h1>
          </div>
        </div>

        {/* Character list */}
        <div className="p-3 border-b border-gray-200/60 dark:border-white/10">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs uppercase tracking-wider text-gray-400 dark:text-white/40">角色</h2>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/80" onClick={handleCreateCharacter}><Plus className="w-3.5 h-3.5" /></Button>
          </div>
          <div className="flex flex-col gap-0.5">
            {characters.map(char => (
              <div key={char.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors group ${activeCharacter?.id === char.id ? 'bg-gray-100 dark:bg-white/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                <button onClick={() => selectCharacter(char)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
                  <CharacterAvatar character={char} size={32} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate text-gray-800 dark:text-gray-200">{char.name}</div>
                    {char.subtitle && <div className="text-[11px] text-gray-400 dark:text-white/40 truncate">{char.subtitle}</div>}
                  </div>
                </button>
                <button onClick={() => handleEditCharacter(char)} className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-white/40 hover:text-[#6c5ce7] dark:hover:text-[#a29bfe] flex-shrink-0 transition-opacity"><Pencil className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between px-1 mb-1">
            <h2 className="text-xs uppercase tracking-wider text-gray-400 dark:text-white/40">对话</h2>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 dark:text-white/40" onClick={handleNewConversation} disabled={!activeCharacter}><Plus className="w-3.5 h-3.5" /></Button>
          </div>
          {conversations.map(conv => (
            <button key={conv.id} onClick={() => selectConversation(conv)} className={`w-full text-left px-2.5 py-2 rounded-lg mb-0.5 transition-colors group ${activeConversation?.id === conv.id ? 'bg-[#6c5ce7] text-white' : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-white/70'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] truncate flex-1">{conv.title}</span>
                <button onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }} className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-white/40 hover:text-red-500 ml-1"><Trash2 className="w-3 h-3" /></button>
              </div>
              <div className="text-[11px] opacity-60 mt-0.5">{conv.messageCount} 条消息</div>
            </button>
          ))}
        </div>

        {/* Bottom nav */}
        <div className="border-t border-gray-200/60 dark:border-white/10 p-2">
          <button onClick={() => setShowModelSettings(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-gray-500 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white/80 transition-colors w-full">
            <Settings className="w-4 h-4" />模型配置
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
                <span className="text-[12px] text-gray-400 dark:text-white/40">{activeCharacter.subtitle}{activeConversation && ` · ${activeConversation.title}`}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {activeConversation && messages.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 text-gray-400 dark:text-white/50 hover:text-[#6c5ce7]" onClick={handleExportConversation} title="导出对话记录"><Download className="w-4 h-4" /></Button>
                )}
                <ModelDropdown category={["text", "vision"]} selectedModel={selectedModel} onModelChange={handleModelChange} />
              </div>
              {isStreaming && (
                <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={stopStreaming}><Square className="w-3 h-3 mr-1" />终止</Button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {!activeConversation && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-white/20 gap-3">
                  <MessageSquare className="w-12 h-12" />
                  <p className="text-sm text-gray-400 dark:text-gray-300">选择一个对话或创建新对话开始聊天</p>
                  <Button variant="outline" onClick={handleNewConversation}><Plus className="w-4 h-4 mr-1" />新建对话</Button>
                </div>
              )}
              {activeConversation && messages.map(msg => <MessageBubble key={msg.id} message={msg} character={activeCharacter} />)}
              {thinkingStatus && (
                <div className="flex gap-2.5 max-w-[75%] self-start">
                  <CharacterAvatar character={activeCharacter} size={28} />
                  <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white/60 dark:bg-[#1e2233] border border-gray-200/60 dark:border-white/10 text-sm text-gray-500 dark:text-white/50">{thinkingStatus.message}</div>
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
                  <Textarea ref={textareaRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder={`给${activeCharacter.name}发消息…`} className="flex-1 bg-white/70 dark:bg-[#222633] border-gray-200/60 dark:border-white/10 text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 resize-none min-h-[42px] max-h-[120px] focus:border-[#6c5ce7]" rows={1} disabled={isStreaming} />
                  <Button onClick={handleSend} disabled={!inputValue.trim() || isStreaming} className="w-[42px] h-[42px] p-0 bg-[#6c5ce7] hover:bg-[#a29bfe] rounded-xl flex-shrink-0">
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
            {isLoading && <Loader2 className="w-6 h-6 animate-spin text-[#6c5ce7]" />}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AnimatePresence>
        <CharacterEditDialog character={editingCharacter} isOpen={showEditDialog} onClose={() => { setShowEditDialog(false); setEditingCharacter(null); }} onSave={handleSaveCharacter} />
      </AnimatePresence>
      <AnimatePresence>
        <ModelSettingsDialog isOpen={showModelSettings} onClose={() => setShowModelSettings(false)} />
      </AnimatePresence>
    </div>
  );
}
