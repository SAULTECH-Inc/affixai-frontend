import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse bg-bg-inset rounded-xl',
        className
      )}
      {...rest}
    />
  );
}
