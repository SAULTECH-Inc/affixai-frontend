import clsx, { ClassValue } from 'clsx';

/** Tailwind-aware className join. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
