import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import styles from "./Modal.module.css";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The one dialog shell every page fills with its own content (Module 4).
 * - Portalled to document.body and stacked above everything, including the
 *   sticky header, so no parent's overflow or z-index can trap it.
 * - Closes on Escape, on a click on the backdrop, or via onClose from content.
 * - Moves focus inside on open, keeps Tab cycling inside, and returns focus
 *   to whatever had it before (a ref captured at open time).
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  variant = "dialog",
  initialFocusRef,
}) {
  const panelRef = useRef(null);
  const returnFocusTo = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    returnFocusTo.current = document.activeElement;
    const target =
      initialFocusRef?.current ??
      panelRef.current?.querySelector(FOCUSABLE) ??
      panelRef.current;
    target?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      // Return focus where it was, if that element is still on the page.
      const el = returnFocusTo.current;
      if (el && document.contains(el) && typeof el.focus === "function") el.focus();
    };
  }, [isOpen, initialFocusRef]);

  // Handled on the dialog (a React event), not on document: a dialog opened
  // from inside another (confirm-remove inside the cart drawer) gets the key
  // first and stops it, so one Escape closes only the top dialog.
  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = [...panelRef.current.querySelectorAll(FOCUSABLE)];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <div
      onKeyDown={handleKeyDown}
      className={`${styles.backdrop} ${variant === "drawer" ? styles.drawerBackdrop : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={variant === "drawer" ? styles.drawer : styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body
  );
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node.isRequired,
  children: PropTypes.node,
  variant: PropTypes.oneOf(["dialog", "drawer"]),
  initialFocusRef: PropTypes.shape({ current: PropTypes.any }),
};
