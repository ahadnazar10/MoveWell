import PropTypes from "prop-types";
import { XIcon } from "@phosphor-icons/react";
import { SORT_OPTIONS } from "../services/productsService.js";
import styles from "./SortBar.module.css";

/**
 * Result count (announced to screen readers as it changes), the sort menu,
 * and one removable chip per active filter with Clear all.
 */
export function SortBar({
  totalResults,
  sortValue,
  activeFilters,
  onSortChange,
  onRemoveFilter,
  onClearAll,
}) {
  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <p className={styles.countInfo} role="status" aria-live="polite">
          {totalResults === null ? (
            "Loading results…"
          ) : (
            <>
              <span className={styles.countNumber}>{totalResults}</span>{" "}
              {totalResults === 1 ? "result" : "results"}
            </>
          )}
        </p>

        <div className={styles.sortWrapper}>
          <label htmlFor="sort-select" className={styles.sortLabel}>
            Sort by
          </label>
          <select
            id="sort-select"
            value={sortValue}
            onChange={(e) => onSortChange(e.target.value)}
            className={styles.sortSelect}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className={styles.chipsRow}>
          <ul className={styles.chipsList} aria-label="Active filters">
            {activeFilters.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  className={styles.chip}
                  onClick={() => onRemoveFilter(chip)}
                  aria-label={`Remove filter ${chip.label}`}
                >
                  <span>{chip.label}</span>
                  <XIcon size={12} weight="bold" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={styles.clearAllBtn} onClick={onClearAll}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

SortBar.propTypes = {
  totalResults: PropTypes.number,
  sortValue: PropTypes.string.isRequired,
  activeFilters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  onSortChange: PropTypes.func.isRequired,
  onRemoveFilter: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
};
