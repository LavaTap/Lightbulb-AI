import { useState } from 'react';
import { Wand2, Loader2, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import { useGeneration } from '@/hooks/useGeneration';
import { base64ToDataUrl } from '@/lib/utils';

export function ThreeViewPage() {
  const [referenceImage, setReferenceImage] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');  // 用户自定义提示词
  
  const { isLoading, error, analyze, generateThreeView } = useGeneration();

  const handleAnalyzeAndGenerate = async () => {
    if (referenceImage.length === 0) return;
    
    setAnalyzing(true);
    try {
      // 如果有用户输入的提示词，直接使用；否则先分析画风
      if (userPrompt.trim()) {
        const images = await generateThreeView(referenceImage[0], analysisPrompt, userPrompt);
        setGeneratedImages(images);
      } else {
        const result = await analyze(referenceImage[0]);
        const prompt = result.analysis.en;
        setAnalysisPrompt(prompt);
        const images = await generateThreeView(referenceImage[0], prompt, '');
        setGeneratedImages(images);
      }
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold gradient-text">角色三视图</h1>
        <p className="text-gray-600 dark:text-gray-400">
          上传角色参考图，AI 将分析画风并生成三视图
        </p>
      </div>

      {/* Reference Image Upload */}
      <Card>
        <CardHeader>
          <CardTitle>参考图上传</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploadZone
            images={referenceImage}
            onImagesChange={setReferenceImage}
            multiple={false}
          />
        </CardContent>
      </Card>

      {/* User Custom Prompt Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">自定义提示词（可选）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="输入你想要的三视图描述，如：银发红瞳的女战士，穿着华丽的盔甲...（留空则使用AI分析结果）"
            className="min-h-[80px]"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            提示：你可以同时上传参考图 + 输入提示词，AI会结合两者生成更符合预期的三视图
          </p>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleAnalyzeAndGenerate}
          disabled={referenceImage.length === 0 || isLoading}
          size="lg"
          className="px-8"
        >
          {isLoading || analyzing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4 mr-2" />
          )}
          生成三视图
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4 text-red-600 dark:text-red-400">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Analysis Prompt */}
      {(analysisPrompt || analyzing) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">画风分析</CardTitle>
          </CardHeader>
          <CardContent>
            {analyzing ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>正在分析画风...</span>
              </div>
            ) : (
              <Textarea
                value={analysisPrompt}
                onChange={(e) => setAnalysisPrompt(e.target.value)}
                className="min-h-[100px]"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Generated Three Views */}
      {generatedImages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold text-center">生成结果</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {generatedImages.map((img, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="aspect-square relative">
                  <img
                    src={base64ToDataUrl(img)}
                    alt={viewLabels[index]}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3 flex justify-between items-center">
                    <span className="text-white font-medium">{viewLabels[index]}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-white hover:text-white hover:bg-white/20"
                      onClick={() => handleDownload(img, `threeview-${viewLabels[index]}.png`)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
