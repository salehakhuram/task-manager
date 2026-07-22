import { useEffect } from 'react';
import { cn } from '../../utils/helpers';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm animate-fade-in"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 flex w-full max-h-[min(92vh,900px)] flex-col overflow-hidden animate-slide-up rounded-2xl border border-ink-200 bg-white shadow-soft dark:border-ink-700 dark:bg-ink-900',
          sizes[size]
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-ink-100 px-5 py-4 dark:border-ink-800 sm:px-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost !px-2 !py-1 text-ink-500">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
