import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  ClockCounterClockwiseIcon,
  MapPinIcon,
  ShieldCheckIcon,
  TruckIcon,
  XIcon,
} from "@phosphor-icons/react";
import { ProductCard } from "../components/ProductCard.js";
import { GoalPicker } from "../components/GoalPicker.js";
import { Recommendations } from "../components/Recommendations.js";
import { KitCard } from "../components/KitCard.js";
import { DEPARTMENT_ICONS } from "../components/catalogueIcons.js";
import {
  loadCatalogue,
  loadKits,
  selectFacets,
  selectKits,
  selectCatalogueVersion,
} from "../features/products/productsSlice.js";
import {
  selectRecentlyViewedIds,
  forgetView,
} from "../features/recentlyViewed/recentlyViewedSlice.js";
import { selectFitnessGoal } from "../features/profile/profileSlice.js";
import { useProductsByIds } from "../hooks/useProductsByIds.js";
import { FREE_SHIPPING_ABOVE, SHIPPING_FEE } from "../utils/pricing.js";
import { siteImage, HERO_WIDTHS } from "../utils/siteImages.js";
import { DEPARTMENTS, goalLabel, departmentLabel } from "../utils/catalogue.js";
import styles from "./Home.module.css";

const FEATURED_COUNT = 8;
const GOAL_PICKS_COUNT = 4;

const HERO_IMAGE = siteImage("hero-battle-ropes", HERO_WIDTHS);

const BENEFITS = [
  {
    title: `Free shipping over ₹${FREE_SHIPPING_ABOVE}`,
    body: `One cart for sports, footwear and health. Orders above ₹${FREE_SHIPPING_ABOVE} ship free; below that, a flat ₹${SHIPPING_FEE}.`,
    icon: TruckIcon,
  },
  {
    title: "60-second cancel window",
    body: "Changed your mind right after ordering? Cancel within 60 seconds, no questions asked.",
    icon: ClockCounterClockwiseIcon,
  },
  {
    title: "Stock re-checked at checkout",
    body: "We verify stock and price again before you pay, so nothing sells out from under you.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Delivery dates by PIN",
    body: "Enter your PIN code in the top bar to see a delivery date before you buy.",
    icon: MapPinIcon,
  },
];

/** Recently viewed cards get their own actions: open again, or forget. */
function RecentlyViewedActions({ product }) {
  const dispatch = useDispatch();
  return (
    <>
      <Link to={`/products/${product.id}`} className="btn btn-secondary">
        View again
      </Link>
      <button
        type="button"
        className={`btn btn-secondary ${styles.iconBtn}`}
        onClick={() => dispatch(forgetView(product.id))}
        aria-label={`Remove ${product.title} from recently viewed`}
      >
        <XIcon size={16} weight="bold" aria-hidden="true" />
      </button>
    </>
  );
}

RecentlyViewedActions.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
};

function RecentlyViewed() {
  const ids = useSelector(selectRecentlyViewedIds);
  const { products } = useProductsByIds(ids);
  const loaded = ids.map((id) => products[id]).filter(Boolean);

  if (loaded.length === 0) return null;

  return (
    <section
      className={`container ${styles.productSection}`}
      aria-labelledby="recent-heading"
    >
      <div className={styles.sectionHeader}>
        <h2 id="recent-heading" className={styles.sectionTitle}>
          Recently viewed
        </h2>
      </div>
      <div className={styles.productGrid}>
        {loaded.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            actions={<RecentlyViewedActions product={product} />}
          />
        ))}
      </div>
    </section>
  );
}

function Hero({ productCount }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <img
        className={styles.heroImage}
        src={HERO_IMAGE.src}
        srcSet={HERO_IMAGE.srcSet}
        sizes="100vw"
        alt=""
        fetchpriority="high"
        decoding="sync"
      />
      <div className={styles.heroScrim} aria-hidden="true" />
      <div className={`container ${styles.heroInner}`}>
        <p className={styles.heroEyebrow}>
          MoveWell · Everything you need for an active lifestyle
        </p>
        <h1 id="hero-heading" className={styles.heroTitle}>
          Move better.
          <br />
          <span className={styles.heroAccent}>Live better.</span>
        </h1>
        <p className={styles.heroLead}>
          Sports gear, footwear and health essentials, together in one store and one
          cart. Pick a fitness goal and we&apos;ll put the right mix in front of you.
        </p>
        <div className={styles.heroCtas}>
          {DEPARTMENTS.map((d, i) => (
            <Link
              key={d.value}
              to={`/products?category=${d.value}`}
              className={`btn ${i === 0 ? "btn-primary" : styles.heroGhost}`}
            >
              Shop {d.label}
            </Link>
          ))}
        </div>
        {productCount > 0 && (
          <p className={styles.heroStats}>
            <span>
              <strong>{productCount}</strong> products
            </span>
            <span>
              <strong>3</strong> categories
            </span>
            <span>
              <strong>1</strong> cart
            </span>
          </p>
        )}
      </div>
    </section>
  );
}

Hero.propTypes = { productCount: PropTypes.number.isRequired };

