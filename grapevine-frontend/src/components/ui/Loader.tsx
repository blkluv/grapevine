import React from 'react';
import { cn } from '@/lib/utils';

export interface LoaderProps {
  /** Size of the loader in pixels */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional additional className */
  className?: string;
  /** Color of the star fill */
  color?: string;
}

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

/**
 * Neobrutalist 8-pointed star loader
 * A rotating star with bold 3px black borders
 */
export const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  className,
  color = 'var(--accent-aqua)', // Aquamarine - matches MusicPlayer
}) => {
  const pixelSize = sizeMap[size];

  return (
    <div
      className={cn('animate-spin', className)}
      style={{
        width: pixelSize,
        height: pixelSize,
        animationDuration: '1s',
      }}
      role="status"
      aria-label="Loading"
    >
      <svg
        viewBox="0 0 100 100"
        width={pixelSize}
        height={pixelSize}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 8-pointed star: 16 vertices alternating outer (r=45) and inner (r=30) points */}
        <polygon
          points="50,5 62,22 82,18 78,38 95,50 78,62 82,82 62,78 50,95 38,78 18,82 22,62 5,50 22,38 18,18 38,22"
          fill={color}
          stroke="black"
          strokeWidth="3"
          strokeLinejoin="miter"
        />
      </svg>
    </div>
  );
};

Loader.displayName = 'Loader';
