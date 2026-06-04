import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './cn.js';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full rounded-md border border-[var(--border)] px-3 py-1.5 text-sm',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/30',
      'disabled:opacity-60',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
