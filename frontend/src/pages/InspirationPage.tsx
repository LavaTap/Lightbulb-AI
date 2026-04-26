import { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { ModelDropdown } from '@/components/ModelDropdown';
import { useGeneration } from '@/hooks/useGeneration';
import type { VisionAnalysisResult, ModelConfig } from '@/types';
import { cn, base64ToDataUrl } from '@/lib/utils';

export function InspirationPage() {
  const [images, setImages] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<VisionAnalysisResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedVisionModel, setSelectedVisionModel] = useState<string>('gpt-4o');
  
  const { isLoading, error, analyze } = useGeneration();

  const handleAnalyze = async () => {
    if (images.length === 0) return;
    
    try {
      const result = await analyze(images[0]);
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
