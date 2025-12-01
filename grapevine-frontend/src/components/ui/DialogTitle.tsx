interface DialogTitleProps {
  children: React.ReactNode;
  onClose?: () => void;
  disabled?: boolean;
}

export function DialogTitle({ children, onClose, disabled }: DialogTitleProps) {
  return (
    <div className="border-b-2 border-black px-3 py-2 flex justify-between items-center flex-shrink-0" style={{ backgroundColor: 'var(--btn-primary)' }}>
      <h2 className="text-sm font-bold uppercase text-black tracking-wider">
        {children}
      </h2>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          className="flex items-center justify-center w-[18px] h-[18px] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] bg-[#c0c0c0] hover:bg-[#dfdfdf] text-black font-bold text-base leading-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[1px_1px_0px_0px_rgba(0,0,0,0.4)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:border-t-[#808080] active:border-l-[#808080] active:border-b-white active:border-r-white active:shadow-none"
        >
          ×
        </button>
      )}
    </div>
  );
}
