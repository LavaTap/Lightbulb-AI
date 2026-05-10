import { Header } from './Header';
import type { FeatureType, GenerationRecord } from '@/types';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { RecordsPage } from '../pages/RecordsPage';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: FeatureType;
  onTabChange: (tab: FeatureType) => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const [recordsOpen, setRecordsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-transparent transition-colors duration-200">
      <Header
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenRecords={() => setRecordsOpen(true)}
        onOpenMaterials={() => onTabChange('materials')}
        onOpenStatistics={() => onTabChange('statistics')}
      />
      
      <main className="flex-1">
        {children}
      </main>

      <Dialog open={recordsOpen} onOpenChange={setRecordsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>生成记录</DialogTitle>
          </DialogHeader>
          <RecordsPage embedded />
        </DialogContent>
      </Dialog>
    </div>
  );
}
