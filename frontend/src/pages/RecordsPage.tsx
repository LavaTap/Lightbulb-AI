import { useState, useEffect } from 'react';
import { Trash2, Sparkles, Wand2, Image, FileImage, Loader2, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RecordDetailDialog } from '@/components/RecordDetailDialog';
import { UsageStatistics } from '@/components/UsageStatistics';
import { recordsApi } from '@/services/api';
import { formatRelativeTime, formatTokens, base64ToDataUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { GenerationRecord } from '@/types';

interface RecordsPageProps {
  embedded?: boolean;
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  inspiration: <Sparkles className="w-4 h-4" />,
  character: <Wand2 className="w-4 h-4" />,
  threeview: <Image className="w-4 h-4" />,
  poster: <FileImage className="w-4 h-4" />,
};

const FEATURE_LABELS: Record<string, string> = {
  inspiration: '灵感提示',
  character: '文生图',
  threeview: '角色三视图',
  poster: '海报生成',
};

export function RecordsPage({ embedded }: RecordsPageProps) {
  const [records, setRecords] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<GenerationRecord | null>(null);

  useEffect(() => {
    loadRecords();
  }, [page]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const response = await recordsApi.getAll(page, 20);
      setRecords(response.data.records);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrompt = (prompt: string | undefined): string => {
    if (!prompt) return '';
    try {
      const parsed = JSON.parse(prompt);
      if (parsed.analysis) {
        return parsed.analysis.zh || parsed.analysis.en || '';
      }
    } catch { /* ignore */ }
    return prompt;
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
    <>
      <div className={cn("space-y-4", embedded ? 'overflow-y-auto max-h-[60vh] p-1' : 'max-w-4xl mx-auto px-4 py-8')}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">历史记录</h2>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              暂无生成记录
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <Card key={record.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    {record.generatedImages && (
                      <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 cursor-pointer hover:ring-2 hover:ring-primary-500" onClick={() => setSelectedRecord(record)}>
                        <img
                          src={base64ToDataUrl(record.generatedImages.split(',')[0])}
                          alt="Generated"
                          className="w-full h-full object-cover"
                        />
                        {record.generatedImages.includes(',') && (
                          <div className="absolute bottom-0 right-0 bg-black/50 text-white text-xs px-1 rounded-tl">
                            +{record.generatedImages.split(',').length - 1}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedRecord(record)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 text-xs">
                          {FEATURE_ICONS[record.featureType]}
                          {FEATURE_LABELS[record.featureType] || record.featureType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(record.createdAt)}
                        </span>
                      </div>
                      
                      {record.prompt && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                          {formatPrompt(record.prompt).substring(0, 100)}
                          {formatPrompt(record.prompt).length > 100 ? '...' : ''}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{record.modelProvider}</span>
                        <span>{record.modelName}</span>
                        <span>Token: {formatTokens(record.tokenUsage)}</span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {record.generatedImages && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedRecord(record)}
                          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(record.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <UsageStatistics />
      </div>

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
    </>
  );
}
