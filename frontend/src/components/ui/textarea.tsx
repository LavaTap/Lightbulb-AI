import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, minRows = 1, maxRows = 10, style, ...props }, ref) => {
    // 计算最小和最大高度
    const lineHeight = 24; // 假设每行24px
    const paddingVertical = 16; // 上下padding各8px
    const borderWidth = 2; // 上下边框各1px
    
    const minHeight = minRows * lineHeight + paddingVertical + borderWidth;
    const maxHeight = maxRows * lineHeight + paddingVertical + borderWidth;

    return (
      <textarea
        className={cn(
          "flex w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-gray-950 dark:placeholder:text-gray-500 transition-colors duration-200 resize-y",
          className
        )}
        ref={ref}
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
          ...style,
        }}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
