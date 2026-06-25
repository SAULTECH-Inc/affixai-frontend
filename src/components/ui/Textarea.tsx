import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 3, ...rest }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(
      'w-full px-3 py-2 rounded-xl text-sm',
      'bg-bg-elevated border border-border text-fg placeholder:text-fg-subtle',
      'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
      'disabled:opacity-50',
      className
    )}
    {...rest}
  />
));
Textarea.displayName = 'Textarea';
