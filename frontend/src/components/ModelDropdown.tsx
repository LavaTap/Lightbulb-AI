import { useState } from 'react';
import { Bot, ChevronDown, Check } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useApiConfig } from '@/hooks/useApiConfig';
import { cn } from '@/lib/utils';
import type { ModelCategory, ModelConfig } from '@/types';

interface ModelDropdownProps {
  category: ModelCategory | ModelCategory[];
  selectedModel: string;
  onModelChange: (modelId: string, config: ModelConfig) => void;
}

export function ModelDropdown({ category, selectedModel, onModelChange }: ModelDropdownProps) {
  const { modelConfigs, getConfigsByCategory } = useApiConfig();
  
  const filteredConfigs = getConfigsByCategory(category);
  
  const selectedConfig = filteredConfigs.find(c => c.model === selectedModel || c.id.toString() === selectedModel);

  const categories = Array.isArray(category) ? category : [category];
  
  const categoryLabels: Record<string, string> = {
    vision: '多模态 / 视觉分析',
    'text-to-image': '文生图',
    'image-to-image': '图生图',
    multimodal: '图文多模态',
    text: '纯文本',
  };

  const label = categories.length > 1
    ? categories.map(c => categoryLabels[c] || c).join(' / ')
    : (categoryLabels[category as string] || String(category));

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700",
          "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm",
          "bg-white dark:bg-gray-800 shadow-sm"
        )}>
          <Bot className="w-4 h-4 text-primary-500" />
          <span className="font-medium">
            {selectedConfig?.name || selectedModel || '选择模型'}
          </span>
          <span className="text-xs bg-primary-100 dark:bg-primary-900 px-2 py-0.5 rounded-full text-primary-600 dark:text-primary-300">
            {selectedConfig?.model || '未配置'}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            "min-w-[240px] rounded-lg border border-gray-200 dark:border-gray-700",
            "bg-white dark:bg-gray-800 shadow-xl p-1",
            "animate-in fade-in-0 zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "max-h-[320px] overflow-y-auto"
          )}
          sideOffset={8}
          align="start"
        >
          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            {label} 模型
          </div>
          
          {filteredConfigs.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-gray-500">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>暂无可用模型</p>
              <p className="text-xs mt-1">请在模型管理中添加</p>
            </div>
          ) : (
            <div className="py-1">
              {filteredConfigs.map((config) => (
                <DropdownMenu.Item
                  key={config.id}
                  onClick={() => onModelChange(config.model, config)}
                  className="outline-none cursor-pointer"
                >
                  <button
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 rounded-md",
                      "hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                      selectedConfig?.id === config.id && "bg-primary-50 dark:bg-primary-900/30"
                    )}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium text-sm">{config.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{config.model}</span>
                        {config.isActive && (
                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">
                            使用中
                          </span>
                        )}
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded",
                          config.category === 'multimodal'
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                            : config.category === 'vision'
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                              : config.category === 'text-to-image'
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : config.category === 'image-to-image'
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        )}>
                          {config.category === 'multimodal' ? '图文多模态' : config.category === 'vision' ? '视觉' : config.category === 'text-to-image' ? '文生图' : config.category === 'image-to-image' ? '图生图' : '文本'}
                        </span>
                      </div>
                    </div>
                    {selectedConfig?.id === config.id && (
                      <Check className="w-4 h-4 text-primary-500" />
                    )}
                  </button>
                </DropdownMenu.Item>
              ))}
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
