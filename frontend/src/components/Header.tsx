import { useRef } from 'react';
import { Lightbulb } from 'lucide-react';
import { AvatarMenu } from './AvatarMenu';
import type { FeatureType } from '@/types';

interface HeaderProps {
  activeTab: FeatureType;
  onTabChange: (tab: FeatureType) => void;
  onOpenRecords: () => void;
}

const TABS: { id: FeatureType; label: string }[] = [
  { id: 'inspiration', label: '灵感提示' },
  { id: 'character', label: '角色生图' },
  { id: 'threeview', label: '角色三视图' },
  { id: 'poster', label: '海报生成' },
  { id: 'cg', label: 'CG生成' },
];

export function Header({ activeTab, onTabChange, onOpenRecords }: HeaderProps) {
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
      className="sticky top-0 z-40 glass border-b border-gray-200 dark:border-gray-700 transition-all duration-300"
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
          {TABS.map((tab) => (
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
          ))}
        </nav>

        {/* Mobile Tabs */}
        <select
          value={activeTab}
          onChange={(e) => onTabChange(e.target.value as FeatureType)}
          className="md:hidden px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
        >
          {TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>

        {/* Actions */}
        <AvatarMenu onOpenRecords={onOpenRecords} />
      </div>
    </header>
  );
}
