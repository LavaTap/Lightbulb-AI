import { useRef } from 'react';
import { Lightbulb, ChevronDown } from 'lucide-react';
import { AvatarMenu } from './AvatarMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FeatureType } from '@/types';

interface HeaderProps {
  activeTab: FeatureType;
  onTabChange: (tab: FeatureType) => void;
  onOpenRecords: () => void;
  onOpenMaterials: () => void;
  onOpenStatistics: () => void;
}

const TABS: { id: FeatureType; label: string }[] = [
  { id: 'inspiration', label: '灵感提示' },
  { id: 'storyboard-prompt', label: '分镜词分析' },
  { id: 'chat', label: 'AI 对话' },
  { id: 'character', label: '文生图' },
  { id: 'threeview', label: '角色三视图' },
  { id: 'poster', label: '海报生成' },
  { id: 'storyboard', label: '九宫格分镜' },
  { id: 'cg', label: 'CG生成' },
  { id: 'planning', label: '计划面板' },
  { id: 'materials', label: '我的素材' },
  { id: 'statistics', label: '用量统计' },
];

export function Header({ activeTab, onTabChange, onOpenRecords, onOpenMaterials, onOpenStatistics }: HeaderProps) {
  const headerRef = useRef<HTMLElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!headerRef.current) return;
    const rect = headerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    headerRef.current.style.setProperty('--mouse-x', `${x}%`);
    headerRef.current.style.setProperty('--mouse-y', `${y}%`);
  };

  return (
    <header 
      ref={headerRef}
      className="sticky top-0 z-40 glass border-b border-white/30 dark:border-white/10 transition-all duration-300"
      style={{ '--mouse-x': '50%', '--mouse-y': '50%' } as React.CSSProperties}
      onMouseMove={handleMouseMove}
    >
      {/* Ambient glow effect */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-500
          bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(59,130,246,0.12)_0%,transparent_50%)] 
          dark:bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(139,92,246,0.15)_0%,transparent_50%)]"
      />
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between relative">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text hidden sm:block">Lightbulb AI</span>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {TABS.map((tab) => {
            // 处理文本子菜单和生图子菜单中的页面，不在导航栏直接显示
            if (['inspiration', 'storyboard-prompt', 'character', 'threeview', 'poster', 'storyboard', 'cg', 'materials', 'statistics'].includes(tab.id)) {
              return null;
            }
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  group relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${activeTab === tab.id
                    ? 'text-blue-500 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400'
                  }
                `}
              >
                {/* Text with gradient animation on hover */}
                <span className="relative z-10 inline-block transition-all duration-300 
                  group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-cyan-500 group-hover:bg-clip-text group-hover:text-transparent group-hover:scale-110
                  dark:group-hover:bg-gradient-to-r dark:group-hover:from-blue-400 dark:group-hover:to-cyan-400 dark:group-hover:bg-clip-text dark:group-hover:text-transparent">
                  {tab.label}
                </span>
                {/* Underline grow animation */}
                <span className={`
                  absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5
                  transition-all duration-300 rounded-full
                  ${activeTab === tab.id ? 'w-full' : 'w-0 group-hover:w-full'}
                  bg-gradient-to-r from-blue-500 to-cyan-500
                  dark:from-blue-400 dark:to-cyan-400
                `}></span>
              </button>
            );
          })}
          
          {/* 文本子菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`
                group relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${['inspiration', 'storyboard-prompt'].some(id => activeTab === id)
                  ? 'text-blue-500 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400'
                }
              `}
            >
              <span className="relative z-10 inline-block transition-all duration-300 
                group-hover:bg-gradient-to-r group-hover:from-purple-500 group-hover:to-pink-500 group-hover:bg-clip-text group-hover:text-transparent group-hover:scale-110
                dark:group-hover:bg-gradient-to-r dark:group-hover:from-purple-400 dark:group-hover:to-pink-400 dark:group-hover:bg-clip-text dark:group-hover:text-transparent flex items-center gap-1">
                文本模块
                <ChevronDown className="h-3 w-3" />
              </span>
              <span className={`
                absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5
                transition-all duration-300 rounded-full
                ${['inspiration', 'storyboard-prompt'].some(id => activeTab === id)
                  ? 'w-full'
                  : 'w-0 group-hover:w-full'
                }
                bg-gradient-to-r from-purple-500 to-pink-500
                dark:from-purple-400 dark:to-pink-400
              `}></span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              <DropdownMenuItem onClick={() => onTabChange('inspiration')}>
                灵感提示
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('storyboard-prompt')}>
                分镜词分析
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 生图子菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`
                group relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${['character', 'threeview', 'poster', 'storyboard', 'cg'].some(id => activeTab === id)
                  ? 'text-blue-500 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400'
                }
              `}
            >
              <span className="relative z-10 inline-block transition-all duration-300 
                group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-cyan-500 group-hover:bg-clip-text group-hover:text-transparent group-hover:scale-110
                dark:group-hover:bg-gradient-to-r dark:group-hover:from-blue-400 dark:group-hover:to-cyan-400 dark:group-hover:bg-clip-text dark:group-hover:text-transparent flex items-center gap-1">
                生图模块
                <ChevronDown className="h-3 w-3" />
              </span>
              <span className={`
                absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5
                transition-all duration-300 rounded-full
                ${['character', 'threeview', 'poster', 'storyboard', 'cg'].some(id => activeTab === id)
                  ? 'w-full'
                  : 'w-0 group-hover:w-full'
                }
                bg-gradient-to-r from-blue-500 to-cyan-500
                dark:from-blue-400 dark:to-cyan-400
              `}></span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              <DropdownMenuItem onClick={() => onTabChange('character')}>
                文生图
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('threeview')}>
                角色三视图
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('poster')}>
                海报生成
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('storyboard')}>
                九宫格分镜
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('cg')}>
                CG生成
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Mobile Tabs */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm`}
            >
              {TABS.find(t => t.id === activeTab)?.label || '选择页面'}
              <ChevronDown className="ml-2 h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              {/* 主菜单项（不含文本/生图子菜单内页面） */}
              {TABS.map((tab) => {
                if (['inspiration', 'storyboard-prompt', 'character', 'threeview', 'poster', 'storyboard', 'cg', 'materials', 'statistics'].includes(tab.id)) {
                  return null;
                }
                return (
                  <DropdownMenuItem key={tab.id} onClick={() => onTabChange(tab.id)}>
                    {tab.label}
                  </DropdownMenuItem>
                );
              })}
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              <DropdownMenuItem disabled className="text-xs text-gray-500">
                文本模块
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('inspiration')}>
                灵感提示
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('storyboard-prompt')}>
                分镜词分析
              </DropdownMenuItem>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              <DropdownMenuItem disabled className="text-xs text-gray-500">
                生图模块
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('character')}>
                文生图
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('threeview')}>
                角色三视图
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('poster')}>
                海报生成
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('storyboard')}>
                九宫格分镜
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange('cg')}>
                CG生成
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Actions */}
        <AvatarMenu onOpenRecords={onOpenRecords} onOpenMaterials={onOpenMaterials} onOpenStatistics={onOpenStatistics} />
      </div>
    </header>
  );
}
