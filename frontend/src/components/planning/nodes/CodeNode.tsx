import { useState, useCallback, useRef, type MouseEvent } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Code, Maximize2, Minimize2 } from 'lucide-react';

export function CodeNode({ id, data, selected }: NodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [size, setSize] = useState({ width: 400, height: 200 });
  
  const resizingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const resizeCornerRef = useRef<string>('');
  const codeRef = useRef<HTMLDivElement>(null);

  const codeContent = data.code as string || '// 在这里输入代码\nconsole.log("Hello, World!");';
  const language = data.language as string || 'javascript';
  const showLineNumbers = data.showLineNumbers as boolean || true;

  const handleResizeStart = useCallback(
    (e: MouseEvent, corner: string) => {
      e.stopPropagation();
      e.preventDefault();
      resizingRef.current = true;
      resizeCornerRef.current = corner;
      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        w: size.width,
        h: size.height,
      };

      const handleResizeMove = (ev: globalThis.MouseEvent) => {
        if (!resizingRef.current) return;
        
        const dx = ev.clientX - startPosRef.current.x;
        const dy = ev.clientY - startPosRef.current.y;
        
        let newWidth = size.width;
        let newHeight = size.height;
        
        // 根据拖拽的角计算新的宽度和高度
        switch (resizeCornerRef.current) {
          case 'top-left':
            newWidth = Math.max(300, startPosRef.current.w - dx);
            newHeight = Math.max(150, startPosRef.current.h - dy);
            break;
          case 'top-right':
            newWidth = Math.max(300, startPosRef.current.w + dx);
            newHeight = Math.max(150, startPosRef.current.h - dy);
            break;
          case 'bottom-left':
            newWidth = Math.max(300, startPosRef.current.w - dx);
            newHeight = Math.max(150, startPosRef.current.h + dy);
            break;
          case 'bottom-right':
            newWidth = Math.max(300, startPosRef.current.w + dx);
            newHeight = Math.max(150, startPosRef.current.h + dy);
            break;
        }
        
        setSize({ width: newWidth, height: newHeight });
      };

      const handleResizeEnd = () => {
        resizingRef.current = false;
        resizeCornerRef.current = '';
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };

      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    },
    [size],
  );

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [codeContent]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setSize({ width: 600, height: 400 });
    } else {
      setSize({ width: 400, height: 200 });
    }
  }, [isExpanded]);

  const getLanguageClass = (lang: string) => {
    const languageMap: Record<string, string> = {
      javascript: 'language-javascript',
      typescript: 'language-typescript',
      python: 'language-python',
      java: 'language-java',
      cpp: 'language-cpp',
      csharp: 'language-csharp',
      go: 'language-go',
      rust: 'language-rust',
      html: 'language-html',
      css: 'language-css',
      sql: 'language-sql',
      json: 'language-json',
      bash: 'language-bash',
      markdown: 'language-markdown',
    };
    return languageMap[lang] || 'language-javascript';
  };

  const formatCode = (code: string) => {
    return `\`\`\`${language}\n${code}\n\`\`\``;
  };

  return (
    <div
      className={`group relative rounded-lg border shadow-sm backdrop-blur-sm transition-all duration-200
        bg-gray-900 dark:bg-gray-950
        border-gray-700 dark:border-gray-600
        ${selected ? 'ring-2 ring-primary-400 dark:ring-primary-500 shadow-lg shadow-primary-500/10' : ''}`}
      style={{ width: size.width, height: size.height }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-primary-500 !border-2 !border-white dark:!border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-primary-500 !border-2 !border-white dark:!border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-primary-500 !border-2 !border-white dark:!border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary-500 !border-2 !border-white dark:!border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
      />

      {/* 代码块工具栏 */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={handleCopyCode}
          className="p-1.5 rounded-md bg-gray-800 dark:bg-gray-900 border border-gray-700 dark:border-gray-600 shadow-sm hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
          title={copied ? "已复制" : "复制代码"}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-gray-400" />
          )}
        </button>
        <button
          onClick={handleToggleExpand}
          className="p-1.5 rounded-md bg-gray-800 dark:bg-gray-900 border border-gray-700 dark:border-gray-600 shadow-sm hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
          title={isExpanded ? "缩小" : "放大"}
        >
          {isExpanded ? (
            <Minimize2 className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
          )}
        </button>
      </div>

      {/* 代码块标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700 dark:border-gray-600 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">
            {language.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showLineNumbers && (
            <span className="text-xs text-gray-500">行号</span>
          )}
        </div>
      </div>

      {/* 代码内容 */}
      <div 
        ref={codeRef}
        className="p-4 overflow-auto h-[calc(100%-44px)]"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match;
              
              if (isInline) {
                return (
                  <code className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-200 text-sm" {...props}>
                    {children}
                  </code>
                );
              }
              
              return (
                <div className="relative">
                  <pre className={`${className} bg-transparent p-0 m-0 overflow-auto text-sm`}>
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              );
            },
            pre({ children }) {
              return (
                <div className="my-2">
                  {children}
                </div>
              );
            }
          }}
        >
          {formatCode(codeContent)}
        </ReactMarkdown>
      </div>

      {/* 四角缩放手柄 */}
      <div
        className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleResizeStart(e, 'top-left')}
      >
        <div className="w-2 h-2 border-2 border-gray-500 dark:border-gray-400 rounded-full" />
      </div>
      <div
        className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleResizeStart(e, 'top-right')}
      >
        <div className="w-2 h-2 border-2 border-gray-500 dark:border-gray-400 rounded-full" />
      </div>
      <div
        className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
      >
        <div className="w-2 h-2 border-2 border-gray-500 dark:border-gray-400 rounded-full" />
      </div>
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
      >
        <div className="w-2 h-2 border-2 border-gray-500 dark:border-gray-400 rounded-full" />
      </div>
    </div>
  );
}