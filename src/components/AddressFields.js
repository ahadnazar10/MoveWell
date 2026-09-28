import PropTypes from "prop-types";
import {
  ADDRESS_FIELDS,
  ADDRESS_LABELS,
} from "../features/checkout/checkoutValidation.js";
import styles from "./AddressFields.module.css";

const INPUT_PROPS = {
  name: { type: "text", autoComplete: "name" },
  email: { type: "email", autoComplete: "email", inputMode: "email" },
  phone: {
    type: "tel",
    autoComplete: "tel-national",
    inputMode: "numeric",
    maxLength: 10,
  },
  address: { type: "text", autoComplete: "street-address" },
  city: { type: "text", autoComplete: "address-level2" },
  pin: { type: "text", autoComplete: "postal-code", inputMode: "numeric", maxLength: 6 },
};

/**
 * One address as a fieldset. `idPrefix` comes from useId() in the parent, so
 * two copies side by side (delivery and billing) never share an id and every
 * <label> stays linked to its own input. `autoCompleteSection` keeps the
 * browser from filling billing with delivery details.
 */
export function AddressFields({
  idPrefix,
  legend,
  values,
  errors,
  onChange,
  onBlur,
  autoCompleteSection,
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.grid}>
        {ADDRESS_FIELDS.map((field) => {
          const id = `${idPrefix}-${field}`;
          const errorId = `${id}-error`;
          const error = errors[field];
          const { autoComplete, ...rest } = INPUT_PROPS[field];
          return (
            <div
              key={field}
              className={`${styles.field} ${field === "address" ? styles.wide : ""}`}
            >
              <label htmlFor={id}>{ADDRESS_LABELS[field]}</label>
              <input
                id={id}
                {...rest}
                autoComplete={
                  autoCompleteSection
                    ? `section-${autoCompleteSection} ${autoComplete}`
                    : autoComplete
                }
                value={values[field]}
                onChange={(event) => onChange(field, event.target.value)}
                onBlur={() => onBlur?.(field)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                aria-required="true"
              />
              {error && (
                <p id={errorId} className={styles.error}>
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

AddressFields.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  legend: PropTypes.string.isRequired,
  values: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    address: PropTypes.string,
    city: PropTypes.string,
    pin: PropTypes.string,
  }).isRequired,
  errors: PropTypes.objectOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  autoCompleteSection: PropTypes.string,
};
