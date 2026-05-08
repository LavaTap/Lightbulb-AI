import { useRef } from 'react';
import { Type, ImagePlus, Trash2, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

interface PlanningToolbarProps {
  onAddTextNode: () => void;
  onAddImageNode: (imageSrc: string) => void;
  onDeleteSelected: () => void;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function PlanningToolbar({
  onAddTextNode,
  onAddImageNode,
  onDeleteSelected,
  onFitView,
  onZoomIn,
  onZoomOut,
}: PlanningToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-1 px-2 py-1.5 rounded-xl
      glass border border-gray-200 dark:border-gray-700 shadow-lg">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <ToolbarButton icon={<Type className="w-4 h-4" />} label="添加文本" onClick={onAddTextNode} />
      <ToolbarButton icon={<ImagePlus className="w-4 h-4" />} label="添加图片" onClick={handleImageSelect} />
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
      <ToolbarButton icon={<Trash2 className="w-4 h-4" />} label="删除选中" onClick={onDeleteSelected} />
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
      <ToolbarButton icon={<ZoomIn className="w-4 h-4" />} label="放大" onClick={onZoomIn} />
      <ToolbarButton icon={<ZoomOut className="w-4 h-4" />} label="缩小" onClick={onZoomOut} />
      <ToolbarButton icon={<Maximize2 className="w-4 h-4" />} label="适应视图" onClick={onFitView} />
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="p-2 rounded-lg text-gray-600 dark:text-gray-400
        hover:bg-gray-100 dark:hover:bg-gray-700
        hover:text-gray-900 dark:hover:text-gray-100
        transition-colors duration-150"
    >
      {icon}
    </button>
  );
}
