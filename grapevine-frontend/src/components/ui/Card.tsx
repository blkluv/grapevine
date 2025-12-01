import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * Card component with 90s Windows-style design
 *
 * @example
 * ```tsx
 * <Card variant="default" padding="md">
 *   <CardHeader>
 *     <CardTitle>Feed Title</CardTitle>
 *   </CardHeader>
 *   <CardBody>Content here</CardBody>
 * </Card>
 * ```
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className, children, ...props }, ref) => {
    const baseStyles = cn(
      'rounded-md overflow-hidden',
      'transition-shadow duration-base'
    );

    const variantStyles = {
      default: cn(
        'bg-white text-foreground',
        'border-2 border-win95-borderDark',
        'shadow-win95-card'
      ),
      elevated: cn(
        'bg-white text-foreground',
        'border-2 border-win95-borderDark',
        'shadow-win95-card-lg',
        'hover:shadow-win95-card'
      ),
      outline: cn(
        'bg-white text-foreground',
        'border-2 border-border',
        'shadow-none'
      ),
    };

    const paddingStyles = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/* ===== Card Sub-components ===== */

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-3 mb-3', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn('text-title font-heading truncate', className)}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-body-sm text-foreground/70 line-clamp-2', className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-3', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-2 mt-4 pt-3 border-t border-border', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

/* ===== Card Image Component ===== */

export interface CardImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export const CardImage = React.forwardRef<HTMLImageElement, CardImageProps>(
  ({ className, src, alt, ...props }, ref) => {
    return (
      <div className="w-12 h-12 flex-shrink-0 bg-background border-2 border-win95-borderDark rounded-sm overflow-hidden">
        <img
          ref={ref}
          src={src}
          alt={alt}
          className={cn('w-full h-full object-cover', className)}
          {...props}
        />
      </div>
    );
  }
);

CardImage.displayName = 'CardImage';
