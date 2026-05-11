import { useState } from 'react';
import { Wand2, Download, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { ModelDropdown } from '@/components/ModelDropdown';
import { useGeneration } from '@/hooks/useGeneration';
import { modelConfigToApiConfig } from '@/lib/model-utils';
import type { ModelConfig } from '@/types';
import { base64ToDataUrl } from '@/lib/utils';

export function StoryboardGenPage() {
  const [characterImages, setCharacterImages] = useState<string[]>([]);
  const [sceneImage, setSceneImage] = useState<string[]>([]);
  const [themePrompt, setThemePrompt] = useState('');
  const [abilityPrompt, setAbilityPrompt] = useState('');
  const [combatPrompt, setCombatPrompt] = useState('');
  const [atmospherePrompt, setAtmospherePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('wanx');
  const [selectedModelConfig, setSelectedModelConfig] = useState<ModelConfig | null>(null);

  const { isLoading, error, generateStoryboard } = useGeneration();

  const handleGenerate = async () => {
    if (!themePrompt.trim() || !abilityPrompt.trim() || !combatPrompt.trim() || !atmospherePrompt.trim()) return;

    try {
      const config = selectedModelConfig ? modelConfigToApiConfig(selectedModelConfig) : undefined;
      const scene = sceneImage.length > 0 ? sceneImage[0] : undefined;
      const image = await generateStoryboard(characterImages, scene, themePrompt, abilityPrompt, combatPrompt, atmospherePrompt, config);
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

  const handleModelChange = (modelId: string, modelConfig: ModelConfig) => {
    setSelectedModel(modelConfig.model);
    setSelectedModelConfig(modelConfig);
  };

  const isGenerateDisabled = isLoading
    || !themePrompt.trim()
    || !abilityPrompt.trim()
    || !combatPrompt.trim()
    || !atmospherePrompt.trim();

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

      {/* Prompt Inputs - All Required */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-700 dark:text-primary-300">
            分镜设定
            <span className="text-red-600 dark:text-red-400 text-xs font-normal">* 全部必填</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">题材设定</Label>
            <Textarea
              id="theme"
              value={themePrompt}
              onChange={(e) => setThemePrompt(e.target.value)}
              placeholder="例如：超级英雄都市对战，魔法少女对决怪物..."
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ability">人物能力</Label>
            <Textarea
              id="ability"
              value={abilityPrompt}
              onChange={(e) => setAbilityPrompt(e.target.value)}
              placeholder="描述双方角色的能力、招式、特征..."
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="combat">对战逻辑</Label>
            <Textarea
              id="combat"
              value={combatPrompt}
              onChange={(e) => setCombatPrompt(e.target.value)}
              placeholder="描述从开局对峙到分出胜负的完整过程..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="atmosphere">环境氛围</Label>
            <Textarea
              id="atmosphere"
              value={atmospherePrompt}
              onChange={(e) => setAtmospherePrompt(e.target.value)}
              placeholder="描述天气、光影、场景氛围，例如：雨夜都市，霓虹灯闪烁，暴雨倾盆..."
              className="min-h-[60px]"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={isGenerateDisabled}
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
          <CardContent className="p-4 text-red-700 dark:text-red-300">
            {error}
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
