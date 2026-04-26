import { useState } from 'react';
import { Wand2, Download, Image } from 'lucide-react';
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

type PosterSize = 'portrait' | 'landscape';

const POSTER_SIZES = {
  portrait: {
    label: '竖版 (9:16)',
    description: '适合手机壁纸、故事分享',
    recommended: '1080x1920',
  },
  landscape: {
    label: '横版 (16:9)',
    description: '适合电脑壁纸、社交媒体封面',
    recommended: '1920x1080',
  },
};

export function PosterGenPage() {
  const [characterImages, setCharacterImages] = useState<string[]>([]);
  const [posterReference, setPosterReference] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [posterSize, setPosterSize] = useState<PosterSize>('portrait');
  const [selectedModel, setSelectedModel] = useState<string>('wanx');
  
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
            上传角色参考图和提示词，AI 将生成海报
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

      {/* Size Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            海报尺寸
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(POSTER_SIZES).map(([key, size]) => (
              <button
                key={key}
                onClick={() => setPosterSize(key as PosterSize)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  posterSize === key
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                }`}
              >
                <div className="font-medium mb-1">{size.label}</div>
                <div className="text-sm text-gray-500 mb-2">{size.description}</div>
                <div className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  推荐: {size.recommended}
                </div>
                {posterSize === key && (
                  <div className="mt-2 text-xs text-primary-600 dark:text-primary-400 font-medium">
                    ✓ 已选择
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Character Reference */}
      <Card>
        <CardHeader>
          <CardTitle>角色参考图</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="text-sm text-gray-500 mb-2 block">必填</Label>
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
          <CardTitle>海报参考图</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="text-sm text-gray-500 mb-2 block">选填</Label>
          <ImageUploadZone
            images={posterReference}
            onImagesChange={setPosterReference}
            multiple={false}
          />
        </CardContent>
      </Card>

      {/* Prompt Input */}
      <Card>
        <CardHeader>
          <CardTitle>海报描述</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述海报的主题、风格、场景..."
            className="min-h-[120px]"
          />
          
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
                  生成海报
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
            <div className={posterSize === 'portrait' ? 'aspect-[9/16]' : 'aspect-video'}>
              <img
                src={base64ToDataUrl(generatedImage)}
                alt="Generated Poster"
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-4 flex justify-end">
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
