import { useId, useState } from "react";
import PropTypes from "prop-types";
import { StarIcon } from "@phosphor-icons/react";
import styles from "./StarRatingInput.module.css";

const LABELS = ["Terrible", "Poor", "Average", "Good", "Excellent"];

/**
 * StarIcon rating built on native radio buttons, so it works with mouse and
 * keyboard (Tab into the group, arrow keys to change, Space to pick) and is
 * announced correctly by screen readers with no extra ARIA. The radios are
 * visually hidden; each label shows a star.
 */
export function StarRatingInput({
  value,
  onChange,
  legend = "Your rating",
  error,
  name: nameProp,
}) {
  const generatedName = useId();
  const name = nameProp ?? generatedName;
  const errorId = useId();
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;

  return (
    <fieldset
      className={styles.group}
      aria-describedby={error ? errorId : undefined}
      onMouseLeave={() => setHovered(0)}
    >
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <label key={star} className={styles.star} onMouseEnter={() => setHovered(star)}>
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="visually-hidden"
            />
            <StarIcon
              size={30}
              weight={star <= shown ? "fill" : "regular"}
              className={star <= shown ? styles.on : styles.off}
              aria-hidden="true"
            />
            <span className="visually-hidden">
              {star} star{star > 1 ? "s" : ""}, {LABELS[star - 1]}
            </span>
          </label>
        ))}
        <span className={styles.caption} aria-hidden="true">
          {shown ? LABELS[shown - 1] : "Select a rating"}
        </span>
      </div>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

StarRatingInput.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  legend: PropTypes.string,
  error: PropTypes.string,
  name: PropTypes.string,
};
