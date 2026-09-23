import { useState, useMemo, ChangeEvent } from 'react';
import { Wand2, Download, Image } from 'lucide-react';
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
import { ModelDropdown } from '@/components/ModelDropdown';
import { useGeneration } from '@/hooks/useGeneration';
import { modelConfigToApiConfig } from '@/lib/model-utils';
import { getSupportedSizes, isSizeSupported } from '@/lib/model-size-config';
import type { ModelConfig, ImageSize } from '@/types';
import { base64ToDataUrl } from '@/lib/utils';

export function CharacterGenPage() {
  const [prompt, setPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('dall-e-3');
  const [selectedModelConfig, setSelectedModelConfig] = useState<ModelConfig | null>(null);
  const [selectedSize, setSelectedSize] = useState<ImageSize>('1:1');
  const [showCustomSizeInput, setShowCustomSizeInput] = useState(false);
  const [customSize, setCustomSize] = useState('');

  const { isLoading, error, generate } = useGeneration();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      const config = selectedModelConfig ? modelConfigToApiConfig(selectedModelConfig) : undefined;
      const image = await generate(prompt, selectedSize, config);
      setGeneratedImages([image]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = base64ToDataUrl(base64);
    link.download = filename;
    link.click();
  };

  const handleModelChange = (modelId: string, modelConfig: ModelConfig) => {
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
    if (!selectedModelConfig) return getSupportedSizes('custom');
    return getSupportedSizes(selectedModelConfig.provider);
  }, [selectedModelConfig]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold gradient-text">文生图</h1>
        <p className="text-gray-600 dark:text-gray-400">
          输入提示词，AI 将生成角色图片
        </p>
      </div>

      {/* Prompt Input */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-primary-700 dark:text-primary-300">提示词</CardTitle>
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
              图片尺寸
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

          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想生成的角色形象..."
            className="min-h-[120px]"
          />

          <div className="flex items-center justify-end">
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isLoading}
              className="px-6 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-lg shadow-primary-500/20"
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
                  生成图片
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="glass border-red-300/60 bg-gradient-to-r from-red-500/15 to-red-600/10 dark:from-red-900/30 dark:to-red-800/20 backdrop-blur-lg">
          <CardContent className="p-4 text-red-700 dark:text-red-300">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Generated Images */}
      {generatedImages.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-6 md:grid-cols-2"
        >
          {generatedImages.map((img, index) => (
            <Card key={index} className="overflow-hidden glass-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="relative group">
                <img
                  src={base64ToDataUrl(img)}
                  alt={`Generated ${index + 1}`}
                  className="w-full object-cover transition-transform duration0 group-hover:scale-105"
                  style={{ aspectRatio: selectedSize.includes(':') ? selectedSize.replace(':', '/') : selectedSize.split('x').reverse().map(Number).reduce((a, b) => a / b, 1) }}
                />
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {selectedSize.replace('x', ' × ')}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <CardContent className="p-4 flex gap-2">
                <div className="flex-1 flex items-center text-sm text-gray-600 dark:text-gray-300">
                  {sizeOptions.find(o => o.value === selectedSize)?.label} ({sizeOptions.find(o => o.value === selectedSize)?.ratio})
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-primary-50 dark:hover:bg-primary-900/30 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300"
                  onClick={() => handleDownload(img, `generated-${index + 1}.png`)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载
                </Button>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  );
}