export function Home() {
  const dispatch = useDispatch();
  const facets = useSelector(selectFacets);
  const kits = useSelector(selectKits);
  const goal = useSelector(selectFitnessGoal);
  const catalogueVersion = useSelector(selectCatalogueVersion);

  // Facets only (department and subcategory counts); product rows below
  // come from the recommendations and kits calls.
  useEffect(() => {
    dispatch(loadCatalogue({ limit: 0 }));
    dispatch(loadKits());
  }, [dispatch, catalogueVersion]);

  const countFor = (dept) => facets.categories.find((c) => c.name === dept)?.count;
  const productCount = facets.categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className={styles.page}>
      <Hero productCount={productCount} />

      <section
        className={`container ${styles.categories}`}
        aria-labelledby="categories-heading"
      >
        <div className={styles.sectionHeader}>
          <h2 id="categories-heading" className={styles.sectionTitle}>
            Shop by category
          </h2>
          <Link to="/products" className={styles.viewAllLink}>
            All products <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.categoryGrid}>
          {DEPARTMENTS.map((d) => {
            const Icon = DEPARTMENT_ICONS[d.value];
            const count = countFor(d.value);
            return (
              <Link
                key={d.value}
                to={`/products?category=${d.value}`}
                className={styles.categoryCard}
                data-dept={d.value}
              >
                <span className={styles.categoryIcon} aria-hidden="true">
                  <Icon size={34} weight="duotone" />
                </span>
                <span className={styles.categoryName}>{d.label}</span>
                <span className={styles.categoryTagline}>{d.tagline}</span>
                <span className={styles.categoryMeta}>
                  <span>{count ? `${count} products` : ""}</span>
                  <ArrowUpRightIcon size={20} weight="bold" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.goalBand} aria-labelledby="goal-heading">
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="goal-heading" className={styles.sectionTitle}>
                What&apos;s your fitness goal?
              </h2>
              <p className={styles.sectionLead}>
                Choose one and we&apos;ll mix sports gear, footwear and health essentials
                for it. Press it again to clear.
              </p>
            </div>
            {goal && (
              <Link to="/goals" className={styles.viewAllLink}>
                Your {goalLabel(goal).toLowerCase()} profile{" "}
                <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
              </Link>
            )}
          </div>
          <GoalPicker />
          {goal && (
            <div className={styles.goalPicks}>
              <h3 className={styles.goalPicksTitle}>Picked for {goalLabel(goal)}</h3>
              <Recommendations
                goal={goal}
                limit={GOAL_PICKS_COUNT}
                gridClassName={styles.productGrid}
              />
            </div>
          )}
        </div>
      </section>

      <RecentlyViewed />

      <section
        className={`container ${styles.productSection}`}
        aria-labelledby="featured-heading"
      >
        <div className={styles.sectionHeader}>
          <h2 id="featured-heading" className={styles.sectionTitle}>
            Featured across MoveWell
          </h2>
          <Link to="/products" className={styles.viewAllLink}>
            View full catalogue{" "}
            <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
          </Link>
        </div>
        <Recommendations limit={FEATURED_COUNT} gridClassName={styles.productGrid} />
      </section>

      {kits.items.length > 0 && (
        <section
          className={`container ${styles.productSection}`}
          aria-labelledby="kits-heading"
        >
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="kits-heading" className={styles.sectionTitle}>
                MoveWell Kits
              </h2>
              <p className={styles.sectionLead}>
                Starter bundles that combine all three categories, added to your cart in
                one click.
              </p>
            </div>
            <Link to="/kits" className={styles.viewAllLink}>
              All kits <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.kitGrid}>
            {kits.items.map((kit) => (
              <KitCard key={kit.id} kit={kit} />
            ))}
          </div>
        </section>
      )}

      {facets.subcategories.length > 0 && (
        <section className={styles.types} aria-labelledby="types-heading">
          <div className={`container ${styles.typesInner}`}>
            <h2 id="types-heading" className={styles.typesTitle}>
              Browse by type
            </h2>
            <div className={styles.typesColumns}>
              {DEPARTMENTS.map((d) => (
                <div key={d.value}>
                  <h3 className={styles.typesDept} data-dept={d.value}>
                    {departmentLabel(d.value)}
                  </h3>
                  <ul className={styles.typesList}>
                    {facets.subcategories
                      .filter((s) => s.category === d.value)
                      .map((s) => (
                        <li key={s.name}>
                          <Link
                            to={`/products?category=${d.value}&subcategory=${encodeURIComponent(s.name)}`}
                            className={styles.typeLink}
                          >
                            <span>{s.name}</span>
                            <span className={styles.typeCount}>{s.count}</span>
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section
        className={`container ${styles.benefits}`}
        aria-labelledby="benefits-heading"
      >
        <h2 id="benefits-heading" className={styles.benefitsTitle}>
          Why MoveWell
        </h2>
        <p className={styles.benefitsLead}>Straight answers before you pay, not after.</p>
        <div className={styles.benefitsGrid}>
          {BENEFITS.map((benefit) => (
            <div className={styles.benefit} key={benefit.title}>
              <benefit.icon
                className={styles.benefitIcon}
                size={40}
                weight="light"
                aria-hidden="true"
              />
              <h3>{benefit.title}</h3>
              <p>{benefit.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
