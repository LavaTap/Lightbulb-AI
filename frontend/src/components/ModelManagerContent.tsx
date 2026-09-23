import { useState, useEffect } from 'react';
import { Bot, Check, Loader2, Trash2, X, Pencil } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useApiConfig } from '@/hooks/useApiConfig';
import type { APIConfig, ModelCategory, ProviderInfo } from '@/types';
import { cn } from '@/lib/utils';

// 模型定义
const PROVIDERS: ProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', category: 'vision', capabilities: ['vision', 'text'], description: '最新多模态模型' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', category: 'vision', capabilities: ['vision', 'text'], description: '轻量多模态模型' },
      { id: 'gpt-4.1', name: 'GPT-4.1', category: 'vision', capabilities: ['vision', 'text'], description: '最新GPT-4系列' },
      { id: 'dall-e-3', name: 'DALL-E 3', category: 'text-to-image', capabilities: ['image-generation'], description: 'OpenAI图像生成' },
      { id: 'gpt-image-1', name: 'GPT Image 1', category: 'image-to-image', capabilities: ['image-generation', 'image-editing'], description: '图像生成/编辑' },
      // 纯文本模型
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', category: 'text', capabilities: ['text'], description: 'GPT-4 纯文本版' },
      { id: 'o1', name: 'o1', category: 'text', capabilities: ['text', 'reasoning'], description: '推理增强模型' },
      { id: 'o3-mini', name: 'o3 Mini', category: 'text', capabilities: ['text', 'reasoning'], description: '高效推理模型' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', category: 'text', capabilities: ['text'], description: '经典文本模型' },
    ],
  },
  {
    id: 'google',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', category: 'vision', capabilities: ['vision', 'text'], description: '高速多模态' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', category: 'vision', capabilities: ['vision', 'text'], description: '高性能多模态' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', category: 'vision', capabilities: ['vision', 'text'], description: '快速推理' },
      { id: 'imagen-3', name: 'Imagen 3', category: 'text-to-image', capabilities: ['image-generation'], description: 'Google图像生成' },
      { id: 'imagen-4', name: 'Imagen 4', category: 'text-to-image', capabilities: ['image-generation'], description: '最新图像生成' },
      // 纯文本模型
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', category: 'text', capabilities: ['text'], description: '超快纯文本' },
      { id: 'gemini-2.5-pro-lite', name: 'Gemini 2.5 Pro Lite', category: 'text', capabilities: ['text'], description: '高效纯文本' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', category: 'text', capabilities: ['text'], description: '通用文本模型' },
      { id: 'deepseek-r1', name: 'DeepSeek R1', category: 'text', capabilities: ['text', 'reasoning'], description: '推理增强模型' },
      { id: 'janus-pro', name: 'Janus-Pro', category: 'vision', capabilities: ['vision', 'text', 'image-generation'], description: '原生多模态' },
      // 新增纯文本
      { id: 'deepseek-coder', name: 'DeepSeek Coder', category: 'text', capabilities: ['text', 'code'], description: '代码专用模型' },
    ],
  },
  {
    id: 'aliyun',
    name: '阿里云 通义千问',
    models: [
      { id: 'qwen-vl-max', name: 'Qwen-VL-Max', category: 'vision', capabilities: ['vision', 'text'], description: '视觉大模型' },
      { id: 'qwen-vl-plus', name: 'Qwen-VL-Plus', category: 'vision', capabilities: ['vision', 'text'], description: '轻量视觉' },
      { id: 'wanx-v1', name: 'Wanx v1', category: 'image-to-image', capabilities: ['image-generation', 'image-editing'], description: '通义万相' },
      { id: 'wanx2.1', name: 'Wanx 2.1', category: 'text-to-image', capabilities: ['image-generation'], description: '新一代图像生成' },
      // 纯文本模型
      { id: 'qwen-max', name: 'Qwen Max', category: 'text', capabilities: ['text'], description: '通义千问旗舰' },
      { id: 'qwen-plus', name: 'Qwen Plus', category: 'text', capabilities: ['text'], description: '通义千问增强' },
      { id: 'qwen-turbo', name: 'Qwen Turbo', category: 'text', capabilities: ['text'], description: '通义千问极速' },
      { id: 'qwen-coder-plus', name: 'Qwen Coder Plus', category: 'text', capabilities: ['text', 'code'], description: '代码专用' },
    ],
  },
  {
    id: 'bytedance',
    name: '字节跳动 豆包',
    models: [
      { id: 'doubao-pro-32k', name: '豆包 Pro-32K', category: 'text', capabilities: ['text'], description: '长文本处理' },
      { id: 'doubao-vision', name: '豆包 Vision', category: 'vision', capabilities: ['vision', 'text'], description: '多模态理解' },
      { id: 'seedance', name: 'Seedance', category: 'text-to-image', capabilities: ['image-generation'], description: '视频/图像生成' },
      // 纯文本模型
      { id: 'doubao-lite-32k', name: '豆包 Lite-32K', category: 'text', capabilities: ['text'], description: '轻量长文本' },
      { id: 'doubao-pro-128k', name: '豆包 Pro-128K', category: 'text', capabilities: ['text'], description: '超长文本处理' },
    ],
  },
  {
    id: 'baidu',
    name: '百度 文心一言',
    models: [
      { id: 'ernie-4.0', name: '文心 4.0', category: 'text', capabilities: ['text'], description: '文心大模型' },
      { id: 'ernie-4-vision', name: '文心 4 Vision', category: 'vision', capabilities: ['vision', 'text'], description: '文心多模态' },
      { id: 'ernie-vilg', name: '文心一格', category: 'text-to-image', capabilities: ['image-generation'], description: 'AI绘画' },
      // 纯文本模型
      { id: 'ernie-4.0-turbo', name: '文心 4.0 Turbo', category: 'text', capabilities: ['text'], description: '高速文心' },
      { id: 'ernie-speed', name: '文心 Speed', category: 'text', capabilities: ['text'], description: '极速文心' },
      { id: 'ernie-lite', name: '文心 Lite', category: 'text', capabilities: ['text'], description: '轻量文心' },
    ],
  },
  {
    id: 'xfyun',
    name: '讯飞星火',
    models: [
      { id: 'xunfeispark-4.0-ultra', name: '星火 4.0 Ultra', category: 'text', capabilities: ['text'], description: '讯飞旗舰' },
      { id: 'spark4-vision', name: '星火 4 Vision', category: 'vision', capabilities: ['vision', 'text'], description: '讯飞多模态' },
      // 纯文本模型
      { id: 'spark-4.0-pro', name: '星火 4.0 Pro', category: 'text', capabilities: ['text'], description: '讯飞专业版' },
      { id: 'spark-4.0-lite', name: '星火 4.0 Lite', category: 'text', capabilities: ['text'], description: '讯飞轻量版' },
      { id: 'spark-3.5', name: '星火 3.5', category: 'text', capabilities: ['text'], description: '讯飞经典版' },
    ],
  },
  {
    id: 'tencent',
    name: '腾讯云 混元',
    models: [
      { id: 'hy-image-lite', name: '混元生图 Lite', category: 'text-to-image', capabilities: ['image-generation'], description: '极速文生图' },
      { id: 'hy-image-v3.0', name: '混元生图 3.0', category: ['text-to-image', 'image-to-image'], capabilities: ['image-generation', 'image-editing'], description: '文生图/图生图' },
    ],
  },
  {
    id: 'gptimage2',
    name: 'GPT Image 2',
    models: [
      { id: 'gpt-image-2', name: 'GPT Image 2', category: ['text-to-image', 'image-to-image'], capabilities: ['image-generation', 'image-editing'], description: 'OpenAI 图像生成/编辑' },
    ],
  },
  {
    id: 'custom',
    name: '自定义',
    models: [],
  },
];

