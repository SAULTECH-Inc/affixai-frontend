import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const TONES: Record<Tone, string> = {
  brand: 'bg-brand-500/15 text-brand-400 border-brand-500/30',
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/15 text-red-400 border-red-500/30',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  neutral: 'bg-bg-inset text-fg-muted border-border',
};

export function Badge({ className, tone = 'neutral', ...rest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
        TONES[tone],
        className
      )}
      {...rest}
    />
  );
}
