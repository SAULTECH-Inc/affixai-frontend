import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, invalid, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full h-10 px-3 rounded-xl text-sm',
        'bg-bg-elevated border border-border text-fg placeholder:text-fg-subtle',
        'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        invalid && 'border-danger focus:ring-danger',
        className
      )}
      {...rest}
    />
  )
);
Input.displayName = 'Input';
