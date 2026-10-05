import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (open) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      {/* Overlay */}
      <div
        className="
          absolute
          inset-0
          bg-black/70
          backdrop-blur-[2px]
        "
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`
          relative
          flex
          max-h-[90vh]
          w-full
          flex-col
          overflow-hidden
          rounded-lg
          border
          border-border
          bg-card
          shadow-2xl

          ${sizeMap[size]}
        `}
      >

        {/* Header */}
        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-border
            px-6
            py-4
          "
        >
          <h2
            className="
              text-base
              font-semibold
              text-foreground
            "
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="
              rounded-md
              p-1.5
              text-muted-foreground

              transition-all
              duration-200

              hover:bg-secondary
              hover:text-foreground
            "
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

      </div>
    </div>
  );
}