import { useState, useRef } from 'react';
import { FileText, Copy, Check, Sparkles, Loader2, MessageSquare, Sword, Image, LayoutGrid, GitBranch } from 'lucide-react';
import { ModelDropdown } from '@/components/ModelDropdown';
import { useGeneration } from '@/hooks/useGeneration';
import { useApiConfig } from '@/hooks/useApiConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { ModelConfig, APIConfig } from '@/types';
import type { StoryboardPromptMode, StoryboardTemplate } from '@/types/api';

type TemplateCard = {
  key: StoryboardTemplate;
  label: string;
  icon: typeof Image;
  desc: string;
  color: string;
  bgGradient: string;
};

const TEMPLATES: TemplateCard[] = [
  {
    key: 'scene',
    label: '场景生图模板',
    icon: Image,
    desc: '纯场景提示词，不含人物，白底背景，用于生成空场景素材叠加角色',
    color: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30',
  },
  {
    key: 'random',
    label: '随机分镜模板',
    icon: LayoutGrid,
    desc: 'AI 自主编排 3×3 九宫格连贯动作分镜，视角随机不重复',
    color: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30',
  },
  {
    key: 'adaptive',
    label: '自适应分镜模板',
    icon: GitBranch,
    desc: '根据用户详细设定智能编排完整战斗/对话分镜叙事',
    color: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
  },
];

const MODE_OPTIONS: { key: StoryboardPromptMode; label: string; icon: typeof MessageSquare; desc: string }[] = [
  { key: 'dialogue', label: '对话场景', icon: MessageSquare, desc: '角色之间的交流互动、关系变化' },
  { key: 'battle', label: '对战场景', icon: Sword, desc: '角色之间的战斗对决、攻防胜负' },
];

export function StoryboardPromptPage() {
  const [userText, setUserText] = useState('');
  const [mode, setMode] = useState<StoryboardPromptMode>('battle');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedModelConfig, setSelectedModelConfig] = useState<ModelConfig | null>(null);
  const [results, setResults] = useState<Record<StoryboardTemplate, string>>({
    scene: '',
    random: '',
    adaptive: '',
  });
  const [generating, setGenerating] = useState<StoryboardTemplate | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { error, generateStoryboardPrompt, clearError } = useGeneration();
  const { getConfigsByCategory } = useApiConfig();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleModelChange = (modelId: string, config: ModelConfig) => {
    setSelectedModelId(modelId);
    setSelectedModelConfig(config);
  };

  const buildApiConfig = (): APIConfig | null => {
    if (!selectedModelConfig) return null;
    return {
      provider: selectedModelConfig.provider as APIConfig['provider'],
      model: selectedModelConfig.model,
      endpoint: selectedModelConfig.endpoint || '',
      apiKey: selectedModelConfig.apiKey || '',
      useProxy: selectedModelConfig.useProxy,
      proxyEndpoint: selectedModelConfig.proxyEndpoint || '',
    };
  };

  const handleGenerate = async (template: StoryboardTemplate) => {
    if (!userText.trim()) return;
    if (!selectedModelConfig) return;
    const config = buildApiConfig();
    if (!config) return;

    clearError();
    setGenerating(template);
    try {
      const data = await generateStoryboardPrompt(userText.trim(), template, mode, config);
      setResults(prev => ({ ...prev, [template]: data.scenePrompt || data.randomStoryboardPrompt || data.adaptiveStoryboardPrompt }));
    } catch {
      // 错误已由 Hook 管理
    } finally {
      setGenerating(null);
    }
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // 静默降级
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">分镜词分析</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            先选择场景类型，再选择模板单独生成分镜提示词
          </p>
        </div>
      </div>

      {/* 顶部：输入区 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Textarea
            ref={textareaRef}
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            placeholder={`请描述你的创作需求，例如：

题材设定：科幻机甲风格，人类与外星机甲在城市中决战
人物能力：主角拥有等离子剑和能量护盾，反派有巨力装甲和激光炮
对战/对话逻辑：开局在高楼顶对峙→主角突进被挡→双方武器对拼→反派释放大招→主角闪避反击致命一击
环境氛围：夜晚赛博朋克城市，霓虹灯光，雨雾弥漫，金属反光`}
            className="min-h-[150px] resize-y text-sm"
          />

          {/* 场景类型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              选择场景类型
            </label>
            <div className="flex gap-3">
              {MODE_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setMode(opt.key)}
                  className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
                    mode === opt.key
                      ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-950/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    mode === opt.key
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    <opt.icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className={`font-medium text-sm ${
                      mode === opt.key ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 模型选择 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">文本模型：</span>
            <ModelDropdown
              category={['text']}
              selectedModel={selectedModelId}
              onModelChange={handleModelChange}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 三个模板卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon;
          const result = results[tmpl.key];
          const isLoading = generating === tmpl.key;
          const hasResult = !!result;

          return (
            <Card key={tmpl.key} className={`relative overflow-hidden border-0 ${!hasResult ? tmpl.bgGradient : ''}`}>
              {/* 顶部装饰条 */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${tmpl.color}`} />

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tmpl.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-sm">{tmpl.label}</CardTitle>
                  </div>
                  {hasResult && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopy(result, tmpl.key)}
                      title="复制"
                    >
                      {copied === tmpl.key ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tmpl.desc}</p>
              </CardHeader>

              <CardContent className="space-y-3">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-xs">正在生成...</p>
                  </div>
                ) : hasResult ? (
                  <div className="relative">
                    <Textarea
                      value={result}
                      readOnly
                      className="min-h-[200px] text-xs resize-y"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
                    <Icon className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-xs">尚未生成</p>
                  </div>
                )}

                <Button
                  onClick={() => handleGenerate(tmpl.key)}
                  disabled={isLoading || !userText.trim() || !selectedModelConfig}
                  className={`w-full bg-gradient-to-r ${tmpl.color} hover:opacity-90 disabled:opacity-50`}
                  size="sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      {hasResult ? '重新生成' : '生成'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
