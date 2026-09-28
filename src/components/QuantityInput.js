import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import PropTypes from "prop-types";
import styles from "./QuantityInput.module.css";

/**
 * Reusable quantity control: type a number, or use −, + and +5, always kept
 * within [min, max]. Asking for more than `max` calls `onExceed(requested)`
 * so the page can react (the product page focuses and selects this input).
 *
 * The parent gets a small imperative handle — focus() and select() — rather
 * than the raw <input>, via useImperativeHandle.
 *
 * `onStep(delta)`, when given, is used by the buttons instead of
 * onChange(value + delta): the cart dispatches a delta so rapid clicks can
 * never be lost to a stale render.
 */
export const QuantityInput = forwardRef(function QuantityInput(
  {
    value,
    onChange,
    onStep,
    onExceed,
    min = 1,
    max = 99,
    disabled = false,
    id,
    label = "Quantity",
    showPlusFive = false,
  },
  ref
) {
  const inputRef = useRef(null);
  // While the shopper is typing, show their raw text (it may be "" mid-edit).
  const [draft, setDraft] = useState(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    select: () => inputRef.current?.select(),
  }));

  function commit(requested) {
    if (requested > max) {
      onChange(max);
      onExceed?.(requested);
    } else {
      onChange(Math.max(min, requested));
    }
  }

  function step(delta) {
    setDraft(null);
    const requested = value + delta;
    if (requested > max) {
      onExceed?.(requested);
      if (value !== max) onStep ? onStep(max - value) : onChange(max);
      return;
    }
    if (requested < min) return;
    if (onStep) onStep(delta);
    else onChange(requested);
  }

  function handleInputChange(event) {
    const raw = event.target.value;
    setDraft(raw);
    if (raw.trim() === "") return;
    const num = Number.parseInt(raw, 10);
    if (Number.isNaN(num)) return;
    commit(num);
    if (num > max) setDraft(null);
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => step(-1)}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        −
      </button>
      <input
        id={id}
        ref={inputRef}
        type="number"
        inputMode="numeric"
        className={styles.input}
        value={draft ?? String(value)}
        onChange={handleInputChange}
        onBlur={() => setDraft(null)}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={id ? undefined : label}
      />
      <button
        type="button"
        className={styles.btn}
        onClick={() => step(1)}
        disabled={disabled}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        +
      </button>
      {showPlusFive && (
        <button
          type="button"
          className={`${styles.btn} ${styles.plusFive}`}
          onClick={() => step(5)}
          disabled={disabled}
          aria-label={`Add five to ${label.toLowerCase()}`}
        >
          +5
        </button>
      )}
    </div>
  );
});

QuantityInput.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  onStep: PropTypes.func,
  onExceed: PropTypes.func,
  min: PropTypes.number,
  max: PropTypes.number,
  disabled: PropTypes.bool,
  id: PropTypes.string,
  label: PropTypes.string,
  showPlusFive: PropTypes.bool,
};
