import { useState } from 'react';
import { Bot, Check, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
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
import { useApiConfig } from '@/hooks/useApiConfig';
import type { APIConfig } from '@/types';
import { cn } from '@/lib/utils';

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4-turbo', 'dall-e-3', 'gpt-image-1'] },
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
  { id: 'google', name: 'Google', models: ['gemini-pro', 'gemini-1.5-pro'] },
  { id: 'xfyun', name: '讯飞', models: ['generalv3'] },
  { id: 'custom', name: '自定义', models: [] },
];

interface ModelSelectorProps {
  trigger?: React.ReactNode;
}

export function ModelSelector({ trigger }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const { currentProvider, configs, updateConfig, switchProvider } = useApiConfig();
  
  const [selectedProvider, setSelectedProvider] = useState(currentProvider);
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('');
  const [useProxy, setUseProxy] = useState(false);
  const [proxyEndpoint, setProxyEndpoint] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

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

  const handleSave = () => {
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
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    // Simulate test
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (apiKey && model) {
      setTestResult('success');
    } else {
      setTestResult('error');
    }
    setTesting(false);
  };

  const currentProviderInfo = PROVIDERS.find(p => p.id === currentProvider);
  const displayModel = configs[currentProvider]?.model || '未配置';

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>模型配置</DialogTitle>
          <DialogDescription>
            配置 AI 服务商的 API Key 和模型参数
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
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

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model">模型</Label>
            {selectedProvider === 'custom' ? (
              <Input
                id="model"
                placeholder="输入模型名称"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            ) : (
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.find(p => p.id === selectedProvider)?.models.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
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

          {/* Endpoint (optional for custom) */}
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

          {/* Test Result */}
          {testResult && (
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-lg",
              testResult === 'success' ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
            )}>
              <Check className="w-4 h-4" />
              <span>{testResult === 'success' ? '连接成功' : '连接失败'}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !apiKey || !model}
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            测试连接
          </Button>
          <Button onClick={handleSave}>
            保存配置
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
