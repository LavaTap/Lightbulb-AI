import { useState } from 'react';
import { Wand2, Loader2, Download, AlertCircle, ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { ModelDropdown } from '@/components/ModelDropdown';
import { useGeneration } from '@/hooks/useGeneration';
import { modelConfigToApiConfig } from '@/lib/model-utils';
import type { ModelConfig } from '@/types';
import { base64ToDataUrl } from '@/lib/utils';

export function ThreeViewPage() {
  const [referenceImage, setReferenceImage] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('wanx');
  const [selectedModelConfig, setSelectedModelConfig] = useState<ModelConfig | null>(null);

  const { isLoading, error, analyze, generateThreeView } = useGeneration();

  const handleAnalyzeAndGenerate = async () => {
    if (referenceImage.length === 0) return;
    if (!userPrompt.trim()) return;

    setAnalyzing(true);
    try {
      const config = selectedModelConfig ? modelConfigToApiConfig(selectedModelConfig) : undefined;
      const images = await generateThreeView(referenceImage[0], analysisPrompt, userPrompt, config);
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

  const viewLabels = ['正面', '侧面', '背面'];

  const handleModelChange = (modelId: string, modelConfig: ModelConfig) => {
    setSelectedModel(modelConfig.model);
    setSelectedModelConfig(modelConfig);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl font-bold gradient-text">角色三视图</h1>
        <p className="text-gray-600 dark:text-gray-400">
          上传角色参考图，<strong>同时输入提示词（必填）</strong>，AI 将结合两者生成三张2K高清三视图
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Left Column: Control Panel (col-span-6) ===== */}
        <div className="lg:col-span-6 space-y-5">
          {/* 16:9 Size Notice */}
          <Card className="glass border-green-400/60 bg-gradient-to-r from-green-500/15 to-emerald-500/10 dark:from-green-900/30 dark:to-emerald-900/20 backdrop-blur-lg">
            <CardContent className="p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-green-700 dark:text-green-300 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-200">
                三视图输出尺寸锁定为 <strong>16:9</strong> (2560x1440) 2K高清横向宽屏比例，共生成 <strong>3张</strong>（正面/侧面/背面）
              </p>
            </CardContent>
          </Card>

          {/* Reference Image Upload - Compact */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-primary-700 dark:text-primary-300">参考图上传</CardTitle>
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
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="text-base font-semibold flex items-center gap-2 text-primary-700 dark:text-primary-300">
                提示词（必填）
                {!userPrompt.trim() && (
                  <span className="text-xs text-red-600 dark:text-red-400 font-normal">* 请输入描述</span>
                )}
              </div>
              <ModelDropdown
                category={['text-to-image', 'image-to-image']}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="输入你想要的三视图描述，如：银发红瞳的女战士，穿着华丽的盔甲..."
                className="min-h-[100px]"
              />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="text-red-600 dark:text-red-400">*</span> 提示词为必填项，请结合参考图详细描述角色特征
              </p>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={handleAnalyzeAndGenerate}
            disabled={referenceImage.length === 0 || !userPrompt.trim() || isLoading}
            size="lg"
            className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-300"
          >
            {isLoading || analyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            {referenceImage.length === 0 ? '请先上传参考图' : !userPrompt.trim() ? '请输入提示词' : '生成三视图'}
          </Button>

          {/* Error Message */}
          {error && (
          <Card className="glass border-red-300/60 bg-gradient-to-r from-red-500/15 to-red-600/10 dark:from-red-900/30 dark:to-red-800/20 backdrop-blur-lg">
              <CardContent className="p-4 text-red-700 dark:text-red-300">
                {error}
              </CardContent>
            </Card>
          )}

          {/* Analysis Prompt */}
          {(analysisPrompt || analyzing) && (
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-primary-700 dark:text-primary-300">画风分析</CardTitle>
              </CardHeader>
              <CardContent>
                {analyzing ? (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-600 dark:text-primary-400" />
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
            <Card className="overflow-hidden glass-card">
              {referenceImage.length > 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" /> 参考图预览
                    </span>
                    <button
                      onClick={() => { setReferenceImage([]); setGeneratedImages([]); }}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      更换参考图
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-white/30 dark:border-white/10 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl aspect-video">
                    <img src={`data:image/jpeg;base64,${referenceImage[0]}`} alt="Reference" className="w-full h-full object-contain" />
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[240px] text-gray-500 dark:text-gray-400 p-6">
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
                <div className="grid gap-4 grid-cols-1">
                  {generatedImages.map((img, index) => (
                    <Card key={index} className="overflow-hidden glass-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <div className="relative group" style={{ aspectRatio: '16/9' }}>
                        <img src={base64ToDataUrl(img)} alt={viewLabels[index]} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-3 flex justify-between items-center">
                          <span className="text-white font-medium text-sm">{viewLabels[index]}</span>
                          <Button size="icon" variant="ghost" className="text-white hover:text-white hover:bg-white/30 backdrop-blur-sm" onClick={() => handleDownload(img, `threeview-${viewLabels[index]}.png`)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center pt-2">
                  <Button variant="outline" size="sm" className="hover:bg-primary-50 dark:hover:bg-primary-900/30 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300" onClick={() => generatedImages.forEach((img, i) => handleDownload(img, `threeview-${viewLabels[i]}.png`))}>
                    <Download className="w-4 h-4 mr-2" />
                    下载全部三视图
                  </Button>
                </div>
              </motion.div>
            ) : referenceImage.length > 0 ? (
              <Card className="border-dashed border-2 border-primary-300/50 dark:border-primary-600/50 glass">
                <div className="flex flex-col items-center justify-center min-h-[160px] text-gray-500 dark:text-gray-400 p-6">
                  <Wand2 className="w-10 h-10 text-primary-400 dark:text-primary-500 mb-2" />
                  <p className="text-sm font-medium">准备就绪</p>
                  <p className="text-xs mt-1 text-center">填写提示词后点击"生成三视图"</p>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
