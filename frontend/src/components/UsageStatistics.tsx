import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { recordsApi } from '@/services/api';
import { formatTokens } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import type { UsageStatisticsResponse, StatisticsPeriod } from '@/types/api';

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];

const PERIOD_LABELS: Record<StatisticsPeriod, string> = {
  week: '本周',
  month: '本月',
  year: '本年',
  all: '全部',
};

export function UsageStatistics() {
  const [stats, setStats] = useState<UsageStatisticsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<StatisticsPeriod>('week');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const axisColor = isDark ? '#9ca3af' : '#6b7280';
  const tickColor = isDark ? '#e5e7eb' : '#374151';
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const tooltipBg = isDark ? '#1f2937' : '#ffffff';
  const tooltipBorder = isDark ? '#4b5563' : '#e5e7eb';

  const loadStatistics = useCallback(async (p: StatisticsPeriod) => {
    setLoading(true);
    try {
      const response = await recordsApi.getStatistics(p);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics(period);
  }, [period, loadStatistics]);

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    return `${parts[1]}/${parts[2]}`;
  };

  const periods: StatisticsPeriod[] = ['week', 'month', 'year', 'all'];

  return (
    <div className="space-y-6">
      {/* Period selector + Summary */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                period === p
                  ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm font-medium'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

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
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-gray-500 mb-2">总记录数</p>
                <p className="text-3xl font-bold">{stats.totalRecords}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-gray-500 mb-2">Token 用量</p>
                <p className="text-3xl font-bold">
                  {formatTokens(stats.totalTokens)}
                  <span className="text-base text-gray-400 ml-1">Tokens</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Token usage line chart - standalone full width */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">每日 Token 用量</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.dailyTokenUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fill: tickColor, fontSize: 12 }}
                    stroke={axisColor}
                  />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 12 }}
                    stroke={axisColor}
                    tickFormatter={(v: number) => formatTokens(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                    labelFormatter={(label: any) => formatDate(String(label))}
                    formatter={(value: any) => [formatTokens(Number(value)), 'Token']}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Line
                    type="monotone"
                    dataKey="totalTokens"
                    name="Token 用量"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Model distribution pie chart + Token by model bar chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie chart: model distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">模型分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={stats.modelDistribution}
                      dataKey="count"
                      nameKey="modelName"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }: any) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                      fontSize={12}
                    >
                      {stats.modelDistribution.map((_entry, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                      formatter={(value: any, name: any) => [value, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar chart: token by model */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">各模型 Token 用量</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.tokenUsageByModel} layout="vertical" margin={{ left: 15, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      type="number"
                      tick={{ fill: tickColor, fontSize: 12 }}
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
                        fontSize: 13,
                      }}
                      formatter={(value: any) => [formatTokens(Number(value)), 'Token']}
                    />
                    <Bar dataKey="totalTokens" name="Token 用量" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
