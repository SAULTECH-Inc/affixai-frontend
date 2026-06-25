import { LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Label({
  className,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-sm font-medium text-fg mb-1.5', className)}
      {...rest}
    />
  );
}
