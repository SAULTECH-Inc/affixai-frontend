import { SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

// Options can be either a plain string list (value === label) or a
// {value, label} list when they differ — e.g. country codes vs names.
type SelectOption = string | { value: string; label: string };

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ className, options, placeholder, ...rest }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'w-full h-10 px-3 pr-9 rounded-xl text-sm appearance-none',
          'bg-bg-elevated border border-border text-fg',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          'disabled:opacity-50',
          className
        )}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => {
          const value = typeof opt === 'string' ? opt : opt.value;
          const label = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted pointer-events-none"
      />
    </div>
  )
);
Select.displayName = 'Select';
