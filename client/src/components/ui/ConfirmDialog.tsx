import { useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/65 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-md rounded-modal border border-border bg-bg-card p-6 text-text shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <AlertCircle size={22} />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-btn p-1.5 text-text-muted transition-colors hover:bg-bg hover:text-text dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close confirmation dialog"
          >
            <X size={18} />
          </button>
        </div>

        <h2 id="confirm-dialog-title" className="mt-4 text-xl font-bold">{title}</h2>
        <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-text-muted dark:text-slate-300">
          {description}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={loading} className="btn-ghost justify-center">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="btn-primary min-w-28">
            {loading ? 'Logging out…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
