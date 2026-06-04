import type { ElementType, HTMLAttributes } from 'react';
import { cn } from './cn.js';

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Render as a different element (e.g. "li"). Defaults to "div". */
  as?: ElementType;
}

/** A bordered surface used for grouping content (project cards, panels). */
export function Card({ as: Tag = 'div', className, ...props }: CardProps) {
  return <Tag className={cn('rounded-lg border border-[var(--border)] p-4', className)} {...props} />;
}
