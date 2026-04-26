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
  
  const selectedSizeOption = POSTER_SIZE_OPTIONS.find(o => o.label === posterSizeKey) || POSTER_SIZE_OPTIONS[0];
  
  const { isLoading, error, generatePoster } = useGeneration();

  const handleGenerate = async () => {
    if (characterImages.length === 0 || !prompt.trim()) return;
    
    try {
      const allImages = [...characterImages, ...posterReference];
      const image = await generatePoster(allImages, prompt);
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
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header with model selector */}
      <div className="flex items-center justify-between">
        <div className="text-center flex-1 space-y-2">
          <h1 className="text-3xl font-bold gradient-text">海报生成</h1>
          <p className="text-gray-600 dark:text-gray-400">
            上传角色参考图 <strong>+</strong> 输入描述提示词（图文必填），AI 将按所选尺寸生成海报
          </p>
        </div>
        <div className="flex-shrink-0">
          <ModelDropdown
            category="image-to-image"
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
          />
        </div>
      </div>

      {/* Size Selection - Dropdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            海报尺寸
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={posterSizeKey} onValueChange={setPosterSizeKey}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择海报尺寸" />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 text-xs text-gray-500 font-medium border-b border-gray-200 dark:border-gray-700 mb-1">竖版</div>
              {POSTER_SIZE_OPTIONS.filter(o => o.ratio.startsWith('9')).map((opt, i) => (
                <SelectItem key={`port-${i}`} value={opt.label}>
                  <span>{opt.label}</span>
                  <span className="ml-2 text-xs text-gray-400">{opt.description}</span>
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs text-gray-500 font-medium border-b border-t border-gray-200 dark:border-gray-700 my-1">横版</div>
              {POSTER_SIZE_OPTIONS.filter(o => o.ratio.includes('16') || o.ratio === '21/9').map((opt, i) => (
                <SelectItem key={`land-${i}`} value={opt.label}>
                  <span>{opt.label}</span>
                  <span className="ml-2 text-xs text-gray-400">{opt.description}</span>
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs text-gray-500 font-medium border-b border-t border-gray-200 dark:border-gray-700 my-1">正方形</div>
              {POSTER_SIZE_OPTIONS.filter(o => o.ratio === '1/1').map((opt, i) => (
                <SelectItem key={`sq-${i}`} value={opt.label}>
                  <span>{opt.label}</span>
                  <span className="ml-2 text-xs text-gray-400">{opt.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-4 h-4" />
            当前选择：<strong className="text-primary-600 dark:text-primary-400">{selectedSizeOption.resolution}</strong> ({selectedSizeOption.ratio.replace('/', ':')})
          </div>
        </CardContent>
      </Card>

      {/* Character Reference - Required */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            角色参考图
            <span className="text-red-500 text-xs font-normal">* 必填</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {characterImages.length === 0 && (
            <p className="text-xs text-red-500 mb-2">请上传至少一张角色参考图</p>
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
      <Card>
        <CardHeader>
          <CardTitle>海报参考图（选填）</CardTitle>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            海报描述
            {!prompt.trim() && <span className="text-red-500 text-xs font-normal">* 必填</span>}
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
            <p className="text-xs text-red-500">* 请输入海报描述，与角色图结合生成效果更佳</p>
          )}
          
          <div className="flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={characterImages.length === 0 || !prompt.trim() || isLoading}
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
        <Card className="border-red-300 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4 text-red-600 dark:text-red-400">
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
          <Card className="max-w-2xl w-full overflow-hidden">
            <div style={{ aspectRatio: selectedSizeOption.ratio }}>
              <img
                src={base64ToDataUrl(generatedImage)}
                alt="Generated Poster"
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-4 flex justify-between items-center">
              <span className="text-sm text-gray-500">{selectedSizeOption.resolution}</span>
              <Button
                variant="outline"
                onClick={() => handleDownload(generatedImage)}
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
