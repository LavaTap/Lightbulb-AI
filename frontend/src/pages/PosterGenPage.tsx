import { useState } from 'react';
import { Wand2, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { useGeneration } from '@/hooks/useGeneration';
import { base64ToDataUrl } from '@/lib/utils';

export function PosterGenPage() {
  const [characterImages, setCharacterImages] = useState<string[]>([]);
  const [posterReference, setPosterReference] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold gradient-text">海报生成</h1>
        <p className="text-gray-600 dark:text-gray-400">
          上传角色参考图和提示词，AI 将生成海报
        </p>
      </div>

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
            <img
              src={base64ToDataUrl(generatedImage)}
              alt="Generated Poster"
              className="w-full"
            />
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
