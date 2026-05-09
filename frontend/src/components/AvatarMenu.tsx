import { useState } from 'react';
import { User, History, ChevronDown, Sun, Moon, Bot, BarChart3 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { ThemeToggle } from './ThemeToggle';
import { ModelManagerContent } from './ModelManagerContent';
import { UsageStatistics } from './UsageStatistics';
import { useTheme } from '@/hooks/useTheme';
import { useApiConfig } from '@/hooks/useApiConfig';
import { cn } from '@/lib/utils';

interface AvatarMenuProps {
  onOpenRecords: () => void;
}

export function AvatarMenu({ onOpenRecords }: AvatarMenuProps) {
  const { theme } = useTheme();
  const { currentProvider } = useApiConfig();
  const [modelManagerOpen, setModelManagerOpen] = useState(false);
  const [statisticsOpen, setStatisticsOpen] = useState(false);

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={cn(
              "min-w-[220px] rounded-xl border border-white/30 dark:border-white/10",
              "bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-1",
              "animate-in fade-in-0 zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out"
            )}
            sideOffset={8}
            align="end"
          >
            {/* Model Manager */}
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                setModelManagerOpen(true);
              }}
              className="outline-none cursor-pointer"
            >
              <div className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm">
                <Bot className="w-4 h-4" />
                <span>模型管理</span>
                <span className="ml-auto text-xs bg-primary-100 dark:bg-primary-900 px-2 py-0.5 rounded-full text-primary-600 dark:text-primary-300">
                  {currentProvider}
                </span>
              </div>
            </DropdownMenu.Item>

            {/* Records */}
            <DropdownMenu.Item onSelect={onOpenRecords} className="outline-none cursor-pointer">
              <div className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm">
                <History className="w-4 h-4" />
                <span>生成记录</span>
              </div>
            </DropdownMenu.Item>

            {/* Usage Statistics */}
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                setStatisticsOpen(true);
              }}
              className="outline-none cursor-pointer"
            >
              <div className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm">
                <BarChart3 className="w-4 h-4" />
                <span>用量统计</span>
              </div>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="h-px bg-white/30 dark:bg-white/10 my-1" />

            {/* Theme Toggle */}
            <DropdownMenu.Item className="outline-none" onSelect={(e) => e.preventDefault()}>
              <div className="flex items-center justify-between w-full px-3 py-2">
                <div className="flex items-center gap-3 text-sm">
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <span>主题模式</span>
                </div>
                <ThemeToggle />
              </div>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Model Manager Dialog */}
      <Dialog.Root open={modelManagerOpen} onOpenChange={setModelManagerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 sm:max-w-[700px] max-h-[90vh] w-[95vw] overflow-y-auto rounded-2xl border border-white/30 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl p-6 shadow-[0_16px_64px_rgba(0,0,0,0.15)] animate-in fade-in-0 zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out">
            <ModelManagerContent onClose={() => setModelManagerOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Usage Statistics Dialog */}
      <Dialog.Root open={statisticsOpen} onOpenChange={setStatisticsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 sm:max-w-[900px] max-h-[90vh] w-[95vw] overflow-y-auto rounded-2xl border border-white/30 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl p-6 shadow-[0_16px_64px_rgba(0,0,0,0.15)] animate-in fade-in-0 zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold">用量统计</Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
              </Dialog.Close>
            </div>
            <UsageStatistics />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
