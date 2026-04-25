import { useState } from 'react';
import { Wand2, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useGeneration } from '@/hooks/useGeneration';
import { useApiConfig } from '@/hooks/useApiConfig';
import { base64ToDataUrl } from '@/lib/utils';

export function CharacterGenPage() {
  const [prompt, setPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  
  const { isLoading, error, generate } = useGeneration();
  const { getCurrentConfig } = useApiConfig();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    try {
      const image = await generate(prompt);
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

  const config = getCurrentConfig();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold gradient-text">角色生图</h1>
        <p className="text-gray-600 dark:text-gray-400">
          输入提示词，AI 将生成角色图片
        </p>
      </div>

      {/* Prompt Input */}
      <Card>
        <CardHeader>
          <CardTitle>提示词</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想生成的角色形象..."
            className="min-h-[120px]"
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>当前模型:</span>
              <span className="bg-primary-100 dark:bg-primary-900 px-2 py-0.5 rounded-full text-primary-600 dark:text-primary-300">
                {config?.model || '未配置'}
              </span>
            </div>
            
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isLoading}
              className="px-6"
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
        <Card className="border-red-300 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4 text-red-600 dark:text-red-400">
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
            <Card key={index} className="overflow-hidden">
              <img
                src={base64ToDataUrl(img)}
                alt={`Generated ${index + 1}`}
                className="w-full aspect-square object-cover"
              />
              <CardContent className="p-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
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
