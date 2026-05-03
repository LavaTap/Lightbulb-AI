import { useState, useEffect, useRef } from 'react';
import { Wand2, Loader2, Download, AlertCircle, ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { ModelDropdown } from '@/components/ModelDropdown';
import { useGeneration } from '@/hooks/useGeneration';
import { useApiConfig } from '@/hooks/useApiConfig';
import { modelConfigToApiConfig, getPersistedModelId, setPersistedModelId } from '@/lib/model-utils';
import type { ModelConfig } from '@/types';
import { base64ToDataUrl } from '@/lib/utils';

export function ThreeViewPage() {
  const [referenceImage, setReferenceImage] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedModelConfig, setSelectedModelConfig] = useState<ModelConfig | null>(null);

  const { isLoading, error, analyze, generateThreeView } = useGeneration();
  const { modelConfigs, getConfigsByCategory } = useApiConfig();
  const initRef = useRef(false);

  const selectedModelName = selectedModelConfig?.model || '';
  const selectedApiConfig = selectedModelConfig ? modelConfigToApiConfig(selectedModelConfig) : null;

  useEffect(() => {
    if (initRef.current || modelConfigs.length === 0) return;
    const configs = getConfigsByCategory(['multimodal']);
    if (configs.length === 0) return;
    initRef.current = true;
    const persistedId = getPersistedModelId('threeview');
    const match = persistedId ? configs.find(c => c.id.toString() === persistedId) : null;
    setSelectedModelConfig(match || configs[0]);
  }, [modelConfigs, getConfigsByCategory]);

  const handleAnalyzeAndGenerate = async () => {
    if (referenceImage.length === 0) return;
    if (!userPrompt.trim()) return;

    setAnalyzing(true);
    try {
      const images = await generateThreeView(referenceImage[0], analysisPrompt, userPrompt, selectedApiConfig || undefined);
      setGeneratedImages(images);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  };

  const handleDownload = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = base64ToDataUrl(base64);
    link.download = filename;
    link.click();
  };

  const viewLabels = ['角色设计图'];

  const handleModelChange = (modelId: string, config: ModelConfig) => {
    setSelectedModelConfig(config);
    setPersistedModelId('threeview', config.id.toString());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl font-bold gradient-text">角色设计图</h1>
        <p className="text-gray-600 dark:text-gray-400">
          上传角色参考图，<strong>同时输入提示词（必填）</strong>，AI 将结合两者生成2K高清角色设计图
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Left Column: Control Panel (col-span-6) ===== */}
        <div className="lg:col-span-6 space-y-5">
          {/* 16:9 Size Notice */}
          <Card className="border-green-300 bg-green-50/50 dark:bg-green-900/20">
            <CardContent className="p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">
                输出尺寸锁定为 <strong>16:9</strong> (2560x1440) 2K高清横向宽屏比例，生成 <strong>1张</strong> 角色设计图
              </p>
            </CardContent>
          </Card>

          {/* Reference Image Upload - Compact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">参考图上传</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUploadZone
                images={referenceImage}
                onImagesChange={setReferenceImage}
                multiple={false}
                hidePreview
              />
            </CardContent>
          </Card>

          {/* User Custom Prompt Input */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="text-base font-semibold flex items-center gap-2">
                提示词（必填）
                {!userPrompt.trim() && (
                  <span className="text-xs text-red-500 font-normal">* 请输入描述</span>
                )}
              </div>
              <ModelDropdown
                category="multimodal"
                selectedModel={selectedModelName}
                onModelChange={handleModelChange}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="输入你想要的角色设计描述，如：银发红瞳的女战士，穿着华丽的盔甲..."
                className="min-h-[100px]"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="text-red-500">*</span> 提示词为必填项，请结合参考图详细描述角色特征
              </p>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={handleAnalyzeAndGenerate}
            disabled={referenceImage.length === 0 || !userPrompt.trim() || isLoading}
            size="lg"
            className="w-full"
          >
            {isLoading || analyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            {referenceImage.length === 0 ? '请先上传参考图' : !userPrompt.trim() ? '请输入提示词' : '生成角色设计图'}
          </Button>

          {/* Error Message */}
          {error && (
            <Card className="border-red-300 bg-red-50 dark:bg-red-900/20">
              <CardContent className="p-4 text-red-600 dark:text-red-400">
                {error}
              </CardContent>
            </Card>
          )}

          {/* Analysis Prompt */}
          {(analysisPrompt || analyzing) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">画风分析</CardTitle>
              </CardHeader>
              <CardContent>
                {analyzing ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>正在分析画风...</span>
                  </div>
                ) : (
                  <Textarea value={analysisPrompt} onChange={(e) => setAnalysisPrompt(e.target.value)} className="min-h-[100px]" />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ===== Right Column: Preview Panel (col-span-6) ===== */}
        <div className="lg:col-span-6">
          <div className="lg:sticky lg:top-24 space-y-4">
            {/* Reference Image Preview */}
            <Card className="overflow-hidden">
              {referenceImage.length > 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" /> 参考图预览
                    </span>
                    <button
                      onClick={() => { setReferenceImage([]); setGeneratedImages([]); }}
                      className="text-xs text-red-500 hover:text-red-600 transition-colors"
                    >
                      更换参考图
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 aspect-video">
                    <img src={`data:image/jpeg;base64,${referenceImage[0]}`} alt="Reference" className="w-full h-full object-contain" />
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[240px] text-muted-foreground p-6">
                  <ImageIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm font-medium">参考图预览区</p>
                  <p className="text-xs mt-1">在左侧上传参考图后显示</p>
                </div>
              )}
            </Card>

            {/* Generated Three Views */}
            {generatedImages.length > 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <h3 className="text-lg font-semibold text-center">生成结果</h3>
                <div className="grid gap-3 grid-cols-1">
                  {generatedImages.map((img, index) => (
                    <Card key={index} className="overflow-hidden">
                      <div className="relative" style={{ aspectRatio: '16/9' }}>
                        <img src={base64ToDataUrl(img)} alt={viewLabels[index]} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3 flex justify-between items-center">
                          <span className="text-white font-medium text-sm">{viewLabels[index]}</span>
                          <Button size="icon" variant="ghost" className="text-white hover:text-white hover:bg-white/20" onClick={() => handleDownload(img, `threeview-${viewLabels[index]}.png`)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center pt-2">
                  <Button variant="outline" size="sm" onClick={() => generatedImages.forEach((img, i) => handleDownload(img, `threeview-${viewLabels[i]}.png`))}>
                    <Download className="w-4 h-4 mr-2" />
                    下载图片
                  </Button>
                </div>
              </motion.div>
            ) : referenceImage.length > 0 ? (
              <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700">
                <div className="flex flex-col items-center justify-center min-h-[160px] text-muted-foreground p-6">
                  <Wand2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm font-medium">准备就绪</p>
                  <p className="text-xs mt-1 text-center">填写提示词后点击"生成角色设计图"</p>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
