import { useState } from 'react';
import { Sparkles, Copy, Check, User, Mountain, Box, Sparkle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { ModelDropdown } from '@/components/ModelDropdown';
import { useGeneration } from '@/hooks/useGeneration';
import type { VisionAnalysisResult, ModelConfig, AnalysisCategory } from '@/types';
import { cn, base64ToDataUrl } from '@/lib/utils';

// 分析类别配置
const ANALYSIS_CATEGORIES: {
  value: AnalysisCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  {
    value: 'character',
    label: '角色',
    icon: User,
    description: '含比例分析',
  },
  {
    value: 'landscape',
    label: '风景',
    icon: Mountain,
    description: '场景构图',
  },
  {
    value: 'object',
    label: '物品',
    icon: Box,
    description: '材质细节',
  },
  {
    value: 'other',
    label: '其他',
    icon: Sparkle,
    description: '通用分析',
  },
];

export function InspirationPage() {
  const [images, setImages] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<VisionAnalysisResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedVisionModel, setSelectedVisionModel] = useState<string>('gpt-4o');
  const [selectedCategory, setSelectedCategory] = useState<AnalysisCategory>('other');

  const { isLoading, error, analyze } = useGeneration();

  const handleAnalyze = async () => {
    if (images.length === 0) return;

    try {
      const result = await analyze(images[0], selectedCategory);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const getPrompt = (analysis: VisionAnalysisResult, lang: 'zh' | 'en') => {
    return analysis.analysis[lang];
  };

  const getJsonPrompt = (analysis: VisionAnalysisResult) => {
    return JSON.stringify(analysis, null, 2);
  };

  const handleModelChange = (modelId: string, config: ModelConfig) => {
    setSelectedVisionModel(config.model);
    // 可以在这里保存用户选择
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header with model selector */}
      <div className="flex items-center justify-between">
        <div className="text-center flex-1 space-y-2">
          <h1 className="text-3xl font-bold gradient-text ml-8">灵感提示</h1>
          <p className="text-gray-600 dark:text-gray-400 ml-8">
            上传图片，AI 将分析并生成描述性提示词
          </p>
        </div>
        <div className="flex-shrink-0">
          <ModelDropdown
            category="vision"
            selectedModel={selectedVisionModel}
            onModelChange={handleModelChange}
          />
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-500" />
            上传图片
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploadZone
            images={images}
            onImagesChange={setImages}
          />
          <div className="mt-4 flex gap-3">
            <Button
              onClick={handleAnalyze}
              disabled={images.length === 0 || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  开始分析
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary-500" />
            选择分析类型
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ANALYSIS_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                    'hover:border-primary/50 hover:bg-primary/5',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 bg-transparent'
                  )}
                >
                  <Icon className={cn(
                    'w-8 h-8 transition-colors',
                    isSelected ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                  )} />
                  <span className={cn(
                    'font-medium',
                    isSelected ? 'text-primary' : 'text-gray-700 dark:text-gray-300'
                  )}>
                    {cat.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {cat.description}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedCategory === 'character' && (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              选择角色分析，将额外进行人体比例分析（头身比、三庭五眼等）
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4 text-red-600 dark:text-red-400">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Analysis Result */}
      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* AI 完整分析 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-500" />
                  AI 完整分析
                </span>
                <span className="text-sm font-normal text-green-600 dark:text-green-400 flex items-center gap-1">
                  ✨ 分析完成
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 主要内容 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">内容分析</h4>
                <Textarea
                  value={analysis.analysis?.zh || ''}
                  onChange={(e) => setAnalysis({
                    ...analysis,
                    analysis: { ...analysis.analysis, zh: e.target.value }
                  })}
                  className="min-h-[100px] resize-y"
                  placeholder="AI 分析结果将显示在这里..."
                />
              </div>
              
              {/* 画风特征 */}
              {(analysis as any)['画风特征']?.zh && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">画风特征</h4>
                  <Textarea
                    value={(analysis as any)['画风特征'].zh}
                    onChange={(e) => setAnalysis({
                      ...analysis,
                      ['画风特征']: { ...(analysis as any)['画风特征'], zh: e.target.value }
                    } as any)}
                    className="min-h-[100px] resize-y"
                  />
                </div>
              )}
              
              {/* 其他动态字段 */}
              {Object.entries(analysis).filter(([key]) => key !== 'analysis' && key !== '画风特征').map(([key, value]: [string, any]) => (
                value?.zh && (
                  <div key={key}>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{key}</h4>
                    <Textarea
                      value={value.zh}
                      readOnly
                      className="min-h-[80px] resize-y"
                    />
                  </div>
                )
              ))}
            </CardContent>
          </Card>

          {/* Prompt Display */}
          <Card>
            <CardHeader>
              <CardTitle>提示词</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="zh" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="zh">中文</TabsTrigger>
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>
                
                <TabsContent value="zh" className="mt-4">
                  <div className="relative">
                    <Textarea
                      value={getPrompt(analysis, 'zh')}
                      readOnly
                      className="min-h-[200px] font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopy(getPrompt(analysis, 'zh'), 'zh')}
                    >
                      {copied === 'zh' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="en" className="mt-4">
                  <div className="relative">
                    <Textarea
                      value={getPrompt(analysis, 'en')}
                      readOnly
                      className="min-h-[200px] font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopy(getPrompt(analysis, 'en'), 'en')}
                    >
                      {copied === 'en' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="json" className="mt-4">
                  <div className="relative">
                    <Textarea
                      value={getJsonPrompt(analysis)}
                      readOnly
                      className="min-h-[200px] font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopy(getJsonPrompt(analysis), 'json')}
                    >
                      {copied === 'json' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
