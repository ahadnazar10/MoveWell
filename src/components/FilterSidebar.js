import { useEffect, useId, useState } from "react";
import PropTypes from "prop-types";
import { GOALS, departmentLabel } from "../utils/catalogue.js";
import styles from "./FilterSidebar.module.css";

const RATING_OPTIONS = [
  { label: "4★ & up", value: "4" },
  { label: "3★ & up", value: "3" },
  { label: "2★ & up", value: "2" },
];

const facetShape = PropTypes.arrayOf(
  PropTypes.shape({
    name: PropTypes.string.isRequired,
    count: PropTypes.number.isRequired,
  })
);

/**
 * Min and Max price inputs. They keep a local draft and only apply it (to
 * the URL, which triggers one service call) on Enter or when focus leaves —
 * not on every keystroke.
 */
function PriceRange({ minPrice, maxPrice, onApply }) {
  const id = useId();
  const [draft, setDraft] = useState({ minPrice, maxPrice });
  const [error, setError] = useState("");

  // A chip removed or Back pressed: show the URL's values.
  useEffect(() => {
    setDraft({ minPrice, maxPrice });
  }, [minPrice, maxPrice]);

  function apply() {
    const min = draft.minPrice === "" ? "" : Number(draft.minPrice);
    const max = draft.maxPrice === "" ? "" : Number(draft.maxPrice);
    if ((min !== "" && min < 0) || (max !== "" && max < 0)) {
      setError("Prices can't be negative");
      return;
    }
    if (min !== "" && max !== "" && min > max) {
      setError("Min must be less than Max");
      return;
    }
    setError("");
    if (String(min) !== minPrice || String(max) !== maxPrice) {
      onApply({ minPrice: String(min), maxPrice: String(max) });
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      apply();
    }
  }

  return (
    <fieldset className={styles.filterGroup}>
      <legend>Price (₹)</legend>
      <div className={styles.priceInputs}>
        <label htmlFor={`${id}-min`} className="visually-hidden">
          Minimum price
        </label>
        <input
          id={`${id}-min`}
          type="number"
          inputMode="decimal"
          min="0"
          placeholder="Min"
          value={draft.minPrice}
          onChange={(e) => setDraft((d) => ({ ...d, minPrice: e.target.value }))}
          onBlur={apply}
          onKeyDown={handleKeyDown}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span aria-hidden="true">to</span>
        <label htmlFor={`${id}-max`} className="visually-hidden">
          Maximum price
        </label>
        <input
          id={`${id}-max`}
          type="number"
          inputMode="decimal"
          min="0"
          placeholder="Max"
          value={draft.maxPrice}
          onChange={(e) => setDraft((d) => ({ ...d, maxPrice: e.target.value }))}
          onBlur={apply}
          onKeyDown={handleKeyDown}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

PriceRange.propTypes = {
  minPrice: PropTypes.string.isRequired,
  maxPrice: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};

export function FilterSidebar({
  categories,
  subcategories,
  brands,
  selectedCategory,
  selectedSubcategory,
  selectedGoal,
  selectedBrands,
  selectedMinRating,
  minPrice,
  maxPrice,
  onFilterChange,
  onToggleBrand,
  onClearFilters,
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const selectedBrandSet = new Set(selectedBrands.map((b) => b.toLowerCase()));

  return (
    <aside className={styles.sidebar} aria-label="Filters">
      <div className={styles.header}>
        <h2 className={styles.heading}>Filters</h2>
        <button type="button" className={styles.clearBtn} onClick={onClearFilters}>
          Clear all
        </button>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide filters" : "Show filters"}
        </button>
      </div>

      <div id={panelId} className={`${styles.panel} ${open ? styles.panelOpen : ""}`}>
        <fieldset className={styles.filterGroup}>
          <legend>Category</legend>
          <div className={styles.optionsList}>
            <label className={styles.optionLabel}>
              <input
                type="radio"
                name="category"
                checked={selectedCategory === ""}
                onChange={() => onFilterChange({ category: "", subcategory: "" })}
              />
              <span className={styles.optionName}>All</span>
            </label>
            {categories.map(({ name, count }) => (
              <label key={name} className={styles.optionLabel}>
                <input
                  type="radio"
                  name="category"
                  checked={selectedCategory.toLowerCase() === name.toLowerCase()}
                  onChange={() => onFilterChange({ category: name, subcategory: "" })}
                />
                <span className={styles.optionName}>
                  <span className={styles.deptDot} data-dept={name} aria-hidden="true" />
                  {departmentLabel(name)}{" "}
                  <span className={styles.optionCount}>({count})</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {subcategories.length > 0 && (
          <fieldset className={styles.filterGroup}>
            <legend>Type</legend>
            <div className={styles.optionsList}>
              <label className={styles.optionLabel}>
                <input
                  type="radio"
                  name="subcategory"
                  checked={selectedSubcategory === ""}
                  onChange={() => onFilterChange({ subcategory: "" })}
                />
                <span className={styles.optionName}>All types</span>
              </label>
              {subcategories.map(({ name, count, category }) => (
                <label key={name} className={styles.optionLabel}>
                  <input
                    type="radio"
                    name="subcategory"
                    checked={selectedSubcategory.toLowerCase() === name.toLowerCase()}
                    onChange={() => onFilterChange({ category, subcategory: name })}
                  />
                  <span className={styles.optionName}>
                    {name} <span className={styles.optionCount}>({count})</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className={styles.filterGroup}>
          <legend>Fitness goal</legend>
          <div className={styles.optionsList}>
            <label className={styles.optionLabel}>
              <input
                type="radio"
                name="goal"
                checked={selectedGoal === ""}
                onChange={() => onFilterChange({ goal: "" })}
              />
              <span className={styles.optionName}>Any</span>
            </label>
            {GOALS.map((g) => (
              <label key={g.value} className={styles.optionLabel}>
                <input
                  type="radio"
                  name="goal"
                  checked={selectedGoal === g.value}
                  onChange={() => onFilterChange({ goal: g.value })}
                />
                <span className={styles.optionName}>{g.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.filterGroup}>
          <legend>Brand</legend>
          <div className={styles.optionsList}>
            {brands.map(({ name, count }) => (
              <label key={name} className={styles.optionLabel}>
                <input
                  type="checkbox"
                  checked={selectedBrandSet.has(name.toLowerCase())}
                  onChange={() => onToggleBrand(name)}
                />
                <span className={styles.optionName}>
                  {name} <span className={styles.optionCount}>({count})</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.filterGroup}>
          <legend>Minimum rating</legend>
          <div className={styles.optionsList}>
            <label className={styles.optionLabel}>
              <input
                type="radio"
                name="rating"
                checked={selectedMinRating === ""}
                onChange={() => onFilterChange({ minRating: "" })}
              />
              <span className={styles.optionName}>Any</span>
            </label>
            {RATING_OPTIONS.map((opt) => (
              <label key={opt.value} className={styles.optionLabel}>
                <input
                  type="radio"
                  name="rating"
                  checked={selectedMinRating === opt.value}
                  onChange={() => onFilterChange({ minRating: opt.value })}
                />
                <span className={styles.optionName}>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <PriceRange minPrice={minPrice} maxPrice={maxPrice} onApply={onFilterChange} />
      </div>
    </aside>
  );
}

FilterSidebar.propTypes = {
  categories: facetShape.isRequired,
  subcategories: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
      category: PropTypes.string.isRequired,
    })
  ).isRequired,
  brands: facetShape.isRequired,
  selectedCategory: PropTypes.string.isRequired,
  selectedSubcategory: PropTypes.string.isRequired,
  selectedGoal: PropTypes.string.isRequired,
  selectedBrands: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedMinRating: PropTypes.string.isRequired,
  minPrice: PropTypes.string.isRequired,
  maxPrice: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onToggleBrand: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
};
