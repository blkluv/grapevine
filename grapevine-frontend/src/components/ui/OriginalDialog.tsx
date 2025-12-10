import type { ReactNode } from 'react';

interface DialogContainerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  disabled?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export function OriginalDialog({
  isOpen,
  onClose,
  title,
  children,
  disabled = false,
  maxWidth = 'xl'
}: DialogContainerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className={`w-full ${maxWidthClasses[maxWidth]}`}>
        {/* Neobrutalism Dialog */}
        <div className="relative bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
            {/* Title Bar */}
            <div className="border-b-4 border-black px-2 sm:px-4 py-2 sm:py-3 flex justify-between items-center flex-shrink-0 bg-accent-aqua">
              <h2 className="font-mono text-sm sm:text-base font-black uppercase text-black tracking-tight">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={disabled}
                className="flex items-center justify-center w-8 h-8 border-4 border-black bg-white text-black font-black text-lg leading-none transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                ×
              </button>
            </div>

            {/* Content */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
