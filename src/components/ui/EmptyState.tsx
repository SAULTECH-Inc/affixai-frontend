import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      {icon && (
        <div className="mb-4 h-14 w-14 rounded-2xl bg-gradient-brand-soft flex items-center justify-center text-brand-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-fg">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-fg-muted max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
