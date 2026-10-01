import { useEffect, useRef } from 'react';
import { useUIStore } from '../../store/ui';
import './DialogModal.css';

export function DialogModal() {
  const dialogConfig = useUIStore((s) => s.dialogConfig);
  const closeDialog  = useUIStore((s) => s.closeDialog);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // Fix #13a: trap focus and handle Escape key
  useEffect(() => {
    if (!dialogConfig?.isOpen) return;

    // Remember the trigger so focus can go back to it. A destructive confirm starts on Cancel, so a stray
    // Enter or Space never deletes anything.
    const trigger = document.activeElement as HTMLElement | null;
    (cancelBtnRef.current ?? confirmBtnRef.current)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDialog();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else { // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      trigger?.focus?.();
    };
  }, [dialogConfig?.isOpen, closeDialog]);

  if (!dialogConfig || !dialogConfig.isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-message" className="dialog-modal">
      <div className="dialog-modal__backdrop" onClick={closeDialog} aria-hidden="true" />
      <div ref={modalRef} className="dialog-modal__panel">
        <div>
          <h2 id="dialog-title" className="dialog-modal__title">{dialogConfig.title}</h2>
          <p id="dialog-message" className="dialog-modal__message">{dialogConfig.message}</p>
        </div>
        <div className="dialog-modal__actions">
          {dialogConfig.type === 'confirm' ? (
            <>
              <button ref={cancelBtnRef} type="button" className="dialog-modal__btn" onClick={closeDialog}>Cancel</button>
              <button
                ref={confirmBtnRef}
                type="button"
                className="dialog-modal__btn dialog-modal__btn--danger"
                onClick={() => {
                  if (dialogConfig.onConfirm) dialogConfig.onConfirm();
                  closeDialog();
                }}
              >
                Confirm
              </button>
            </>
          ) : (
            <button ref={confirmBtnRef} type="button" className="dialog-modal__btn" onClick={closeDialog}>OK</button>
          )}
        </div>
      </div>
    </div>
  );
}
