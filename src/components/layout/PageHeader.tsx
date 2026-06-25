import { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    // mb-6 on mobile (tighter) → mb-8 on sm+. Actions get `flex-wrap` so
    // 2-3 buttons don't overflow when the screen is narrow, and on the
    // narrowest phones the action row drops below the title naturally.
    <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-fg truncate">
          {title}
        </h1>
        {description && (
          <p className="mt-1 sm:mt-1.5 text-sm text-fg-muted max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 sm:shrink-0">{actions}</div>
      )}
    </div>
  );
}
