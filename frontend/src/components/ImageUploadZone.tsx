import { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/utils';

interface ImageUploadZoneProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  multiple?: boolean;
  maxImages?: number;
  className?: string;
}

export function ImageUploadZone({
  images,
  onImagesChange,
  multiple = false,
  maxImages = 10,
  className,
}: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    try {
      const base64 = await compressImage(file);
      if (multiple) {
        if (images.length < maxImages) {
          onImagesChange([...images, base64]);
        }
      } else {
        onImagesChange([base64]);
      }
    } catch (error) {
      console.error('Failed to process image:', error);
    }
  }, [images, multiple, maxImages, onImagesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(handleFile);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(handleFile);
  }, [handleFile]);

  const removeImage = useCallback((index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  }, [images, onImagesChange]);

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
          isDragging
            ? "border-primary-500 bg-primary-500/10"
            : "border-gray-300 dark:border-gray-600 hover:border-primary-400"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className={cn(
          "w-12 h-12 mx-auto mb-4 transition-colors",
          isDragging ? "text-primary-500" : "text-gray-400"
        )} />
        <p className="text-gray-600 dark:text-gray-400">
          拖拽图片到此处，或点击上传
        </p>
        <p className="text-sm text-gray-400 mt-2">
          支持 JPG、PNG 格式{multiple ? `（最多${maxImages}张）` : ''}
        </p>
      </div>

      {images.length > 0 && (
        <div className={cn(
          "grid gap-4",
          multiple ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1"
        )}>
          {images.map((img, index) => (
            <div key={index} className="relative group">
              <img
                src={`data:image/jpeg;base64,${img}`}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
