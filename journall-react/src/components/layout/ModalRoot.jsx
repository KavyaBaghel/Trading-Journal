import { useEffect, useRef } from 'react';
import { useModal } from './ModalProvider';

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
}

export function ModalRoot() {
  const { modal, closeModal } = useModal();
  const modalRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (modal) {
      previousFocus.current = document.activeElement;
      modalRef.current?.focus();

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          closeModal();
          return;
        }

        if (e.key === 'Tab') {
          const focusableElements = getFocusableElements(modalRef.current);
          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        previousFocus.current?.focus();
      };
    }
  }, [modal, closeModal]);

  if (!modal) return null;

  // Reduced motion: check user preference explicitly
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-none"
      onClick={closeModal}
      role="presentation"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-background border border-terminal-border p-6 rounded-[10px] shadow-2xl max-w-lg w-full mx-4 outline-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        data-reduced-motion={prefersReducedMotion}
      >
        {modal}
      </div>
    </div>
  );
}
