import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { XIcon } from "@phosphor-icons/react";
import { finishToast, selectToasts } from "../features/ui/uiSlice.js";

/**
 * One toast. Its timer counts down only while the toast is not hovered or
 * focused: pausing stores the time left, resuming starts a fresh timeout for
 * just that remainder (a closure over `remaining`).
 */
const Toast = memo(function Toast({ toast }) {
  const dispatch = useDispatch();
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);
  const startedAt = useRef(0);

  useEffect(() => {
    if (paused) return undefined;
    startedAt.current = Date.now();
    const timer = setTimeout(
      () => dispatch(finishToast(toast.id, "expire")),
      remaining.current
    );
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(
        0,
        remaining.current - (Date.now() - startedAt.current)
      );
    };
  }, [paused, dispatch, toast.id]);

  return (
    <div
      className={`toast toast-${toast.variant}`}
      role={toast.variant === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span>{toast.message}</span>
      {toast.actionLabel && (
        <button
          type="button"
          className="toast-action"
          onClick={() => dispatch(finishToast(toast.id, "action"))}
        >
          {toast.actionLabel}
        </button>
      )}
      <button
        type="button"
        className="toast-dismiss"
        aria-label="Dismiss notification"
        onClick={() => dispatch(finishToast(toast.id, "expire"))}
      >
        <XIcon size={16} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
});

Toast.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.number.isRequired,
    message: PropTypes.string.isRequired,
    variant: PropTypes.oneOf(["info", "success", "error"]).isRequired,
    duration: PropTypes.number.isRequired,
    actionLabel: PropTypes.string,
  }).isRequired,
};

/**
 * Toasts render into a portal on document.body, so no container's overflow
 * or stacking context can ever clip them.
 */
export function Toaster() {
  const toasts = useSelector(selectToasts);

  return createPortal(
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body
  );
}
