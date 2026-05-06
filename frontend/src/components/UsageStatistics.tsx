import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar,
} from 'recharts';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { recordsApi } from '@/services/api';
import { formatTokens } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import type { UsageStatisticsResponse } from '@/types/api';

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  google: 'Google',
  deepseek: 'DeepSeek',
  aliyun: '阿里云',
  tencent: '腾讯云',
  xfyun: '讯飞',
  bytedance: '字节跳动',
  baidu: '百度',
  gptimage2: 'GPTImage2',
  custom: '自定义',
};

export function UsageStatistics() {
  const [stats, setStats] = useState<UsageStatisticsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const axisColor = isDark ? '#9ca3af' : '#6b7280';
  const tickColor = isDark ? '#e5e7eb' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const tooltipBg = isDark ? '#1f2937' : '#ffffff';
  const tooltipBorder = isDark ? '#4b5563' : '#e5e7eb';

  useEffect(() => {
    if (expanded && !stats) {
      loadStatistics();
    }
  }, [expanded]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const response = await recordsApi.getStatistics();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    return `${parts[1]}/${parts[2]}`;
  };

  return (
    <div className="pt-4 border-t mt-4">
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between px-0 hover:bg-transparent"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-base font-semibold">用量统计</span>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </Button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : !stats || stats.totalRecords === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                暂无统计数据
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">总生成次数</p>
                    <p className="text-2xl font-bold">{stats.totalRecords}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">总 Token 用量</p>
                    <p className="text-2xl font-bold">{formatTokens(stats.totalTokens)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pie chart: model provider distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">模型服务商分布</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={stats.modelProviderDistribution}
                          dataKey="count"
                          nameKey="provider"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ name, percent }: any) =>
                            `${PROVIDER_LABELS[name] || name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                          fontSize={11}
                        >
                          {stats.modelProviderDistribution.map((_entry, index) => (
                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: tooltipBg,
                            border: `1px solid ${tooltipBorder}`,
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(value: any, name: any) => [value, PROVIDER_LABELS[name] || name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Line chart: daily token usage */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">每日 Token 用量</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={stats.dailyTokenUsage}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          tick={{ fill: tickColor, fontSize: 11 }}
                          stroke={axisColor}
                        />
                        <YAxis
                          tick={{ fill: tickColor, fontSize: 11 }}
                          stroke={axisColor}
                          tickFormatter={(v: number) => formatTokens(v)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: tooltipBg,
                            border: `1px solid ${tooltipBorder}`,
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          labelFormatter={(label: any) => formatDate(String(label))}
                          formatter={(value: any) => [formatTokens(Number(value)), 'Token']}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 12 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="totalTokens"
                          name="Token 用量"
                          stroke="#6366f1"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Bar chart: token usage by model (full width, horizontal) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">各模型 Token 用量</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(160, stats.tokenUsageByModel.length * 36)}>
                    <BarChart data={stats.tokenUsageByModel} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis
                        type="number"
                        tick={{ fill: tickColor, fontSize: 11 }}
                        stroke={axisColor}
                        tickFormatter={(v: number) => formatTokens(v)}
                      />
                      <YAxis
                        type="category"
                        dataKey="modelName"
                        tick={{ fill: tickColor, fontSize: 11 }}
                        stroke={axisColor}
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: tooltipBg,
                          border: `1px solid ${tooltipBorder}`,
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value: any) => [formatTokens(Number(value)), 'Token']}
                      />
                      <Bar dataKey="totalTokens" name="Token 用量" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
