import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import {
  loadCatalogue,
  selectProductsList,
  selectProductsTotal,
  selectProductsStatus,
  selectProductsError,
  selectFacets,
  selectCatalogueVersion,
} from "../features/products/productsSlice.js";
import { FilterSidebar } from "../components/FilterSidebar.js";
import { SortBar } from "../components/SortBar.js";
import { ProductCard } from "../components/ProductCard.js";
import { ProductSkeleton } from "../components/ProductSkeleton.js";
import { useMinimumDelay } from "../hooks/useMinimumDelay.js";
import {
  DEPARTMENTS,
  departmentLabel,
  goalLabel,
  isDepartment,
} from "../utils/catalogue.js";
import styles from "./Products.module.css";

const PAGE_SIZE = 12;
const FILTER_KEYS = [
  "q",
  "category",
  "subcategory",
  "goal",
  "brand",
  "minRating",
  "minPrice",
  "maxPrice",
];

/** "Footwear", "Running · Health", "Cricket" — the page's h1. */
function pageTitle(category, subcategory, goal) {
  const place = subcategory || (isDepartment(category) ? departmentLabel(category) : category);
  if (goal) return place ? `${goalLabel(goal)} · ${place}` : `${goalLabel(goal)} gear`;
  return place || "All MoveWell products";
}

function parseBrands(raw) {
  return raw ? raw.split(",").filter(Boolean) : [];
}

/**
 * The URL is the only store of the catalogue's filters, sort and page (see
 * the Module 2 entry in docs/ADR.md): a filtered page can be shared or
 * refreshed, and Back/Forward step through earlier filter states, because
 * every change is a navigation.
 */
