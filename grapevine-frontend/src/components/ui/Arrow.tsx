import { type ReactNode } from 'react';

export type ArrowDirection =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

export interface ArrowWrapperProps {
  children: ReactNode;
  direction?: ArrowDirection;
  color?: string;
  size?: number;
  bounceDistance?: number;
}

export function ArrowWrapper({
  children,
  direction = 'top',
  color = '#ff1700',
  size = 40,
  bounceDistance = 15,
}: ArrowWrapperProps) {
  let left: string | number = 0;
  let top: string | number = 0;
  let transform = '';

  switch (direction) {
    case 'top-left':
      left = -size;
      top = -size;
      break;
    case 'top':
      left = '50%';
      top = -size;
      transform = 'translateX(-50%)';
      break;
    case 'top-right':
      left = '100%';
      top = -size;
      break;
    case 'right':
      left = '100%';
      top = '50%';
      transform = 'translateY(-50%)';
      break;
    case 'bottom-right':
      left = '100%';
      top = '100%';
      break;
    case 'bottom':
      left = '50%';
      top = '100%';
      transform = 'translateX(-50%)';
      break;
    case 'bottom-left':
      left = -size;
      top = '100%';
      break;
    case 'left':
      left = -size;
      top = '50%';
      transform = 'translateY(-50%)';
      break;
  }

  const getRotation = () => {
    switch (direction) {
      case 'top-left':
        return -45;
      case 'top':
        return 0;
      case 'top-right':
        return 45;
      case 'right':
        return 90;
      case 'bottom-right':
        return 135;
      case 'bottom':
        return 180;
      case 'bottom-left':
        return -135;
      case 'left':
        return -90;
      default:
        return 0;
    }
  };

  const rotation = getRotation();
  const baseTransform = `rotate(${rotation}deg)`;
  const containerTransform = transform || undefined;
  const leftValue = typeof left === 'number' ? `${left}px` : left;
  const topValue = typeof top === 'number' ? `${top}px` : top;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      <div
        className="pointer-events-none"
        style={{
          position: 'absolute',
          left: leftValue,
          top: topValue,
          width: size,
          height: size,
          zIndex: 9999,
          transform: containerTransform,
        }}
      >
      <style>
        {`
          @keyframes bounce-top {
            0%, 20%, 50%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-${bounceDistance}px);
            }
            60% {
              transform: translateY(-${bounceDistance / 2}px);
            }
          }
          @keyframes bounce-top-right {
            0%, 20%, 50%, 80%, 100% {
              transform: rotate(45deg) translateY(0);
            }
            40% {
              transform: rotate(45deg) translateY(-${bounceDistance}px);
            }
            60% {
              transform: rotate(45deg) translateY(-${bounceDistance / 2}px);
            }
          }
          @keyframes bounce-right {
            0%, 20%, 50%, 80%, 100% {
              transform: rotate(90deg) translateY(0);
            }
            40% {
              transform: rotate(90deg) translateY(-${bounceDistance}px);
            }
            60% {
              transform: rotate(90deg) translateY(-${bounceDistance / 2}px);
            }
          }
          @keyframes bounce-bottom-right {
            0%, 20%, 50%, 80%, 100% {
              transform: rotate(135deg) translateY(0);
            }
            40% {
              transform: rotate(135deg) translateY(-${bounceDistance}px);
            }
            60% {
              transform: rotate(135deg) translateY(-${bounceDistance / 2}px);
            }
          }
          @keyframes bounce-bottom {
            0%, 20%, 50%, 80%, 100% {
              transform: rotate(180deg) translateY(0);
            }
            40% {
              transform: rotate(180deg) translateY(-${bounceDistance}px);
            }
            60% {
              transform: rotate(180deg) translateY(-${bounceDistance / 2}px);
            }
          }
          @keyframes bounce-bottom-left {
            0%, 20%, 50%, 80%, 100% {
              transform: rotate(-135deg) translateY(0);
            }
            40% {
              transform: rotate(-135deg) translateY(-${bounceDistance}px);
            }
            60% {
              transform: rotate(-135deg) translateY(-${bounceDistance / 2}px);
            }
          }
          @keyframes bounce-left {
            0%, 20%, 50%, 80%, 100% {
              transform: rotate(-90deg) translateY(0);
            }
            40% {
              transform: rotate(-90deg) translateY(-${bounceDistance}px);
            }
            60% {
              transform: rotate(-90deg) translateY(-${bounceDistance / 2}px);
            }
          }
          @keyframes bounce-top-left {
            0%, 20%, 50%, 80%, 100% {
              transform: rotate(-45deg) translateY(0);
            }
            40% {
              transform: rotate(-45deg) translateY(-${bounceDistance}px);
            }
            60% {
              transform: rotate(-45deg) translateY(-${(bounceDistance / 2)}px);
            }
          }
        `}
      </style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: baseTransform,
          animation: `bounce-${direction} 1.5s infinite`,
        }}
      >
        {/* Arrow centered in viewBox at x=12 */}
        <path
          d="M12 4.75L12 19.25L17.5 13.75"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 19.25L6.5 13.75"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      </div>
    </div>
  );
}
