import { useState, useEffect } from 'react';
import { Bot, Check, Loader2, Trash2, AlertCircle, Sparkles } from 'lucide-react';
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
      { id: 'gpt-4o', name: 'GPT-4o', category: 'vision', capabilities: ['vision', 'text'], description: '最新多模态模型，支持图片分析' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', category: 'vision', capabilities: ['vision', 'text'], description: '轻量多模态模型' },
      { id: 'dall-e-3', name: 'DALL-E 3', category: 'text-to-image', capabilities: ['image-generation'], description: 'OpenAI图像生成' },
      { id: 'gpt-image-1', name: 'GPT Image 1', category: 'image-to-image', capabilities: ['image-generation', 'image-editing'], description: '新一代图像生成模型' },
    ],
  },
  {
    id: 'google',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', category: 'vision', capabilities: ['vision', 'text'], description: '高速多模态模型' },
      { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro', category: 'vision', capabilities: ['vision', 'text'], description: '高性能多模态模型' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', category: 'vision', capabilities: ['vision', 'text'], description: '轻量快速多模态' },
      { id: 'imagen-3', name: 'Imagen 3', category: 'text-to-image', capabilities: ['image-generation'], description: 'Google高质量图像生成' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', category: 'vision', capabilities: ['text'], description: '纯文本模型，不支持Vision' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', category: 'text-to-image', capabilities: ['text'], description: '代码专用模型' },
    ],
  },
  {
    id: 'xfyun',
    name: '讯飞',
    models: [
      { id: 'qwen-vl-plus', name: 'Qwen-VL-Plus', category: 'vision', capabilities: ['vision', 'text'], description: '阿里通义千问多模态' },
      { id: 'qwen-vl-max', name: 'Qwen-VL-Max', category: 'vision', capabilities: ['vision', 'text'], description: '阿里通义千问增强版' },
      { id: 'qwen-image', name: 'Qwen-Image', category: 'text-to-image', capabilities: ['image-generation'], description: '阿里通义图像生成' },
      { id: 'wanx', name: 'Wanx', category: 'image-to-image', capabilities: ['image-generation', 'image-editing'], description: '阿里图像生成增强版' },
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
    detectVision,
    reloadModelConfigs,
  } = useApiConfig();

  const [selectedProvider, setSelectedProvider] = useState(currentProvider);
  const [configName, setConfigName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('');
  const [useProxy, setUseProxy] = useState(false);
  const [proxyEndpoint, setProxyEndpoint] = useState('');
  const [category, setCategory] = useState<ModelCategory>('vision');
  const [testing, setTesting] = useState(false);
  const [detectingVision, setDetectingVision] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [visionResult, setVisionResult] = useState<{ hasVision: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

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
    setVisionResult(null);
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
    
    try {
      const result = await testConnection({
        provider: selectedProvider,
        apiKey,
        model,
        endpoint: selectedProvider === 'custom' ? endpoint : undefined,
        useProxy,
        proxyEndpoint: useProxy ? proxyEndpoint : undefined,
      });
      setTestResult({ success: result.success, message: result.message });
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    }
    setTesting(false);
  };

  const handleDetectVision = async () => {
    if (!apiKey || !model) return;
    
    setDetectingVision(true);
    setVisionResult(null);
    
    try {
      const result = await detectVision({
        provider: selectedProvider,
        apiKey,
        model,
        endpoint: selectedProvider === 'custom' ? endpoint : undefined,
        useProxy,
        proxyEndpoint: useProxy ? proxyEndpoint : undefined,
      });
      setVisionResult({ hasVision: result.hasVision, message: result.message });
    } catch (e: any) {
      setVisionResult({ hasVision: false, message: e.message });
    }
    setDetectingVision(false);
  };

  const handleSave = async () => {
    if (!configName || !selectedProvider || !model) return;
    
    setSaving(true);
    try {
      await saveToModelManager(
        configName,
        selectedProvider,
        model,
        apiKey,
        endpoint,
        useProxy,
        proxyEndpoint,
        category,
        [],
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
      setVisionResult(null);
    } catch (e) {
      console.error('Failed to save:', e);
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
      await useApiConfig().then(ctx => ctx.reloadModelConfigs && null);
      // Trigger activation through API
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
            管理 AI 模型配置，支持真实 API 检测和多模态能力识别
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
                        <span>类型: {config.category === 'vision' ? '多模态' : config.category === 'text-to-image' ? '文生图' : '图生图'}</span>
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

            {/* Vision Detection Result */}
            {visionResult && (
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                visionResult.hasVision ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
              )}>
                <Sparkles className="w-4 h-4" />
                <span>{visionResult.message}</span>
              </div>
            )}

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
                variant="outline"
                onClick={handleDetectVision}
                disabled={detectingVision || !apiKey || !model}
              >
                {detectingVision ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                检测Vision能力
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
    </Dialog>
  );
}
