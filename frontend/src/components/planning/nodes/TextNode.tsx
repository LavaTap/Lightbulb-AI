import { useState, useCallback, type KeyboardEvent } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export function TextNode({ id, data, selected }: NodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.text as string);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditText(data.text as string);
  }, [data.text]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const onChange = data.onChange as ((id: string, text: string) => void) | undefined;
    if (onChange && (data.text as string) !== editText) {
      onChange(id, editText);
    }
  }, [data, id, editText]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
      }
      if (e.key === 'Escape') {
        setEditText(data.text as string);
        setIsEditing(false);
      }
    },
    [handleBlur, data.text],
  );

  return (
    <div
      className={`group relative px-4 py-3 min-w-[120px] max-w-[300px] rounded-xl border shadow-sm backdrop-blur-sm transition-all duration-200
        bg-white/90 dark:bg-gray-800/90
        border-gray-200 dark:border-gray-700
        ${selected ? 'ring-2 ring-primary-400 dark:ring-primary-500 shadow-lg shadow-primary-500/10' : ''}`}
      onDoubleClick={handleDoubleClick}
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

      {isEditing ? (
        <textarea
          className="nodrag nowheel w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 resize-none outline-none min-h-[24px]"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          rows={1}
        />
      ) : (
        <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words select-none">
          {(data.text as string) || '双击编辑'}
        </div>
      )}
    </div>
  );
}
