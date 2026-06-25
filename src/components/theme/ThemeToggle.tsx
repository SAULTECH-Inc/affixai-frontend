import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';
import { cn } from '@/lib/cn';

const OPTIONS: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'system', icon: Monitor, label: 'System' },
  { value: 'dark', icon: Moon, label: 'Dark' },
];

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div className="inline-flex p-1 rounded-xl bg-bg-inset border border-border">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          aria-label={label}
          title={label}
          className={cn(
            'h-7 w-7 grid place-items-center rounded-lg transition',
            mode === value
              ? 'bg-bg-elevated text-fg shadow-card'
              : 'text-fg-muted hover:text-fg'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
