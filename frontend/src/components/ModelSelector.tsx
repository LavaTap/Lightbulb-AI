import { useState, useEffect } from 'react';
import { Bot, Check, Loader2, Trash2, AlertCircle } from 'lucide-react';
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
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useApiConfig } from '@/hooks/useApiConfig';
import type { APIConfig, ModelCategory, ProviderInfo } from '@/types';
import { cn } from '@/lib/utils';

// Latest model definitions with capabilities
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

interface ModelSelectorProps {
  trigger?: React.ReactNode;
}

export function ModelSelector({ trigger }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const {
    modelConfigs,
    activeModelConfig,
    currentProvider,
    configs,
    updateConfig,
    switchProvider,
    saveToModelManager,
    deleteModelConfig,
    testConnection,
    detectCapabilities,
    reloadModelConfigs,
  } = useApiConfig();

  const [selectedProvider, setSelectedProvider] = useState(currentProvider);
  const [configName, setConfigName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('');
  const [useProxy, setUseProxy] = useState(false);
  const [proxyEndpoint, setProxyEndpoint] = useState('');
  const [category, setCategory] = useState<ModelCategory | ModelCategory[]>('vision');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCustomWarning, setShowCustomWarning] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    if (open) {
      reloadModelConfigs();
    }
  }, [open, reloadModelConfigs]);

  const loadConfig = (provider: string) => {
    setSelectedProvider(provider);
    const config = configs[provider];
    if (config) {
      setApiKey(config.apiKey);
      setEndpoint(config.endpoint);
      setModel(config.model);
      setUseProxy(config.useProxy);
      setProxyEndpoint(config.proxyEndpoint);
    } else {
      setApiKey('');
      setEndpoint('');
      setModel('');
      setUseProxy(false);
      setProxyEndpoint('');
    }
    setTestResult(null);
  };

  const handleProviderChange = (provider: string) => {
    loadConfig(provider);
  };

  const handleModelChange = (modelId: string) => {
    setModel(modelId);
    // Auto-set category based on model
    const provider = PROVIDERS.find(p => p.id === selectedProvider);
    const modelInfo = provider?.models.find(m => m.id === modelId);
    if (modelInfo) {
      setCategory(modelInfo.category);
    } else if (selectedProvider === 'custom') {
      // 自定义模型默认设为 vision
      setCategory('vision');
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

  const handleSave = async () => {
    if (!configName || !selectedProvider || !model) return;
    if (selectedProvider === 'custom') {
      setShowCustomWarning(true);
      return;
    }
    await executeSave();
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      // 自动检测模型能力（如果有 API Key）
      let detectedCategory = category;
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
            detectedCategory = detectResult.data.category;
            detectedCapabilities = detectResult.data.capabilities;
            // 自动设置检测到的类型
            setCategory(detectedCategory);
            console.log('[ModelSelector] Detected capabilities:', detectedCapabilities, 'category:', detectedCategory);
          }
        } catch (e) {
          console.error('[ModelSelector] Failed to detect capabilities:', e);
          // 检测失败时使用预设的类型
        }
        setDetecting(false);
      }
      
      await saveToModelManager(
        configName,
        selectedProvider,
        model,
        apiKey,
        endpoint,
        useProxy,
        proxyEndpoint,
        detectedCategory,
        detectedCapabilities,
        false
      );
      
      // Also update localStorage for backward compatibility
      const config: APIConfig = {
        provider: selectedProvider as APIConfig['provider'],
        apiKey,
        endpoint,
        model,
        useProxy,
        proxyEndpoint,
      };
      updateConfig(selectedProvider, config);
      
      setOpen(false);
      setConfigName('');
      setTestResult(null);
      setShowCustomWarning(false);
    } catch (e: any) {
      console.error('Failed to save:', e);
      setTestResult({ success: false, message: `保存失败: ${e?.message || '未知错误'}` });
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个模型配置吗？')) {
      await deleteModelConfig(id);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      const { activateModelConfig } = await import('@/services/storage');
      await activateModelConfig(id);
      await reloadModelConfigs();
    } catch (e) {
      console.error('Failed to activate:', e);
    }
  };

  const currentProviderInfo = PROVIDERS.find(p => p.id === currentProvider);
  const displayModel = configs[currentProvider]?.model || '未配置';

  const selectedProviderInfo = PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">{currentProviderInfo?.name || '选择模型'}</span>
            <span className="text-xs bg-primary-100 dark:bg-primary-900 px-2 py-0.5 rounded-full text-primary-600 dark:text-primary-300">
              {displayModel}
            </span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Bot className="w-6 h-6" />
            模型管理
          </DialogTitle>
          <DialogDescription>
            管理 AI 模型配置。若连接失败可尝试自定义配置端点后测试连通性
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="configs" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="configs">已保存配置</TabsTrigger>
            <TabsTrigger value="add">添加新配置</TabsTrigger>
          </TabsList>

          {/* Saved Configs Tab */}
          <TabsContent value="configs" className="space-y-4 mt-4">
            {modelConfigs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>暂无保存的模型配置</p>
                  <p className="text-sm mt-1">点击"添加新配置"开始添加</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {modelConfigs.map((config) => (
                  <Card key={config.id} className={cn(
                    config.isActive && "border-green-500 bg-green-50/50 dark:bg-green-900/20"
                  )}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{config.name}</span>
                          {config.isActive && (
                            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                              使用中
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(config.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex gap-4">
                        <span>服务商: {PROVIDERS.find(p => p.id === config.provider)?.name || config.provider}</span>
                        <span>模型: {config.model}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(Array.isArray(config.category) ? config.category : [config.category]).map((cat) => {
                          const labels: Record<string, string> = {
                            vision: '视觉',
                            'text-to-image': '文生图',
                            'image-to-image': '图生图',
                            text: '纯文本',
                          };
                          return (
                            <span key={cat} className={cn(
                              "px-1.5 py-0.5 rounded text-xs",
                              cat === 'vision' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                              : cat === 'text-to-image' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : cat === 'image-to-image' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            )}>
                              {labels[cat] || cat}
                            </span>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Add New Config Tab */}
          <TabsContent value="add" className="space-y-4 mt-4">
            {/* Config Name */}
            <div className="space-y-2">
              <Label htmlFor="configName">配置名称</Label>
              <Input
                id="configName"
                placeholder="例如：我的GPT-4o配置"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
              />
            </div>

            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>服务商</Label>
              <Select value={selectedProvider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="输入 API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">模型</Label>
              {selectedProvider === 'custom' ? (
                <Input
                  id="model"
                  placeholder="输入模型名称"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    if (e.target.value && !category) {
                      setCategory('vision');
                    }
                  }}
                />
              ) : (
                <Select value={model} onValueChange={handleModelChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProviderInfo?.models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div>
                          <div>{m.name}</div>
                          <div className="text-xs text-gray-500">{m.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Use Proxy */}
            <div className="flex items-center space-x-2">
              <Switch
                id="useProxy"
                checked={useProxy}
                onCheckedChange={setUseProxy}
              />
              <Label htmlFor="useProxy">使用代理</Label>
            </div>

            {/* Proxy Endpoint */}
            {useProxy && (
              <div className="space-y-2">
                <Label htmlFor="proxyEndpoint">代理地址</Label>
                <Input
                  id="proxyEndpoint"
                  placeholder="https://api.openai.com/v1"
                  value={proxyEndpoint}
                  onChange={(e) => setProxyEndpoint(e.target.value)}
                />
              </div>
            )}

            {/* Endpoint (for custom provider) */}
            {selectedProvider === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="endpoint">端点地址</Label>
                <Input
                  id="endpoint"
                  placeholder="https://api.example.com/v1"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                />
              </div>
            )}

            {/* Test Results */}
            {testResult && (
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                testResult.success ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
              )}>
                {testResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Vision Detection Result - removed */}

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || !apiKey || !model}
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                测试连接
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !configName || !selectedProvider || !model}
                className="flex-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                保存到模型管理
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Custom Mode Warning Dialog */}
      <Dialog open={showCustomWarning} onOpenChange={setShowCustomWarning}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="w-5 h-5" />
              自定义模式提醒
            </DialogTitle>
            <DialogDescription>
              您正在使用<strong>自定义</strong>模式添加模型配置。请确保所选模型的模态能力与使用场景匹配：
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2 p-2 rounded bg-blue-50 dark:bg-blue-900/20">
                <span className="text-xs font-mono bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded">vision</span>
                <span>多模态（图片分析/文字生成）→ 灵感提示</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-900/20">
                <span className="text-xs font-mono bg-green-100 dark:bg-green-800 px-1.5 py-0.5 rounded">text-to-image</span>
                <span>文生图 → 文生图</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-purple-50 dark:bg-purple-900/20">
                <span className="text-xs font-mono bg-purple-100 dark:bg-purple-800 px-1.5 py-0.5 rounded">image-to-image</span>
                <span>图生图 → 三视图/海报生成</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              模态不匹配可能导致功能异常，请确认模型支持对应能力后再保存。
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCustomWarning(false)}>
              返回修改
            </Button>
            <Button onClick={() => { setShowCustomWarning(false); executeSave(); }} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              确认保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
