import { useState } from 'react';
import { Wand2, Download, Image, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { ModelDropdown } from '@/components/ModelDropdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGeneration } from '@/hooks/useGeneration';
import { modelConfigToApiConfig } from '@/lib/model-utils';
import type { ModelConfig } from '@/types';
import { base64ToDataUrl } from '@/lib/utils';

type PosterSizeKey = string;

interface PosterSizeOption {
  label: string;
  ratio: string;
  resolution: string;
  description: string;
}

const POSTER_SIZE_OPTIONS: PosterSizeOption[] = [
  // 竖版
  { label: '竖版 9:16 (1080p)', ratio: '9/16', resolution: '1080x1920', description: '手机壁纸、故事分享' },
  { label: '竖版 9:16 (2K)', ratio: '9/16', resolution: '2160x3840', description: '高清竖版海报' },
  // 横版
  { label: '横版 16:9 (1080p)', ratio: '16/9', resolution: '1920x1080', description: '电脑壁纸、封面' },
  { label: '横版 16:9 (2K)', ratio: '16/9', resolution: '2560x1440', description: '高清宽屏海报' },
  { label: '横版 21:9 (超宽)', ratio: '21/9', resolution: '2560x1080', description: '超宽屏展示' },
  // 正方形
  { label: '正方形 1:1', ratio: '1/1', resolution: '1024x1024', description: '头像、社交媒体' },
  { label: '正方形 1:1 (2K)', ratio: '1/1', resolution: '2048x2048', description: '高清正方形海报' },
];

const DEFAULT_SIZE = '1'; // 竖版 9:16 2K

export function PosterGenPage() {
  const [characterImages, setCharacterImages] = useState<string[]>([]);
  const [posterReference, setPosterReference] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [posterSizeKey, setPosterSizeKey] = useState<string>(DEFAULT_SIZE);
  const [selectedModel, setSelectedModel] = useState<string>('wanx');
  const [selectedModelConfig, setSelectedModelConfig] = useState<ModelConfig | null>(null);
  
  const selectedSizeOption = POSTER_SIZE_OPTIONS.find(o => o.label === posterSizeKey) || POSTER_SIZE_OPTIONS[0];

  // Map UI ratio to image generation size parameter
  const getAPISize = (): '1024x1024' | '1024x1792' | '1792x1024' => {
    const ratio = selectedSizeOption.ratio;
    if (ratio === '9/16') return '1024x1792';
    if (ratio === '16/9' || ratio === '21/9') return '1792x1024';
    return '1024x1024'; // 1/1
  };
  
  const { isLoading, error, generatePoster } = useGeneration();

  const handleGenerate = async () => {
    if (characterImages.length === 0 || !prompt.trim()) return;

    try {
      const allImages = [...characterImages, ...posterReference];
      const config = selectedModelConfig ? modelConfigToApiConfig(selectedModelConfig) : undefined;
      const image = await generatePoster(allImages, prompt, getAPISize(), config);
      setGeneratedImage(image);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = (base64: string) => {
    const link = document.createElement('a');
    link.href = base64ToDataUrl(base64);
    link.download = 'poster.png';
    link.click();
  };

  const handleModelChange = (modelId: string, modelConfig: ModelConfig) => {
    setSelectedModel(modelConfig.model);
    setSelectedModelConfig(modelConfig);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold gradient-text">海报生成</h1>
        <p className="text-gray-600 dark:text-gray-400">
          上传角色参考图 <strong>+</strong> 输入描述提示词（图文必填），AI 将按所选尺寸生成海报
        </p>
      </div>

      {/* Size Selection - Dropdown */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-primary-700 dark:text-primary-300">
            <Image className="w-5 h-5" />
            海报尺寸
          </CardTitle>
          <ModelDropdown
            category={['text-to-image', 'image-to-image']}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
          />
        </CardHeader>
        <CardContent>
          <Select value={posterSizeKey} onValueChange={setPosterSizeKey}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择海报尺寸" />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 text-xs text-primary-600 dark:text-primary-400 font-medium border-b border-white/20 dark:border-white/10 mb-1">竖版</div>
              {POSTER_SIZE_OPTIONS.filter(o => o.ratio.startsWith('9')).map((opt, i) => (
                <SelectItem key={`port-${i}`} value={opt.label}>
                  <span>{opt.label}</span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{opt.description}</span>
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs text-primary-600 dark:text-primary-400 font-medium border-b border-t border-white/20 dark:border-white/10 my-1">横版</div>
              {POSTER_SIZE_OPTIONS.filter(o => o.ratio.includes('16') || o.ratio === '21/9').map((opt, i) => (
                <SelectItem key={`land-${i}`} value={opt.label}>
                  <span>{opt.label}</span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{opt.description}</span>
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs text-primary-600 dark:text-primary-400 font-medium border-b border-t border-white/20 dark:border-white/10 my-1">正方形</div>
              {POSTER_SIZE_OPTIONS.filter(o => o.ratio === '1/1').map((opt, i) => (
                <SelectItem key={`sq-${i}`} value={opt.label}>
                  <span>{opt.label}</span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{opt.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <AlertCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            当前选择：<strong className="text-primary-700 dark:text-primary-300">{selectedSizeOption.resolution}</strong> ({selectedSizeOption.ratio.replace('/', ':')})
          </div>
        </CardContent>
      </Card>

      {/* Character Reference - Required */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-700 dark:text-primary-300">
            角色参考图
            <span className="text-red-600 dark:text-red-400 text-xs font-normal">* 必填</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {characterImages.length === 0 && (
            <p className="text-xs text-red-600 dark:text-red-400 mb-2">请上传至少一张角色参考图</p>
          )}
          <ImageUploadZone
            images={characterImages}
            onImagesChange={setCharacterImages}
            multiple
            maxImages={5}
          />
        </CardContent>
      </Card>

      {/* Poster Reference (Optional) */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-primary-700 dark:text-primary-300">海报参考图（选填）</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploadZone
            images={posterReference}
            onImagesChange={setPosterReference}
            multiple={false}
          />
        </CardContent>
      </Card>

      {/* Prompt Input - Required */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-700 dark:text-primary-300">
            海报描述
            {!prompt.trim() && <span className="text-red-600 dark:text-red-400 text-xs font-normal">* 必填</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述海报的主题、风格、场景、构图..."
            className="min-h-[120px]"
          />
          {!prompt.trim() && (
            <p className="text-xs text-red-600 dark:text-red-400">* 请输入海报描述，与角色图结合生成效果更佳</p>
          )}
          
          <div className="flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={characterImages.length === 0 || !prompt.trim() || isLoading}
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
                  {characterImages.length === 0 ? '请上传参考图' : !prompt.trim() ? '请输入描述' : '生成海报'}
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

      {/* Generated Poster */}
      {generatedImage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center"
        >
          <Card className="max-w-2xl w-full overflow-hidden glass-card hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div style={{ aspectRatio: selectedSizeOption.ratio }} className="relative group">
              <img
                src={base64ToDataUrl(generatedImage)}
                alt="Generated Poster"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <CardContent className="p-4 flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">{selectedSizeOption.resolution}</span>
              <Button
                variant="outline"
                onClick={() => handleDownload(generatedImage)}
                className="hover:bg-primary-50 dark:hover:bg-primary-900/30 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300"
              >
                <Download className="w-4 h-4 mr-2" />
                下载海报
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
