import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-bg-surface border border-border rounded-2xl shadow-card',
        className
      )}
      {...rest}
    />
  );
}

export function CardHeader({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-5 border-b border-border', className)}
      {...rest}
    />
  );
}

export function CardTitle({
  className,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold text-fg', className)}
      {...rest}
    />
  );
}

export function CardDescription({
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-fg-muted mt-1', className)}
      {...rest}
    />
  );
}

export function CardContent({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...rest} />;
}

export function CardFooter({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-border bg-bg-inset rounded-b-2xl',
        className
      )}
      {...rest}
    />
  );
}