export function Products() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const products = useSelector(selectProductsList);
  const total = useSelector(selectProductsTotal);
  const status = useSelector(selectProductsStatus);
  const error = useSelector(selectProductsError);
  const facets = useSelector(selectFacets);
  const catalogueVersion = useSelector(selectCatalogueVersion);

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const subcategory = searchParams.get("subcategory") ?? "";
  const goal = searchParams.get("goal") ?? "";
  const brandParam = searchParams.get("brand") ?? "";
  const minRating = searchParams.get("minRating") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const sort = searchParams.get("sort") ?? "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const brands = useMemo(() => parseBrands(brandParam), [brandParam]);

  const query = useMemo(
    () => ({
      q,
      category,
      subcategory,
      goal,
      brand: brandParam,
      minRating,
      minPrice,
      maxPrice,
      sort,
      skip: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    }),
    [q, category, subcategory, goal, brandParam, minRating, minPrice, maxPrice, sort, page]
  );
  const queryKey = `${JSON.stringify(query)}#${catalogueVersion}`;
  const minimumElapsed = useMinimumDelay(queryKey);

  useEffect(() => {
    dispatch(loadCatalogue(query));
  }, [dispatch, query, catalogueVersion]);

  /** Apply changes to the URL. Any filter change goes back to page 1. */
  function updateParams(changes) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in changes)) next.delete("page");
    setSearchParams(next);
  }

  function toggleBrand(name) {
    const nextBrands = brands.includes(name)
      ? brands.filter((b) => b !== name)
      : [...brands, name];
    updateParams({ brand: nextBrands.join(",") });
  }

  function clearAll() {
    const next = new URLSearchParams();
    if (sort) next.set("sort", sort);
    setSearchParams(next);
  }

  const chips = useMemo(() => {
    const list = [];
    if (q) list.push({ key: "q", label: `Search: "${q}"`, remove: { q: "" } });
    if (category)
      list.push({
        key: "category",
        label: isDepartment(category) ? departmentLabel(category) : category,
        // A type belongs to its category, so removing the category removes both.
        remove: { category: "", subcategory: "" },
      });
    if (subcategory)
      list.push({ key: "subcategory", label: subcategory, remove: { subcategory: "" } });
    if (goal)
      list.push({ key: "goal", label: `Goal: ${goalLabel(goal)}`, remove: { goal: "" } });
    for (const brand of brands) {
      list.push({
        key: `brand:${brand}`,
        label: brand,
        remove: { brand: brands.filter((b) => b !== brand).join(",") },
      });
    }
    if (minRating)
      list.push({
        key: "minRating",
        label: `${minRating}★ & up`,
        remove: { minRating: "" },
      });
    if (minPrice)
      list.push({
        key: "minPrice",
        label: `From ₹${minPrice}`,
        remove: { minPrice: "" },
      });
    if (maxPrice)
      list.push({
        key: "maxPrice",
        label: `Up to ₹${maxPrice}`,
        remove: { maxPrice: "" },
      });
    return list;
  }, [q, category, subcategory, goal, brands, minRating, minPrice, maxPrice]);

  // A pre-merge link (?category=Cricket) names a type, not a department:
  // show it as the selected type, under the department it belongs to.
  const legacyType = category && !isDepartment(category) ? category : "";
  const selectedSubcategory = subcategory || legacyType;
  const selectedDepartment = isDepartment(category)
    ? category.toLowerCase()
    : (facets.subcategories?.find(
        (s) => s.name.toLowerCase() === selectedSubcategory.toLowerCase()
      )?.category ?? "");

  const hasFilters = FILTER_KEYS.some((key) => searchParams.get(key));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isLoading = status === "loading" || status === "idle" || !minimumElapsed;

  return (
    <div className="container section">
      <header className={styles.pageHeader}>
        <h1>{pageTitle(category, subcategory, goal)}</h1>
        <p className="muted">
          {isDepartment(category)
            ? DEPARTMENTS.find((d) => d.value === category.toLowerCase()).tagline
            : "Sports, footwear and health in one catalogue."}{" "}
          Press <kbd className={styles.kbd}>/</kbd> anywhere to search.
        </p>
      </header>

      <div className={styles.layout}>
        <FilterSidebar
          categories={facets.categories}
          subcategories={facets.subcategories ?? []}
          brands={facets.brands}
          selectedCategory={selectedDepartment}
          selectedSubcategory={selectedSubcategory}
          selectedGoal={goal}
          selectedBrands={brands}
          selectedMinRating={minRating}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onFilterChange={updateParams}
          onToggleBrand={toggleBrand}
          onClearFilters={clearAll}
        />

        <div className={styles.mainContent}>
          <SortBar
            totalResults={isLoading ? null : total}
            sortValue={sort}
            activeFilters={chips}
            onSortChange={(value) => updateParams({ sort: value })}
            onRemoveFilter={(chip) => updateParams(chip.remove)}
            onClearAll={clearAll}
          />

          {isLoading ? (
            <ProductSkeleton count={PAGE_SIZE} />
          ) : status === "failed" ? (
            <div className="empty-state" role="alert">
              <h2>We couldn&apos;t load products</h2>
              <p className="muted">
                {error ?? "The catalogue service didn't respond."} Please try again.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => dispatch(loadCatalogue(query))}
              >
                Retry
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <h2>No products match</h2>
              <p className="muted">
                {hasFilters
                  ? "Try removing a filter above, or clear them all to see the whole catalogue."
                  : "There's nothing in the catalogue yet."}
              </p>
              {hasFilters && (
                <button type="button" className="btn btn-primary" onClick={clearAll}>
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} headingLevel={2} />
                ))}
              </div>

              <nav className={styles.pagination} aria-label="Pagination">
                <p className={styles.showing}>
                  Showing {products.length} of {total} products
                </p>
                {totalPages > 1 && (
                  <div className={styles.pageButtons}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={page <= 1}
                      onClick={() =>
                        updateParams({ page: page - 1 === 1 ? "" : page - 1 })
                      }
                    >
                      <CaretLeftIcon size={16} weight="bold" aria-hidden="true" />{" "}
                      Previous
                    </button>
                    <span className={styles.pageIndicator}>
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={page >= totalPages}
                      onClick={() => updateParams({ page: page + 1 })}
                    >
                      Next <CaretRightIcon size={16} weight="bold" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </nav>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
