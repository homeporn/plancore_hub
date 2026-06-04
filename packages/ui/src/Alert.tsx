import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn.js';

const alertVariants = cva('rounded-lg border px-4 py-3 text-sm', {
  variants: {
    tone: {
      critical: 'border-[var(--critical)] bg-red-50 text-[var(--critical)]',
      warning: 'border-[var(--warning)] bg-amber-50 text-[var(--warning)]',
      info: 'border-[var(--info)] bg-blue-50 text-[var(--info)]',
      success: 'border-green-500 bg-green-50 text-green-700',
    },
  },
  defaultVariants: { tone: 'info' },
});

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

/** Inline status/error banner. */
export function Alert({ className, tone, ...props }: AlertProps) {
  return <div role="alert" className={cn(alertVariants({ tone }), className)} {...props} />;
}
