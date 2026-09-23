import { useState, useMemo, ChangeEvent } from 'react';
import { Wand2, Download, AlertCircle, Image } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { ModelDropdown } from '@/components/ModelDropdown';
import { useGeneration } from '@/hooks/useGeneration';
import { modelConfigToApiConfig } from '@/lib/model-utils';
import { getSupportedSizes, isSizeSupported } from '@/lib/model-size-config';
import type { ModelConfig, ImageSize } from '@/types';
import { base64ToDataUrl } from '@/lib/utils';

export function StoryboardGenPage() {
  const [characterImages, setCharacterImages] = useState<string[]>([]);
  const [sceneImage, setSceneImage] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('wanx');
  const [selectedModelConfig, setSelectedModelConfig] = useState<ModelConfig | null>(null);
  const [selectedSize, setSelectedSize] = useState<ImageSize>('1:1');
  const [showCustomSizeInput, setShowCustomSizeInput] = useState(false);
  const [customSize, setCustomSize] = useState('');

  const { isLoading, error, generateStoryboard } = useGeneration();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      const config = selectedModelConfig ? modelConfigToApiConfig(selectedModelConfig) : undefined;
      const scene = sceneImage.length > 0 ? sceneImage[0] : undefined;
      const image = await generateStoryboard(characterImages, scene, prompt, config, selectedSize);
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

    // 切换模型时，如果当前是自定义尺寸，保持不变；否则检查是否支持
    if (selectedSize !== 'custom' as ImageSize) {
      const supportedSizes = getSupportedSizes(modelConfig.provider);
      if (supportedSizes.length > 0 && !isSizeSupported(selectedSize, modelConfig.provider)) {
        setSelectedSize(supportedSizes[0].value as ImageSize);
      }
    }
  };

  // 根据当前选中的模型动态获取支持的尺寸选项
  const sizeOptions = useMemo(() => {
    if (!selectedModelConfig) return getSupportedSizes('tencent');
    return getSupportedSizes(selectedModelConfig.provider);
  }, [selectedModelConfig]);

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
        <CardContent className="space-y-4">
          {/* Image Size Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              <Image className="w-4 h-4 inline mr-1" />
              输出尺寸
            </label>
            <Select
              value={selectedSize}
              onValueChange={(v: ImageSize) => {
                if (v === 'custom' as ImageSize) {
                  setShowCustomSizeInput(true);
                } else {
                  setShowCustomSizeInput(false);
                  setSelectedSize(v);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择尺寸" />
              </SelectTrigger>
              <SelectContent>
                {sizeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value as ImageSize}>
                    <div className="flex items-center gap-2">
                      <span>{option.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">({option.description})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Custom Size Input */}
            {showCustomSizeInput && (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="例如: 1024x1024"
                  value={customSize}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomSize(e.target.value)}
                  className="flex-1"
                  pattern="[0-9]+x[0-9]+"
                  title="请输入宽x高格式，例如: 1024x1024"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (/^\d+x\d+$/.test(customSize)) {
                      setSelectedSize(customSize as ImageSize);
                      setShowCustomSizeInput(false);
                    } else {
                      alert('请输入正确的尺寸格式，例如: 1024x1024');
                    }
                  }}
                  disabled={isLoading}
                >
                  确认
                </Button>
              </div>
            )}
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
              <span className="text-sm text-gray-600 dark:text-gray-300">{selectedSize.replace('x', ' × ')} ({sizeOptions.find(o => o.value === selectedSize)?.ratio})</span>
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
