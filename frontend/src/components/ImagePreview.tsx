import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

export interface ImagePreviewProps {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export function ImagePreview({ visible, images, initialIndex, onClose }: ImagePreviewProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const previewRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // 使用 ref 管理拖拽/缩放状态，避免闭包问题
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragPosRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  const currentImage = images[currentIndex] ?? null;

  // 重置所有状态
  const resetState = useCallback(() => {
    setScale(1);
    scaleRef.current = 1;
    setRotation(0);
    setDragPos({ x: 0, y: 0 });
    dragPosRef.current = { x: 0, y: 0 };
    isDraggingRef.current = false;
  }, []);

  // visible 或 initialIndex 变化时重置
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      resetState();
    }
  }, [visible, initialIndex, resetState]);

  // 切换图片
  const navigateImage = useCallback((direction: 1 | -1) => {
    if (images.length <= 1) return;
    setCurrentIndex(prev => (prev + direction + images.length) % images.length);
    resetState();
  }, [images.length, resetState]);

  // 键盘事件
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') navigateImage(-1);
      else if (e.key === 'ArrowRight') navigateImage(1);
      else if (e.key === '=' || e.key === '+') setScale(s => Math.min(s + 0.25, 5));
      else if (e.key === '-') setScale(s => Math.max(s - 0.25, 0.25));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose, navigateImage]);

  // 滚轮缩放 - 使用 useLayoutEffect + ref 确保 passive:false 生效
  useLayoutEffect(() => {
    const el = imageContainerRef.current;
    if (!el || !visible) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(0.25, Math.min(scaleRef.current + delta, 5));
      scaleRef.current = newScale;
      setScale(newScale);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [visible]);

  // 拖拽开始 - 使用 ref 避免闭包
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scaleRef.current <= 1) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - dragPosRef.current.x,
      y: e.clientY - dragPosRef.current.y,
    };
  }, []);

  // 拖拽移动 - 使用 ref 避免闭包
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const newPos = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    };
    dragPosRef.current = newPos;
    setDragPos(newPos);
  }, []);

  // 拖拽结束
  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // 下载图片
  const handleDownload = useCallback(() => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentImage]);

  return createPortal(
    <AnimatePresence>
      {visible && currentImage && (
        <motion.div
          ref={previewRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={onClose}
        >
          {/* 模糊背景 */}
          <div className="absolute inset-0 backdrop-blur-sm" />

          {/* 顶部工具栏 */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/50 to-transparent">
            {/* 图片计数器 */}
            {images.length > 1 && (
              <span className="text-white/80 text-sm font-medium">
                {currentIndex + 1} / {images.length}
              </span>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {/* 缩小按钮 */}
              <button
                onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(s - 0.25, 0.25)); }}
                className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                title="缩小"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-white/80 text-xs min-w-[3rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              {/* 放大按钮 */}
              <button
                onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s + 0.25, 5)); }}
                className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                title="放大"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              {/* 旋转按钮 */}
              <button
                onClick={(e) => { e.stopPropagation(); setRotation(r => r + 90); }}
                className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                title="旋转"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              {/* 下载按钮 */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                title="下载"
              >
                <Download className="h-4 w-4" />
              </button>
              {/* 关闭按钮 */}
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 transition-colors ml-1"
                title="关闭 (ESC)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 图片容器 */}
          <div
            ref={imageContainerRef}
            className="relative z-[1] select-none"
            style={{
              cursor: scaleRef.current > 1 ? (isDraggingRef.current ? 'grabbing' : 'grab') : 'default',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: scale,
                opacity: 1,
                rotate: rotation,
                x: dragPos.x,
                y: dragPos.y,
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              src={currentImage}
              alt="preview"
              className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
              draggable={false}
            />
          </div>

          {/* 左右切换按钮 */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navigateImage(-1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm"
                title="上一张 (←)"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigateImage(1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm"
                title="下一张 (→)"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* 底部提示 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white/50 text-xs bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
            滚轮缩放 · 拖拽移动 · ESC 关闭
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