// 类型选项
const CATEGORY_OPTIONS = [
  { value: 'vision', label: '视觉分析 (Vision)', color: 'purple' },
  { value: 'text-to-image', label: '文生图 (Text to Image)', color: 'green' },
  { value: 'image-to-image', label: '图生图 (Image to Image)', color: 'orange' },
  { value: 'text', label: '纯文本 (Text Only)', color: 'blue' },
];

interface ModelManagerContentProps {
  onClose: () => void;
}

export function ModelManagerContent({ onClose }: ModelManagerContentProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('custom');
  const [configName, setConfigName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('');
  const [useProxy, setUseProxy] = useState(false);
  const [proxyEndpoint, setProxyEndpoint] = useState('');
  const [category, setCategory] = useState<ModelCategory[]>(['vision']);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  // 已保存配置的测试状态（按 config.id 索引）
  const [configTestMap, setConfigTestMap] = useState<Record<number, { loading: boolean; result: { success: boolean; message: string } | null }>>({});

  // 编辑模式状态
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editCategory, setEditCategory] = useState<ModelCategory[]>(['vision']);
  const [savingEdit, setSavingEdit] = useState(false);

  const {
    modelConfigs,
    configs,
    updateConfig,
    switchProvider,
    saveToModelManager,
    deleteModelConfig,
    updateModelConfig,
    testConnection,
    detectCapabilities,
    reloadModelConfigs,
  } = useApiConfig();

  // 初始加载配置列表
  useEffect(() => {
    reloadModelConfigs();
  }, [reloadModelConfigs]);

  const loadConfig = (provider: string) => {
    setSelectedProvider(provider);
    const config = configs[provider as keyof typeof configs];
    if (config) {
      setApiKey(config.apiKey);
      setEndpoint(config.endpoint);
      setModel(config.model);
      setUseProxy(config.useProxy);
      setProxyEndpoint(config.proxyEndpoint);
    }
    setTestResult(null);
  };

  const handleModelChange = (modelId: string) => {
    setModel(modelId);
    const provider = PROVIDERS.find(p => p.id === selectedProvider);
    const modelInfo = provider?.models.find(m => m.id === modelId);
    if (modelInfo) {
      // 统一为数组格式
      setCategory(Array.isArray(modelInfo.category) ? modelInfo.category : [modelInfo.category]);
    } else if (selectedProvider === 'custom') {
      // 自定义模式下保持用户选择的类型不变
    }
  };

  const handleTest = async () => {
    if (!apiKey || !model) return;

    setTesting(true);
    setTestResult(null);

    const timeoutHint = setTimeout(() => {
      setTestResult({ success: false, message: '连接测试耗时较长，请耐心等待...' });
    }, 10000);

    try {
      const result = await testConnection({
        provider: selectedProvider,
        apiKey,
        model,
        endpoint: selectedProvider === 'custom' ? endpoint : undefined,
        useProxy,
        proxyEndpoint: useProxy ? proxyEndpoint : undefined,
      });
      clearTimeout(timeoutHint);
      setTestResult({ success: result.success, message: result.message });
    } catch (e: any) {
      clearTimeout(timeoutHint);
      setTestResult({ success: false, message: e?.message || '连接测试失败，请检查网络设置' });
    }
    setTesting(false);
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      let detectedCategories = [...category];
      let detectedCapabilities: string[] = [];

      if (apiKey && selectedProvider !== 'custom') {
        setDetecting(true);
        try {
          const detectResult = await detectCapabilities({
            provider: selectedProvider,
            apiKey,
            model,
            endpoint: selectedProvider === 'custom' ? endpoint : undefined,
            useProxy,
            proxyEndpoint: useProxy ? proxyEndpoint : undefined,
          });

          if (detectResult.success && detectResult.data) {
            // 将检测到的类别合并到已有选择中
            const detectedCat = detectResult.data.category;
            if (!detectedCategories.includes(detectedCat)) {
              detectedCategories.push(detectedCat);
            }
            detectedCapabilities = detectResult.data.capabilities;
            setCategory(detectedCategories);
          }
        } catch (e) {
          console.error('Failed to detect:', e);
        }
        setDetecting(false);
      }

      await saveToModelManager(
        configName || selectedProvider + '-' + model,
        selectedProvider,
        model,
        apiKey,
        endpoint,
        useProxy,
        proxyEndpoint,
        detectedCategories.length > 1 ? detectedCategories : detectedCategories[0],
        detectedCapabilities,
        false
      );

      const config: APIConfig = {
        provider: selectedProvider as APIConfig['provider'],
        apiKey,
        endpoint,
        model,
        useProxy,
        proxyEndpoint,
      };
      updateConfig(selectedProvider, config);

      setConfigName('');
      setTestResult(null);
      reloadModelConfigs();
    } catch (e: any) {
      console.error('Save failed:', e);
      setTestResult({ success: false, message: `保存失败: ${e?.message || '未知错误'}` });
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个模型配置吗？')) {
      await deleteModelConfig(id);
      // 清除该配置的测试状态
      setConfigTestMap(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  // 测试已保存的配置连接
  const handleTestSavedConfig = async (config: any) => {
    if (!config.apiKey) {
      setConfigTestMap(prev => ({
        ...prev,
        [config.id]: { loading: false, result: { success: false, message: 'API Key 未配置，请编辑配置填写 Key 后再测试' } },
      }));
      return;
    }

    setConfigTestMap(prev => ({
      ...prev,
      [config.id]: { loading: true, result: null },
    }));

    const timeoutHint = setTimeout(() => {
      setConfigTestMap(prev => ({
        ...prev,
        [config.id]: { loading: true, result: { success: false, message: '连接测试耗时较长，请耐心等待...' } },
      }));
    }, 10000);

    try {
      const result = await testConnection({
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model,
        endpoint: config.endpoint,
        useProxy: config.useProxy,
        proxyEndpoint: config.proxyEndpoint,
      });

      clearTimeout(timeoutHint);
      setConfigTestMap(prev => ({
        ...prev,
        [config.id]: { loading: false, result: { success: result.success, message: result.message } },
      }));
    } catch (e: any) {
      clearTimeout(timeoutHint);
      setConfigTestMap(prev => ({
        ...prev,
        [config.id]: { loading: false, result: { success: false, message: e?.message || '连接测试失败' } },
      }));
    }
  };

  // 开始编辑配置
  const handleStartEdit = (config: any) => {
    setEditingId(config.id);
    setEditName(config.name);
    setEditModel(config.model);
    setEditCategory(Array.isArray(config.category) ? config.category : [config.category]);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditModel('');
    setEditCategory(['vision']);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingId || !editModel) return;
    
    setSavingEdit(true);
    try {
      await updateModelConfig(editingId, {
        name: editName,
        model: editModel,
        category: editCategory,
      });
      handleCancelEdit();
    } catch (e) {
      console.error('Update failed:', e);
    }
    setSavingEdit(false);
  };

  return (
    <div className="flex flex-col space-y-1.5 text-center sm:text-left">
      <DialogTitle className="text-2xl flex items-center gap-2">
        <Bot className="w-6 h-6" />
        模型管理
        <button onClick={onClose} className="ml-auto">
          <X className="w-5 h-5" />
        </button>
      </DialogTitle>
      <DialogDescription>
        管理 AI 模型配置，支持自动检测模型能力
      </DialogDescription>

      <Tabs defaultValue="configs" className="w-full mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configs">已保存配置</TabsTrigger>
          <TabsTrigger value="add">添加新配置</TabsTrigger>
        </TabsList>

        {/* Saved Configs Tab */}
        <TabsContent value="configs" className="mt-4 space-y-4">
          <div className="space-y-3 max-h-[450px] overflow-y-auto">
            {modelConfigs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">暂无保存的配置</p>
            ) : (
              modelConfigs.map((config) => (
                <Card key={config.id} className={cn(
                  "transition-all",
                  editingId === config.id && "ring-2 ring-primary/50 bg-primary/5"
                )}>
                  <CardContent className="py-3">
                    {editingId === config.id ? (
                      // 编辑模式
                      <div className="space-y-3">
                        {/* 编辑名称 */}
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">配置名称</Label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="输入名称"
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        {/* 编辑模型 */}
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">模型 ID</Label>
                          <Input
                            value={editModel}
                            onChange={(e) => setEditModel(e.target.value)}
                            placeholder="输入或修改模型 ID"
                            className="h-8 text-sm"
                          />
                        </div>

                        {/* 编辑类型 - 多选 Checkbox */}
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">
                            类型（可多选，最多 3 种）
                          </Label>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {CATEGORY_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  if (editCategory.includes(opt.value as ModelCategory)) {
                                    setEditCategory(editCategory.filter(c => c !== opt.value));
                                  } else if (editCategory.length < 3) {
                                    setEditCategory([...editCategory, opt.value as ModelCategory]);
                                  }
                                }}
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-xs border transition-colors",
                                  editCategory.includes(opt.value as ModelCategory)
                                    ? `bg-${opt.color}-100 text-${opt.color}-700 dark:bg-${opt.color}-900/30 dark:text-${opt.color}-400 border-${opt.color}-300`
                                    : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
                                )}
                              >
                                {editCategory.includes(opt.value as ModelCategory) && (
                                  <Check className="w-3 h-3 inline mr-0.5" />
                                )}
                                {opt.label.split(' ')[0]}
                              </button>
                            ))}
                          </div>
                          {editCategory.length >= 3 && (
                            <p className="text-xs text-amber-500">已达上限 3 种类型</p>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="flex-1"
                          >
                            取消
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={!editModel || savingEdit}
                            className="flex-1"
                          >
                            {savingEdit ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                            保存
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // 显示模式
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm">{config.name}</h3>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleTestSavedConfig(config)}
                              disabled={configTestMap[config.id]?.loading}
                              className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                              title="测试连接"
                            >
                              {configTestMap[config.id]?.loading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleStartEdit(config)}
                              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title="编辑"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(config.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
                          <span>服务商: {PROVIDERS.find(p => p.id === config.provider)?.name}</span>
                          <span>模型: {config.model}</span>
                        </div>
                        {/* 类型标签 - 支持多选显示 */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(Array.isArray(config.category) ? config.category : [config.category]).map((cat) => {
                            const opt = CATEGORY_OPTIONS.find(o => o.value === cat);
                            return (
                              <span
                                key={cat}
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-xs",
                                  cat === 'vision'
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                    : cat === 'text-to-image'
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : cat === 'image-to-image'
                                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                )}
                              >
                                {opt ? opt.label.split(' ')[0] : cat}
                              </span>
                            );
                          })}
                        </div>
                        {/* 测试结果显示 */}
                        {configTestMap[config.id]?.result && (
                          <div className={cn(
                            "mt-2 p-2 rounded-md text-xs",
                            configTestMap[config.id].result!.success
                              ? "bg-green-50 text-green-700 dark:bg-green-900/15 dark:text-green-400"
                              : "bg-red-50 text-red-700 dark:bg-red-900/15 dark:text-red-400"
                          )}>
                            {configTestMap[config.id].result!.message}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Add New Config Tab */}
        <TabsContent value="add" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">服务商</Label>
              <Select value={selectedProvider} onValueChange={(v) => { loadConfig(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">配置名称（可选）</Label>
              <Input value={configName} onChange={(e) => setConfigName(e.target.value)} placeholder="如: my-gpt4o" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">
              {selectedProvider === 'custom' ? '模型 ID' : '选择模型'}
            </Label>
            {selectedProvider === 'custom' ? (
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="输入自定义模型 ID，如: gpt-4o、claude-3.5-sonnet..."
                className="h-9 text-sm"
              />
            ) : (
              <Select value={model} onValueChange={handleModelChange}>
                <SelectTrigger><SelectValue placeholder="选择或输入模型" /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.find(p => p.id === selectedProvider)?.models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} - {m.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 自定义模式：手动选择类型（多选） */}
          {selectedProvider === 'custom' && (
            <div className="space-y-2">
              <Label>选择类型（可多选，最多 3 种）</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (category.includes(opt.value as ModelCategory)) {
                        setCategory(category.filter(c => c !== opt.value));
                      } else if (category.length < 3) {
                        setCategory([...category, opt.value as ModelCategory]);
                      }
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs border transition-all",
                      category.includes(opt.value as ModelCategory)
                        ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 border-primary-300 shadow-sm"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
                    )}
                  >
                    {category.includes(opt.value as ModelCategory) && (
                      <Check className="w-3 h-3 inline mr-0.5" />
                    )}
                    {opt.label.split(' ')[0]}
                  </button>
                ))}
              </div>
              {category.length >= 3 ? (
                <p className="text-xs text-amber-500">已达上限 3 种类型</p>
              ) : (
                <p className="text-xs text-gray-500">
                  提示：如果不确定模型能力，可以先测试连接后系统会自动识别
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="输入 API Key" />
          </div>

          {selectedProvider === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="endpoint">API 端点（可选）</Label>
              <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://api.example.com/v1" />
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <Label htmlFor="proxy" className="cursor-pointer">使用代理</Label>
            <Switch checked={useProxy} onCheckedChange={setUseProxy} />
          </div>

          {useProxy && (
            <div className="space-y-2">
              <Label htmlFor="proxyEndpoint">代理地址</Label>
              <Input value={proxyEndpoint} onChange={(e) => setProxyEndpoint(e.target.value)} placeholder="https://proxy.example.com/v1" />
            </div>
          )}

          {/* Test & Save Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={!apiKey || !model}
              className="flex-1"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              测试连接
            </Button>
            <Button
              onClick={executeSave}
              disabled={!model}
              className="flex-1"
            >
              {saving || detecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {detecting ? '检测中...' : saving ? '保存中...' : '保存'}
            </Button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              testResult.success ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            )}>
              {testResult.message}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
