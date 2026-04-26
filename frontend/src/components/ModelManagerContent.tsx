import { useState, useEffect } from 'react';
import { Bot, Check, Loader2, Trash2, X } from 'lucide-react';
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
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', category: 'text-to-image', capabilities: ['text'], description: '文本模型' },
      { id: 'deepseek-r1', name: 'DeepSeek R1', category: 'text-to-image', capabilities: ['text'], description: '推理增强' },
      { id: 'janus-pro', name: 'Janus-Pro', category: 'vision', capabilities: ['vision', 'text', 'image-generation'], description: '原生多模态' },
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
    ],
  },
  {
    id: 'bytedance',
    name: '字节跳动 豆包',
    models: [
      { id: 'doubao-pro-32k', name: '豆包 Pro-32K', category: 'text-to-image', capabilities: ['text'], description: '长文本处理' },
      { id: 'doubao-vision', name: '豆包 Vision', category: 'vision', capabilities: ['vision', 'text'], description: '多模态理解' },
      { id: 'seedance', name: 'Seedance', category: 'text-to-image', capabilities: ['image-generation'], description: '视频/图像生成' },
    ],
  },
  {
    id: 'baidu',
    name: '百度 文心一言',
    models: [
      { id: 'ernie-4.0', name: '文心 4.0', category: 'text-to-image', capabilities: ['text'], description: '文心大模型' },
      { id: 'ernie-4-vision', name: '文心 4 Vision', category: 'vision', capabilities: ['vision', 'text'], description: '文心多模态' },
      { id: 'ernie-vilg', name: '文心一格', category: 'text-to-image', capabilities: ['image-generation'], description: 'AI绘画' },
    ],
  },
  {
    id: 'xfyun',
    name: '讯飞星火',
    models: [
      { id: 'xunfeispark-4.0-ultra', name: '星火 4.0 Ultra', category: 'text-to-image', capabilities: ['text'], description: '讯飞旗舰' },
      { id: 'spark4-vision', name: '星火 4 Vision', category: 'vision', capabilities: ['vision', 'text'], description: '讯飞多模态' },
    ],
  },
  {
    id: 'custom',
    name: '自定义',
    models: [],
  },
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
  const [category, setCategory] = useState<ModelCategory>('vision');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const {
    modelConfigs,
    configs,
    updateConfig,
    switchProvider,
    saveToModelManager,
    deleteModelConfig,
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
      setCategory(modelInfo.category);
    } else if (selectedProvider === 'custom') {
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

  const executeSave = async () => {
    setSaving(true);
    try {
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
            setCategory(detectedCategory);
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
        detectedCategory,
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
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个模型配置吗？')) {
      await deleteModelConfig(id);
    }
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
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {modelConfigs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">暂无保存的配置</p>
            ) : (
              modelConfigs.map((config) => (
                <Card key={config.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{config.name}</h3>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-gray-600 dark:text-gray-400">
                      <span>服务商: {PROVIDERS.find(p => p.id === config.provider)?.name}</span>
                      <span>模型: {config.model}</span>
                      <span>类型: {config.category === 'vision' ? '多模态' : config.category === 'text-to-image' ? '文生图' : '图生图'}</span>
                    </div>
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
            <Label htmlFor="model">选择模型</Label>
            <Select value={model} onValueChange={handleModelChange}>
              <SelectTrigger><SelectValue placeholder="选择或输入模型" /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.find(p => p.id === selectedProvider)?.models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name} - {m.description}</SelectItem>
                ))}
                {selectedProvider === 'custom' && (
                  <input
                    className="w-full px-2 py-1.5 text-sm border-t"
                    placeholder="输入自定义模型 ID"
                    onChange={(e) => setModel(e.target.value)}
                  />
                )}
              </SelectContent>
            </Select>
          </div>

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
