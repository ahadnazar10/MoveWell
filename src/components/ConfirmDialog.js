import { useRef } from "react";
import PropTypes from "prop-types";
import { Modal } from "./Modal.js";
import styles from "./ConfirmDialog.module.css";

/**
 * A yes/no question, built by filling the reusable Modal shell. Focus starts
 * on Cancel, the safe choice, so pressing Enter by accident never deletes.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} initialFocusRef={cancelRef}>
      <div className={styles.message}>{message}</div>
      <div className={styles.actions}>
        <button
          ref={cancelRef}
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${variant === "danger" ? styles.btnDanger : "btn-primary"}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.node.isRequired,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  variant: PropTypes.oneOf(["danger", "primary"]),
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
