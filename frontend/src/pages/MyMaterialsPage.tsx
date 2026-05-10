import { useState, useEffect } from 'react';
import { Trash2, Image, Loader2, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RecordDetailDialog } from '@/components/RecordDetailDialog';
import { recordsApi } from '@/services/api';
import { formatRelativeTime, formatTokens, base64ToDataUrl } from '@/lib/utils';
import type { GenerationRecord } from '@/types';

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  inspiration: <Image className="w-4 h-4" />,
  character: <Image className="w-4 h-4" />,
  threeview: <Image className="w-4 h-4" />,
  poster: <Image className="w-4 h-4" />,
  cg: <Image className="w-4 h-4" />,
};

const FEATURE_LABELS: Record<string, string> = {
  inspiration: '灵感提示',
  character: '文生图',
  threeview: '角色三视图',
  poster: '海报生成',
  cg: 'CG生成',
};

function getFirstImage(record: GenerationRecord): string | null {
  const images = record.generatedImages;
  if (!images) return null;
  if (Array.isArray(images)) return images[0];
  return images.split(',')[0];
}

function getImageCount(record: GenerationRecord): number {
  const images = record.generatedImages;
  if (!images) return 0;
  if (Array.isArray(images)) return images.length;
  return images.split(',').length;
}

export function MyMaterialsPage() {
  const [records, setRecords] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<GenerationRecord | null>(null);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      // 一次性加载所有记录（每页1000条）
      const response = await recordsApi.getAll(1, 1000);
      const allRecords = response.data.records || [];
      // 过滤只包含生成图片的记录
      const materialRecords = allRecords.filter(
        record => record.generatedImages && (
          (Array.isArray(record.generatedImages) && record.generatedImages.length > 0) ||
          (typeof record.generatedImages === 'string' && record.generatedImages.length > 0)
        )
      );
      setRecords(materialRecords);
    } catch (error) {
      console.error('Failed to load materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await recordsApi.delete(id);
      setRecords(records.filter(r => r.id !== id));
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    } catch (error) {
      console.error('Failed to delete record:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的素材</h1>
        {!loading && records.length > 0 && (
          <span className="text-sm text-gray-500">共 {records.length} 个素材</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        </div>
      ) : records.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-12 text-center text-primary-700/70">
            <Image className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">暂无素材图片</p>
            <p className="text-sm mt-2 opacity-60">生成的图片将自动显示在这里</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {records.map((record) => {
            const firstImage = getFirstImage(record);
            const imageCount = getImageCount(record);
            if (!firstImage) return null;
            return (
              <Card key={record.id} className="glass-card group hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden">
                <div className="relative">
                  {/* Thumbnail */}
                  <div className="relative w-full aspect-square cursor-pointer" onClick={() => setSelectedRecord(record)}>
                    <img
                      src={base64ToDataUrl(firstImage)}
                      alt="Generated material"
                      className="w-full h-full object-cover"
                    />
                    {imageCount > 1 && (
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                        +{imageCount - 1}
                      </div>
                    )}
                    {/* Hover actions overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); }}
                        className="text-white hover:text-white hover:bg-white/20 bg-white/10"
                      >
                        <Eye className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                        className="text-white hover:text-white hover:bg-red-500/50 bg-white/10"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 text-[10px] leading-none">
                        {FEATURE_ICONS[record.featureType]}
                        {FEATURE_LABELS[record.featureType] || record.featureType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 leading-none">
                      <span>{formatRelativeTime(record.createdAt)}</span>
                      <span>{record.modelProvider}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <RecordDetailDialog
        record={selectedRecord}
        open={!!selectedRecord}
        onOpenChange={(open) => { if (!open) setSelectedRecord(null); }}
        onDownload={(base64, filename) => {
          const link = document.createElement('a');
          link.href = base64ToDataUrl(base64);
          link.download = filename;
          link.click();
        }}
      />
    </div>
  );
}
