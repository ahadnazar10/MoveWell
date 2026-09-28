import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { CaretDownIcon, CaretUpIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import {
  getProducts,
  getSubcategories,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../services/productsService.js";
import { DEPARTMENTS, departmentLabel } from "../../utils/catalogue.js";
import {
  catalogueChanged,
  selectCatalogueVersion,
} from "../../features/products/productsSlice.js";
import { showToast, showActionToast } from "../../features/ui/uiSlice.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useUnsavedChangesPrompt } from "../../hooks/useUnsavedChangesPrompt.js";
import { useProductImage, showPlaceholderOnError } from "../../hooks/useProductImage.js";
import { ConfirmDialog } from "../../components/ConfirmDialog.js";
import { ProductForm } from "./ProductForm.js";
import { formatRupee } from "../../utils/rupee.js";
import styles from "./Admin.module.css";

const PAGE_SIZE = 10;
const UNDO_MS = 5000;
const ALL = 100_000;

const COLUMNS = [
  { key: "id", label: "ID" },
  { key: "title", label: "Product" },
  { key: "category", label: "Category" },
  { key: "subcategory", label: "Type" },
  { key: "price", label: "Price" },
  { key: "stock", label: "Stock" },
];

function Thumb({ src }) {
  const resolved = useProductImage(src);
  return (
    <img
      src={resolved}
      alt=""
      className={styles.miniThumb}
      onError={showPlaceholderOnError}
    />
  );
}

Thumb.propTypes = { src: PropTypes.string };

function SortHeader({ column, sort, onSort }) {
  const active = sort.key === column.key;
  const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
  return (
    <th scope="col" aria-sort={ariaSort}>
      <button type="button" className={styles.sortBtn} onClick={() => onSort(column.key)}>
        {column.label}
        {active &&
          (sort.dir === "asc" ? (
            <CaretUpIcon size={12} weight="bold" aria-hidden="true" />
          ) : (
            <CaretDownIcon size={12} weight="bold" aria-hidden="true" />
          ))}
      </button>
    </th>
  );
}

SortHeader.propTypes = {
  column: PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  sort: PropTypes.shape({
    key: PropTypes.string.isRequired,
    dir: PropTypes.oneOf(["asc", "desc"]).isRequired,
  }).isRequired,
  onSort: PropTypes.func.isRequired,
};

/**
 * Store-manager catalogue: a searchable, sortable, paginated table with row
 * selection and bulk delete, and the add/edit form. Which product is being
 * edited lives in the URL (?edit=12 or ?new=1), so Back works and the
 * unsaved-changes guard sees switching products as navigation.
 */
export function Admin() {
  const dispatch = useDispatch();
  const catalogueVersion = useSelector(selectCatalogueVersion);
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [status, setStatus] = useState("loading");

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [sort, setSort] = useState({ key: "id", dir: "asc" });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState(() => new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { isBlocked, stay, leave, allowNavigation } = useUnsavedChangesPrompt(dirty);

  const editId = searchParams.get("edit");
  const isNew = searchParams.get("new") === "1";
  const editing = editId ? products.find((p) => p.id === Number(editId)) : null;
  const formOpen = isNew || Boolean(editing);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [{ products: all }, names] = await Promise.all([
        getProducts({ limit: ALL }),
        getSubcategories(),
      ]);
      setProducts(all);
      setSubcategories(names);
      setStatus("succeeded");
    } catch {
      setStatus("failed");
    }
  }, []);

  // Reload when this tab or another changes the catalogue.
  useEffect(() => {
    load();
  }, [load, catalogueVersion]);

  // A new search or category starts at page 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, department]);

  const visible = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const filtered = products.filter(
      (p) =>
        !pendingDeleteIds.has(p.id) &&
        (!department || p.category === department) &&
        (!term ||
          p.title.toLowerCase().includes(term) ||
          p.brand?.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term) ||
          p.subcategory?.toLowerCase().includes(term) ||
          String(p.id) === term ||
          p.sourceId?.toLowerCase() === term)
    );
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (typeof x === "string") return x.localeCompare(y ?? "") * dir;
      return ((x ?? 0) - (y ?? 0)) * dir;
    });
  }, [products, debouncedSearch, department, sort, pendingDeleteIds]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const allOnPageSelected =
    pageRows.length > 0 && pageRows.every((p) => selectedIds.has(p.id));

  function handleSort(key) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  function toggleRow(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of pageRows) {
        if (allOnPageSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  }

  /**
   * Bulk delete with Undo: the rows disappear at once, but nothing is
   * deleted until the 5-second Undo toast ends. Pressing Undo just brings
   * the rows back — no service call was ever made.
   */
  function handleConfirmBulkDelete() {
    const ids = [...selectedIds];
    setConfirmingDelete(false);
    setSelectedIds(new Set());
    setPendingDeleteIds((prev) => new Set([...prev, ...ids]));
    const restore = () =>
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });

    dispatch(
      showActionToast(
        `Deleted ${ids.length} ${ids.length === 1 ? "product" : "products"}`,
        {
          actionLabel: "Undo",
          duration: UNDO_MS,
          onAction: () => {
            restore();
            dispatch(showToast("Delete undone", "success"));
          },
          onExpire: async () => {
            const results = await Promise.allSettled(ids.map((id) => deleteProduct(id)));
            const failed = results.filter((r) => r.status === "rejected").length;
            restore();
            dispatch(catalogueChanged());
            if (failed)
              dispatch(
                showToast(`${failed} could not be deleted. Please try again.`, "error")
              );
          },
        }
      )
    );
  }

  function openForm(params) {
    setSearchParams(params);
  }

  function closeForm() {
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    next.delete("new");
    setSearchParams(next);
  }

  async function handleSave(values) {
    const saved = editing
      ? await updateProduct(editing.id, values)
      : await createProduct(values);
    setDirty(false);
    allowNavigation();
    dispatch(catalogueChanged()); // this tab; other tabs hear the storage event
    dispatch(
      showToast(editing ? `Saved ${saved.title}` : `Created ${saved.title}`, "success")
    );
    closeForm();
  }

  return (
    <div className="container section">
      <div className={styles.header}>
        <div>
          <h1>MoveWell catalogue admin</h1>
          <p className="muted">
            One catalogue for sports, footwear and health. Changes appear in the shop
            immediately, including in other open tabs.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openForm({ new: "1" })}
        >
          <PlusIcon size={16} weight="bold" aria-hidden="true" /> Add product
        </button>
      </div>

      {formOpen && (
        <div className={styles.formCard}>
          <ProductForm
            key={editing ? editing.id : "new"}
            product={editing ?? undefined}
            subcategories={subcategories}
            onSave={handleSave}
            onCancel={closeForm}
            onDirtyChange={setDirty}
          />
        </div>
      )}
      {editId && !editing && status === "succeeded" && (
        <p className={styles.formError} role="alert">
          Product #{editId} doesn&apos;t exist.
        </p>
      )}

      <section className={styles.tableCard} aria-labelledby="products-table-heading">
        <h2 id="products-table-heading" className="visually-hidden">
          Products
        </h2>
        <div className={styles.tableControls}>
          <label htmlFor="admin-search" className="visually-hidden">
            Search the products table
          </label>
          <input
            id="admin-search"
            type="search"
            placeholder="Search by title, brand, type or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <label htmlFor="admin-department" className="visually-hidden">
            Filter the products table by category
          </label>
          <select
            id="admin-department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">All categories</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <span className={styles.selectionInfo} role="status">
            {selectedIds.size > 0
              ? `${selectedIds.size} selected`
              : `${visible.length} products`}
          </span>
          <button
            type="button"
            className={`btn btn-secondary ${styles.deleteBtn}`}
            onClick={() => setConfirmingDelete(true)}
            disabled={selectedIds.size === 0}
          >
            <TrashIcon size={16} aria-hidden="true" /> Delete selected
          </button>
        </div>

        {status === "loading" && products.length === 0 ? (
          <p className="muted" role="status">
            Loading products…
          </p>
        ) : status === "failed" ? (
          <div className="empty-state" role="alert">
            <p>Products couldn&apos;t be loaded.</p>
            <button type="button" className="btn btn-primary" onClick={load}>
              Retry
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <p className="muted">No products match &quot;{debouncedSearch}&quot;.</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col" className={styles.checkCol}>
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={togglePage}
                        aria-label="Select all products on this page"
                      />
                    </th>
                    {COLUMNS.map((column) => (
                      <SortHeader
                        key={column.key}
                        column={column}
                        sort={sort}
                        onSort={handleSort}
                      />
                    ))}
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((product) => (
                    <tr
                      key={product.id}
                      className={
                        selectedIds.has(product.id) ? styles.selectedRow : undefined
                      }
                    >
                      <td className={styles.checkCol}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleRow(product.id)}
                          aria-label={`Select ${product.title}`}
                        />
                      </td>
                      <td>{product.id}</td>
                      <td>
                        <span className={styles.titleCell}>
                          <Thumb src={product.thumbnail} />
                          <span>{product.title}</span>
                        </span>
                      </td>
                      <td>
                        <span className="dept-chip" data-dept={product.category}>
                          {departmentLabel(product.category)}
                        </span>
                      </td>
                      <td>{product.subcategory}</td>
                      <td className={styles.num}>{formatRupee(product.price)}</td>
                      <td className={styles.num}>
                        <span
                          className={
                            product.stock === 0
                              ? styles.stockOos
                              : product.stock < 5
                                ? styles.stockLow
                                : undefined
                          }
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => openForm({ edit: String(product.id) })}
                        >
                          Edit<span className="visually-hidden"> {product.title}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav className={styles.pagination} aria-label="Products table pages">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </nav>
          </>
        )}
      </section>

      <ConfirmDialog
        isOpen={confirmingDelete}
        title="Delete products?"
        message={`Delete ${selectedIds.size} selected ${selectedIds.size === 1 ? "product" : "products"}? You'll have 5 seconds to undo.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => setConfirmingDelete(false)}
      />

      <ConfirmDialog
        isOpen={isBlocked}
        title="Discard changes?"
        message="You have unsaved changes to this product. Leave without saving?"
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setDirty(false);
          leave();
        }}
        onCancel={stay}
      />
    </div>
  );
}
