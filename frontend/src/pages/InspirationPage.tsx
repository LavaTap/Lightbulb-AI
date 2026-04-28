import { useState } from 'react';
import { Sparkles, Copy, Check, User, Mountain, Box, Sparkle, Upload, ImageIcon } from 'lucide-react';
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

const ANALYSIS_CATEGORIES: {
  value: AnalysisCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  { value: 'character', label: '角色', icon: User, description: '含比例分析' },
  { value: 'landscape', label: '风景', icon: Mountain, description: '场景构图' },
  { value: 'object', label: '物品', icon: Box, description: '材质细节' },
  { value: 'other', label: '其他', icon: Sparkle, description: '通用分析' },
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
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl font-bold gradient-text">灵感提示</h1>
        <p className="text-gray-600 dark:text-gray-400">
          上传图片，AI 将分析并生成描述性提示词
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Left Column: Control Panel (col-span-7) ===== */}
        <div className="lg:col-span-7 space-y-5">
          {/* Upload Section - Compact */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-5 h-5 text-primary-500" />
                上传图片
              </CardTitle>
              <ModelDropdown
                category="vision"
                selectedModel={selectedVisionModel}
                onModelChange={handleModelChange}
              />
            </CardHeader>
            <CardContent>
              <ImageUploadZone
                images={images}
                onImagesChange={setImages}
                hidePreview
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
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
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
                    <motion.button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      animate={{
                        borderColor: isSelected
                          ? 'hsl(var(--muted-foreground))'
                          : 'hsl(var(--border))',
                        backgroundColor: isSelected
                          ? 'hsl(var(--muted) / 0.5)'
                          : 'transparent',
                        boxShadow: isSelected
                          ? '0 0 0 1px hsl(var(--muted-foreground) / 0.3)'
                          : 'none',
                      }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      className="flex flex-col items-center gap-2 p-4 rounded-lg border-2"
                    >
                      <motion.div
                        animate={{ scale: isSelected ? 1.08 : 1 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <Icon className={cn(
                          'w-8 h-8',
                          isSelected ? 'text-foreground' : 'text-muted-foreground'
                        )} />
                      </motion.div>
                      <span className={cn(
                        'font-medium',
                        isSelected ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {cat.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {cat.description}
                      </span>
                    </motion.button>
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

          {/* Analysis Result & Prompt Output */}
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* AI 完整分析 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
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

                  {Object.entries(analysis).filter(([key]) => key !== 'analysis' && key !== '画风特征').map(([key, value]: [string, any]) =>
                    value?.zh && (
                      <div key={key}>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{key}</h4>
                        <Textarea value={value.zh} readOnly className="min-h-[80px] resize-y" />
                      </div>
                    )
                  )}
                </CardContent>
              </Card>

              {/* Prompt Display */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">提示词</CardTitle>
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
                        <Textarea value={getPrompt(analysis, 'zh')} readOnly className="min-h-[180px] font-mono text-sm" />
                        <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => handleCopy(getPrompt(analysis, 'zh'), 'zh')}>
                          {copied === 'zh' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="en" className="mt-4">
                      <div className="relative">
                        <Textarea value={getPrompt(analysis, 'en')} readOnly className="min-h-[180px] font-mono text-sm" />
                        <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => handleCopy(getPrompt(analysis, 'en'), 'en')}>
                          {copied === 'en' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="json" className="mt-4">
                      <div className="relative">
                        <Textarea value={getJsonPrompt(analysis)} readOnly className="min-h-[180px] font-mono text-sm" />
                        <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => handleCopy(getJsonPrompt(analysis), 'json')}>
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

        {/* ===== Right Column: Image Preview Panel (col-span-5) ===== */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 space-y-4">
            <Card className="overflow-hidden min-h-[400px] lg:min-h-[600px]">
              {images.length > 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" /> 已上传图片
                    </span>
                    <button
                      onClick={() => setImages([])}
                      className="text-xs text-red-500 hover:text-red-600 transition-colors"
                    >
                      移除图片
                    </button>
                  </div>
                  <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <img
                      src={`data:image/jpeg;base64,${images[0]}`}
                      alt="Uploaded preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] lg:min-h-[600px] text-muted-foreground p-8">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <Upload className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm font-medium">等待上传图片</p>
                  <p className="text-xs mt-1 text-center max-w-[200px]">
                    在左侧面板上传图片后，预览将在此处显示
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
