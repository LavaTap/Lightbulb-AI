import { useRef } from 'react';
import { Type, ImagePlus, Trash2, Maximize2, ZoomIn, ZoomOut, Code, Pencil } from 'lucide-react';

interface PlanningToolbarProps {
  onAddTextNode: () => void;
  onAddImageNode: (imageSrc: string) => void;
  onAddCodeNode?: (code: string, language: string) => void;
  onDeleteSelected: () => void;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleDrawMode?: () => void;
  isDrawMode?: boolean;
  selectedImageNode?: { id: string; zoomLevel: number } | null;
  onUpdateImageZoom?: (zoomLevel: number) => void;
}

export function PlanningToolbar({
  onAddTextNode,
  onAddImageNode,
  onAddCodeNode,
  onDeleteSelected,
  onFitView,
  onZoomIn,
  onZoomOut,
  onToggleDrawMode,
  isDrawMode,
  selectedImageNode,
  onUpdateImageZoom,
}: PlanningToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseInt(e.target.value);
    onUpdateImageZoom?.(newZoom);
  };

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onAddImageNode(dataUrl);
      }
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleAddCodeNode = () => {
    if (onAddCodeNode) {
      onAddCodeNode('// 在这里输入代码\nconsole.log("Hello, World!");', 'javascript');
    }
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-1 px-2 py-1.5 rounded-xl
      glass border border-gray-200 dark:border-gray-700 shadow-lg">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.svg"
        className="hidden"
        onChange={handleFileChange}
      />

      <ToolbarButton icon={<Type className="w-4 h-4" />} label="添加文本" onClick={onAddTextNode} />
      <ToolbarButton icon={<ImagePlus className="w-4 h-4" />} label="添加图片" onClick={handleImageSelect} />
      {onAddCodeNode && (
        <ToolbarButton icon={<Code className="w-4 h-4" />} label="添加代码" onClick={handleAddCodeNode} />
      )}
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
      <ToolbarButton icon={<Trash2 className="w-4 h-4" />} label="删除选中" onClick={onDeleteSelected} />
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
      <ToolbarButton icon={<ZoomIn className="w-4 h-4" />} label="放大" onClick={onZoomIn} />
      <ToolbarButton icon={<ZoomOut className="w-4 h-4" />} label="缩小" onClick={onZoomOut} />
      <ToolbarButton icon={<Maximize2 className="w-4 h-4" />} label="适应视图" onClick={onFitView} />
      
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
      
      {/* 画笔模式按钮 */}
      <ToolbarButton
        icon={<Pencil className="w-4 h-4" />}
        label={isDrawMode ? "退出画笔" : "画笔"}
        onClick={onToggleDrawMode}
        active={isDrawMode}
      />

      {/* 只在选中图片时显示缩放滑动条 */}
      {selectedImageNode && onUpdateImageZoom && (
        <>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
          <div className="flex items-center gap-1 px-2">
            <input
              type="range"
              min="10"
              max="500"
              value={selectedImageNode.zoomLevel}
              onChange={handleImageZoomChange}
              className="w-24 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(selectedImageNode.zoomLevel - 10) / 490 * 100}%, #d1d5db ${(selectedImageNode.zoomLevel - 10) / 490 * 100}%, #d1d5db 100%)`
              }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-center">
              {selectedImageNode.zoomLevel}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2 rounded-lg transition-colors duration-150 ${
        active
          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
      }`}
    >
      {icon}
    </button>
  );
}
