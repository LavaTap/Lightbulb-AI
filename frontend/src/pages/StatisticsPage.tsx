import { UsageStatistics } from '@/components/UsageStatistics';

export function StatisticsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">用量统计</h1>
      </div>
      <UsageStatistics />
    </div>
  );
}