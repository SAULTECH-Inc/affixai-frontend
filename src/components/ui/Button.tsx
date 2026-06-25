import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-brand text-white shadow-glow hover:opacity-90 focus-visible:ring-brand-400',
  secondary:
    'bg-bg-elevated text-fg border border-border-strong hover:bg-bg-inset focus-visible:ring-brand-400',
  ghost: 'text-fg hover:bg-bg-inset focus-visible:ring-brand-400',
  outline:
    'border border-border-strong text-fg hover:bg-bg-inset focus-visible:ring-brand-400',
  danger:
    'bg-danger text-white hover:opacity-90 focus-visible:ring-red-400',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      disabled,
      fullWidth,
      children,
      ...rest
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-bg-base disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
