import { useState } from 'react';
import { User, Settings, History, ChevronDown, Sun, Moon, Bot } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ThemeToggle } from './ThemeToggle';
import { ModelSelector } from './ModelSelector';
import { useTheme } from '@/hooks/useTheme';
import { useApiConfig } from '@/hooks/useApiConfig';
import { cn } from '@/lib/utils';

interface AvatarMenuProps {
  onOpenRecords: () => void;
}

export function AvatarMenu({ onOpenRecords }: AvatarMenuProps) {
  const { theme } = useTheme();
  const { currentProvider, configs } = useApiConfig();

  return (
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
            "min-w-[220px] rounded-lg border border-gray-200 dark:border-gray-700",
            "bg-white dark:bg-gray-800 shadow-xl p-1",
            "animate-in fade-in-0 zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out"
          )}
          sideOffset={8}
          align="end"
        >
          {/* Model Manager */}
          <DropdownMenu.Item className="outline-none">
            <div className="w-full">
              <ModelSelector 
                trigger={
                  <button className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm">
                    <Bot className="w-4 h-4" />
                    <span>模型管理</span>
                    <span className="ml-auto text-xs bg-primary-100 dark:bg-primary-900 px-2 py-0.5 rounded-full text-primary-600 dark:text-primary-300">
                      {currentProvider}
                    </span>
                  </button>
                }
              />
            </div>
          </DropdownMenu.Item>

          {/* Records */}
          <DropdownMenu.Item onClick={onOpenRecords} className="outline-none cursor-pointer">
            <button className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm">
              <History className="w-4 h-4" />
              <span>生成记录</span>
            </button>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

          {/* Theme Toggle */}
          <DropdownMenu.Item className="outline-none">
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
  );
}
