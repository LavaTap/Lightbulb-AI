import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-xl border border-gray-200/60 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl shadow-sm transition-all duration-200 hover:translate-y-[-2px] hover:border-primary-300 dark:hover:border-primary-600", className)} {...props} />
));
Card.displayName = "Card";
export { Card };
