import { useEffect, useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import { saveImage, STORED_IMAGE_PREFIX } from "../../services/imagesService.js";
import { useProductImage, showPlaceholderOnError } from "../../hooks/useProductImage.js";
import { validateProductForm } from "../../features/admin/productFormValidation.js";
import { DEPARTMENTS, GOALS } from "../../utils/catalogue.js";
import styles from "./Admin.module.css";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function specsToText(specs) {
  return Object.entries(specs ?? {})
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function ExistingImage({ src }) {
  const resolved = useProductImage(src);
  return (
    <img
      src={resolved}
      alt=""
      className={styles.previewImg}
      onError={showPlaceholderOnError}
    />
  );
}

ExistingImage.propTypes = { src: PropTypes.string };

const FIELD_ORDER = [
  "title",
  "category",
  "subcategory",
  "brand",
  "price",
  "discountPercentage",
  "rating",
  "stock",
  "specs",
  "images",
];

/**
 * Add/edit product form. Uncontrolled: inputs keep their own values and the
 * form is read once, with FormData, when it is submitted (Module 8 contrasts
 * this with the controlled checkout form — see docs/ADR.md). The parent
 * gives it key={product id}, so choosing another product remounts it with
 * that product's values and nothing from the previous one.
 */
export function ProductForm({ product, subcategories, onSave, onCancel, onDirtyChange }) {
  const formId = useId();
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  // Picked files and their object-URL previews.
  const [picked, setPicked] = useState([]);

  // Every preview URL is revoked when replaced or when the form unmounts,
  // so picking many images in a row never leaks memory.
  useEffect(() => {
    return () => picked.forEach((p) => URL.revokeObjectURL(p.url));
  }, [picked]);

  function handleFiles(event) {
    const files = [...(event.target.files ?? [])];
    const tooBig = files.find((f) => f.size > MAX_IMAGE_BYTES);
    const notImage = files.find((f) => !f.type.startsWith("image/"));
    if (notImage || tooBig) {
      setErrors((e) => ({
        ...e,
        images: notImage ? "Choose image files only" : "Each image must be under 5 MB",
      }));
      event.target.value = "";
      return;
    }
    setErrors((e) => ({ ...e, images: undefined }));
    setPicked(files.map((file) => ({ file, url: URL.createObjectURL(file) })));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    const { values, errors: found } = validateProductForm(
      new FormData(event.currentTarget)
    );
    setErrors(found);
    const first = FIELD_ORDER.find((f) => found[f]);
    if (first) {
      formRef.current?.elements.namedItem(first)?.focus?.();
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      let images = product?.images ?? (product?.thumbnail ? [product.thumbnail] : []);
      if (picked.length > 0) {
        const ids = await Promise.all(picked.map((p) => saveImage(p.file)));
        images = ids.map((id) => `${STORED_IMAGE_PREFIX}${id}`);
      }
      await onSave({ ...values, images, thumbnail: images[0] });
    } catch (err) {
      setFormError(err?.message ?? "The product couldn't be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const fieldProps = (name) => ({
    id: `${formId}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${formId}-${name}-error` : undefined,
  });

  const errorFor = (name) =>
    errors[name] ? (
      <p id={`${formId}-${name}-error`} className={styles.fieldError}>
        {errors[name]}
      </p>
    ) : null;

  const existingImages = product?.images?.length
    ? product.images
    : product?.thumbnail
      ? [product.thumbnail]
      : [];

  return (
    <form
      ref={formRef}
      className={styles.formGrid}
      onSubmit={handleSubmit}
      onInput={() => onDirtyChange(true)}
      noValidate
      aria-labelledby={`${formId}-heading`}
    >
      <h2 id={`${formId}-heading`} className={styles.formTitle}>
        {product ? `Edit product #${product.id}` : "New product"}
      </h2>

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <div className={`${styles.field} ${styles.full}`}>
        <label htmlFor={`${formId}-title`}>Title</label>
        <input type="text" defaultValue={product?.title ?? ""} {...fieldProps("title")} />
        {errorFor("title")}
      </div>

      <div className={styles.field}>
        <label htmlFor={`${formId}-category`}>Category</label>
        <select defaultValue={product?.category ?? ""} {...fieldProps("category")}>
          <option value="" disabled>
            Choose…
          </option>
          {DEPARTMENTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        {errorFor("category")}
      </div>

      <div className={styles.field}>
        <label htmlFor={`${formId}-subcategory`}>Type</label>
        <input
          type="text"
          list={`${formId}-subcategory-options`}
          placeholder="e.g. Cricket, Sandals, First aid"
          defaultValue={product?.subcategory ?? ""}
          {...fieldProps("subcategory")}
        />
        <datalist id={`${formId}-subcategory-options`}>
          {subcategories.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {errorFor("subcategory")}
      </div>

      <fieldset className={`${styles.field} ${styles.full} ${styles.goalsField}`}>
        <legend>Fitness goals (used for recommendations and kits)</legend>
        <div className={styles.goalsOptions}>
          {GOALS.map((g) => (
            <label key={g.value}>
              <input
                type="checkbox"
                name="goals"
                value={g.value}
                defaultChecked={product?.goals?.includes(g.value) ?? false}
              />
              {g.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor={`${formId}-brand`}>Brand</label>
        <input type="text" defaultValue={product?.brand ?? ""} {...fieldProps("brand")} />
        {errorFor("brand")}
      </div>

      <div className={styles.field}>
        <label htmlFor={`${formId}-price`}>Price (₹)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          defaultValue={product?.price ?? ""}
          {...fieldProps("price")}
        />
        {errorFor("price")}
      </div>

      <div className={styles.field}>
        <label htmlFor={`${formId}-discountPercentage`}>Discount (%)</label>
        <input
          type="number"
          step="1"
          min="0"
          max="99"
          defaultValue={product?.discountPercentage ?? 0}
          {...fieldProps("discountPercentage")}
        />
        {errorFor("discountPercentage")}
      </div>

      <div className={styles.field}>
        <label htmlFor={`${formId}-rating`}>Rating (0 to 5)</label>
        <input
          type="number"
          step="0.1"
          min="0"
          max="5"
          defaultValue={product?.rating ?? 0}
          {...fieldProps("rating")}
        />
        {errorFor("rating")}
      </div>

      <div className={styles.field}>
        <label htmlFor={`${formId}-stock`}>Stock</label>
        <input
          type="number"
          step="1"
          min="0"
          defaultValue={product?.stock ?? 0}
          {...fieldProps("stock")}
        />
        {errorFor("stock")}
      </div>

      <div className={`${styles.field} ${styles.full}`}>
        <label htmlFor={`${formId}-description`}>Description</label>
        <textarea
          rows={4}
          defaultValue={product?.description ?? ""}
          {...fieldProps("description")}
        />
      </div>

      <div className={`${styles.field} ${styles.full}`}>
        <label htmlFor={`${formId}-specs`}>
          Specifications (one &quot;Key: value&quot; per line)
        </label>
        <textarea
          rows={5}
          defaultValue={specsToText(product?.specs)}
          {...fieldProps("specs")}
        />
        {errorFor("specs")}
      </div>

      <div className={`${styles.field} ${styles.full}`}>
        <label htmlFor={`${formId}-images`}>Images (the first is the thumbnail)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          {...fieldProps("images")}
        />
        {errorFor("images")}
        <div className={styles.previews}>
          {picked.length > 0
            ? picked.map((p) => (
                <img
                  key={p.url}
                  src={p.url}
                  alt={`Preview of ${p.file.name}`}
                  className={styles.previewImg}
                />
              ))
            : existingImages.map((src, i) => (
                <ExistingImage key={`${src}-${i}`} src={src} />
              ))}
        </div>
      </div>

      <div className={`${styles.formActions} ${styles.full}`}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}

ProductForm.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string,
    description: PropTypes.string,
    category: PropTypes.string,
    subcategory: PropTypes.string,
    goals: PropTypes.arrayOf(PropTypes.string),
    brand: PropTypes.string,
    price: PropTypes.number,
    discountPercentage: PropTypes.number,
    rating: PropTypes.number,
    stock: PropTypes.number,
    specs: PropTypes.object,
    thumbnail: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
  }),
  subcategories: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onDirtyChange: PropTypes.func.isRequired,
};
