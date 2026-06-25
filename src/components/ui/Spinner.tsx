import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Spinner({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';
  return (
    <Loader2 className={cn('animate-spin text-brand-400', sizeClass, className)} />
  );
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-fg-muted">Loading…</p>
      </div>
    </div>
  );
}
