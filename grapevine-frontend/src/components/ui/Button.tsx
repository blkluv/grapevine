import React from 'react';
import { Slot } from "@radix-ui/react-slot"
import { cn } from '@/lib/utils';
import { Loader } from './Loader';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  asChild?: boolean;
  noHoverEffect?: boolean;
}

/**
 * Button component with neobrutalism styling
 *
 * @param variant - Style variant of the button
 * @param size - Size of the button
 * @param fullWidth - Whether button should take full width
 * @param loading - Loading state
 * @param asChild - Render as child component
 * @param noHoverEffect - Disable the hover movement effect
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">Click me</Button>
 *
 * // With loading state
 * <Button variant="primary" loading>Processing...</Button>
 *
 * // Without hover effect
 * <Button variant="primary" noHoverEffect>Buy</Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      fullWidth,
      loading = false,
      disabled = false,
      asChild = false,
      noHoverEffect = false,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const neoVariant = variant === 'outline' ? 'ghost' : variant;

    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        data-variant={neoVariant}
        data-size={size}
        data-no-hover={noHoverEffect ? 'true' : undefined}
        className={cn(
          'neobrutalism-button',
          fullWidth && 'w-full',
          loading && 'pointer-events-none opacity-80',
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <Loader size="sm" />
            Loading...
          </>
        ) : children}
      </Comp>
    );
  }
);

Button.displayName = 'Button';
