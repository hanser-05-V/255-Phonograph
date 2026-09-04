import {useLayoutEffect, useRef, type KeyboardEvent} from 'react';

type ConfirmDialogProps = {
  busy?: boolean;
  confirmLabel: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
};

export function ConfirmDialog({
  busy = false,
  confirmLabel,
  description,
  onCancel,
  onConfirm,
  title,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = 'admin-confirm-title';
  const descriptionId = 'admin-confirm-description';

  useLayoutEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    }
    cancelRef.current?.focus();

    return () => {
      if (dialog?.open && typeof dialog.close === 'function') dialog.close();
      previousFocusRef.current?.focus();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    if (event.shiftKey && document.activeElement === cancelRef.current) {
      event.preventDefault();
      confirmRef.current?.focus();
    } else if (!event.shiftKey && document.activeElement === confirmRef.current) {
      event.preventDefault();
      cancelRef.current?.focus();
    }
  }

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="admin-confirm-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onKeyDown={handleKeyDown}
      ref={dialogRef}
    >
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{description}</p>
      <div className="admin-confirm-dialog__actions">
        <button disabled={busy} onClick={onCancel} ref={cancelRef} type="button">
          取消
        </button>
        <button disabled={busy} onClick={onConfirm} ref={confirmRef} type="button">
          {busy ? '正在删除…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
