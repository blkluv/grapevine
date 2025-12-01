import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * Badge component for status indicators and labels
 *
 * @example
 * ```tsx
 * <Badge variant="success">Active</Badge>
 * <Badge variant="error">Ended</Badge>
 * <Badge variant="warning">Pending</Badge>
 * ```
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', className, children, ...props }, ref) => {
    const baseStyles = cn(
      'inline-flex items-center justify-center',
      'font-bold uppercase tracking-wide',
      'border rounded-full',
      'whitespace-nowrap'
    );

    const variantStyles = {
      default: cn(
        'bg-win95-paper text-foreground',
        'border-win95-borderDark'
      ),
      success: cn(
        'bg-success/10 text-success',
        'border-success'
      ),
      warning: cn(
        'bg-warning/10 text-warning',
        'border-warning'
      ),
      error: cn(
        'bg-error/10 text-error',
        'border-error'
      ),
      info: cn(
        'bg-info/10 text-info',
        'border-info'
      ),
      outline: cn(
        'bg-transparent text-foreground',
        'border-border'
      ),
    };

    const sizeStyles = {
      sm: 'px-2 py-0.5 text-[10px]',
      md: 'px-2.5 py-1 text-xs',
      lg: 'px-3 py-1.5 text-sm',
    };

    return (
      <span
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

/* ===== Status Badge Helpers ===== */

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  status: 'active' | 'inactive' | 'paused' | 'ended' | 'pending';
}

/**
 * StatusBadge component with predefined status variants
 *
 * @example
 * ```tsx
 * <StatusBadge status="active" />
 * <StatusBadge status="ended" />
 * ```
 */
export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, ...props }, ref) => {
    const statusMap = {
      active: { variant: 'success' as const, label: 'Active' },
      inactive: { variant: 'default' as const, label: 'Inactive' },
      paused: { variant: 'warning' as const, label: 'Paused' },
      ended: { variant: 'error' as const, label: 'Ended' },
      pending: { variant: 'info' as const, label: 'Pending' },
    };

    const { variant, label } = statusMap[status];

    return (
      <Badge ref={ref} variant={variant} {...props}>
        {label}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';
