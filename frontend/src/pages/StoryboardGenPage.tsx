import { useState } from 'react';
import { Wand2, Download, AlertCircle } from 'lucide-react';
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

export function StoryboardGenPage() {
  const [characterImages, setCharacterImages] = useState<string[]>([]);
  const [sceneImage, setSceneImage] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('wanx');
  const [selectedModelConfig, setSelectedModelConfig] = useState<ModelConfig | null>(null);

  const { isLoading, error, generateStoryboard } = useGeneration();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      const config = selectedModelConfig ? modelConfigToApiConfig(selectedModelConfig) : undefined;
      const scene = sceneImage.length > 0 ? sceneImage[0] : undefined;
      const image = await generateStoryboard(characterImages, scene, prompt, config);
      setGeneratedImage(image);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = (base64: string) => {
    const link = document.createElement('a');
    link.href = base64ToDataUrl(base64);
    link.download = 'storyboard.png';
    link.click();
  };

  const handleModelChange = (_modelId: string, modelConfig: ModelConfig) => {
    setSelectedModel(modelConfig.model);
    setSelectedModelConfig(modelConfig);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold gradient-text">九宫格分镜生成</h1>
        <p className="text-gray-600 dark:text-gray-400">
          上传角色参考图（可选）+ 场景参考图（可选），AI 自动生成 3×3 连贯对战分镜总图
        </p>
      </div>

      {/* Model Selection */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-primary-700 dark:text-primary-300">
            生成模型
          </CardTitle>
          <ModelDropdown
            category={['text-to-image', 'image-to-image']}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
          />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <AlertCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            输出尺寸：<strong className="text-primary-700 dark:text-primary-300">2560×1440</strong> (16:9)
          </div>
        </CardContent>
      </Card>

      {/* Character Reference - Optional, max 2 */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-700 dark:text-primary-300">
            角色参考图（选填，最多 2 张）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploadZone
            images={characterImages}
            onImagesChange={setCharacterImages}
            multiple
            maxImages={2}
          />
        </CardContent>
      </Card>

      {/* Scene Reference - Optional */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-700 dark:text-primary-300">
            场景参考图（选填，1 张）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploadZone
            images={sceneImage}
            onImagesChange={setSceneImage}
            multiple={false}
          />
        </CardContent>
      </Card>

      {/* Prompt Input - Single field */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-700 dark:text-primary-300">
            分镜描述
            <span className="text-red-600 dark:text-red-400 text-xs font-normal">* 必填</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`请完整描述你的分镜需求，例如：

题材设定：超级英雄都市对战
人物能力：主角操控雷电飞行，反派力量型近战
对战逻辑：开局空中对峙→电光突进→近身肉搏→大招对轰→主角险胜
环境氛围：夜晚赛博朋克城市，霓虹灯蓝紫调，暴雨闪电`}
            className="min-h-[150px] resize-y"
          />

          <div className="flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-lg shadow-primary-500/20"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  生成九宫格分镜
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="glass border-red-300/60 bg-gradient-to-r from-red-500/15 to-red-600/10 dark:from-red-900/30 dark:to-red-800/20 backdrop-blur-lg">
          <CardContent>
            <p className="text-red-700 dark:text-red-300 font-medium text-sm">
              {error.includes('404') ? '请求地址不存在，请联系开发者检查 API 路径配置' : error}
            </p>
            {error.includes('404') && (
              <p className="text-red-500/70 dark:text-red-400/70 text-xs mt-1">
                若问题持续，请尝试切换其他模型或刷新页面后重试
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generated Storyboard */}
      {generatedImage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center"
        >
          <Card className="max-w-3xl w-full overflow-hidden glass-card hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div style={{ aspectRatio: '16/9' }} className="relative group">
              <img
                src={base64ToDataUrl(generatedImage)}
                alt="Generated Storyboard"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <CardContent className="p-4 flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">2560 × 1440 (16:9)</span>
              <Button
                variant="outline"
                onClick={() => handleDownload(generatedImage)}
                className="hover:bg-primary-50 dark:hover:bg-primary-900/30 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300"
              >
                <Download className="w-4 h-4 mr-2" />
                下载分镜图
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
