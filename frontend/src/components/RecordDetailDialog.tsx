import { Download, Image, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { formatTokens, base64ToDataUrl } from '@/lib/utils';
import type { GenerationRecord } from '@/types';

const FEATURE_LABELS: Record<string, string> = {
  inspiration: '灵感提示',
  character: '文生图',
  threeview: '角色三视图',
  poster: '海报生成',
};

const VIEW_LABELS = ['正面', '侧面', '背面'];

interface RecordDetailDialogProps {
  record: GenerationRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: (base64: string, filename: string) => void;
}

export function RecordDetailDialog({
  record,
  open,
  onOpenChange,
  onDownload,
}: RecordDetailDialogProps) {
  // 原图查看状态
  const [showOriginal, setShowOriginal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!record) return null;

  const handleDownload = (base64: string, filename: string) => {
    if (onDownload) {
      onDownload(base64, filename);
      return;
    }
    // Fallback download logic
    const link = document.createElement('a');
    link.href = base64ToDataUrl(base64);
    link.download = filename;
    link.click();
  };

  const formatPrompt = (prompt: string | undefined): string => {
    if (!prompt) return '';
    try {
      const parsed = JSON.parse(prompt);
      if (parsed.analysis) {
        return parsed.analysis.zh || parsed.analysis.en || '';
      }
    } catch {
      // Just return as-is
    }
    return prompt;
  };

  const generatedImages = Array.isArray(record.generatedImages)
    ? record.generatedImages
    : record.generatedImages?.split(',') || [];

  // 处理原图
  const generatedImagesOriginal = Array.isArray(record.generatedImagesOriginal)
    ? record.generatedImagesOriginal
    : record.generatedImagesOriginal?.split(',') || [];

  const uploadImages = Array.isArray(record.uploadImages)
    ? record.uploadImages.join(',')
    : record.uploadImages;

  // 处理上传原图
  const uploadImagesOriginal = Array.isArray(record.uploadImagesOriginal)
    ? record.uploadImagesOriginal.join(',')
    : record.uploadImagesOriginal;

  // 当前显示的图片（根据 showOriginal 状态切换）
  const currentGeneratedImages = showOriginal && generatedImagesOriginal.length > 0
    ? generatedImagesOriginal
    : generatedImages;

  // 是否有原图可用
  const hasOriginal = generatedImagesOriginal.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden top-[8vh] translate-y-0">
        <DialogHeader>
          <DialogTitle>
            {FEATURE_LABELS[record.featureType] || record.featureType} - 详情
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(85vh-100px)] pr-1 space-y-4">
          {/* Generated Images */}
          {currentGeneratedImages.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {record.featureType === 'threeview' ? '生成图片（三视图）' : '生成图片'}
                  </span>
                  {hasOriginal && (
                    <Button
                      variant={showOriginal ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowOriginal(!showOriginal)}
                      className="h-7 px-2 text-xs"
                    >
                      <ZoomIn className="w-3 h-3 mr-1" />
                      {showOriginal ? '高清原图' : '查看原图'}
                    </Button>
                  )}
                  {!hasOriginal && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">(缩略图)</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {showOriginal && hasOriginal && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentGeneratedImages.length === 1) {
                          handleDownload(currentGeneratedImages[0], 'generated-original.png');
                        } else {
                          currentGeneratedImages.forEach((img, i) => {
                            handleDownload(img, `generated-original-${i + 1}.png`);
                          });
                        }
                      }}
                    >
                      <Image className="w-4 h-4 mr-1" />
                      下载原图
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (generatedImages.length === 1) {
                        handleDownload(generatedImages[0], 'generated.png');
                      } else {
                        generatedImages.forEach((img, i) => {
                          handleDownload(img, `generated-${i + 1}.png`);
                        });
                      }
                    }}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    {showOriginal && hasOriginal ? '下载缩略图' : '下载'}
                  </Button>
                </div>
              </div>
              <div className={currentGeneratedImages.length > 1 ? 'grid grid-cols-3 gap-2' : ''}>
                {(currentGeneratedImages as string[]).map((img: string, i: number) => (
                  <div key={i} className="relative">
                    <img
                      src={base64ToDataUrl(img)}
                      alt={`Generated ${i + 1}`}
                      className="w-full rounded-lg"
                    />
                    {currentGeneratedImages.length > 1 && (
                      <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                        {VIEW_LABELS[i] || `图片${i + 1}`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Image */}
          {uploadImages && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">参考图片</span>
                {uploadImagesOriginal && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleDownload(uploadImagesOriginal, 'upload-original.png');
                    }}
                  >
                    <Image className="w-4 h-4 mr-1" />
                    下载原图
                  </Button>
                )}
              </div>
              <img
                src={base64ToDataUrl(uploadImages)}
                alt="Upload"
                className="max-h-48 rounded-lg"
              />
            </div>
          )}

          {/* Prompt / Text Content */}
          {record.prompt && (
            <div>
              <span className="text-sm font-medium block mb-2">
                {generatedImages.length === 0 ? '文本内容' : '提示词'}
              </span>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/80 rounded-lg text-sm whitespace-pre-wrap leading-relaxed max-h-[40vh] overflow-y-auto">
                {formatPrompt(record.prompt)}
              </div>
            </div>
          )}

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4 text-sm pb-2">
            <div>
              <span className="text-gray-500 dark:text-gray-400">服务商</span>
              <p className="font-medium mt-0.5">{record.modelProvider}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">模型</span>
              <p className="font-medium mt-0.5">{record.modelName}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Token消耗</span>
              <p className="font-medium mt-0.5">{formatTokens(record.tokenUsage)}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">生成时间</span>
              <p className="font-medium mt-0.5">{new Date(record.createdAt).toLocaleString('zh-CN')}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
